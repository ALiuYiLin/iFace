import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import {
  deleteUnusedQuestionNoteImages,
  getQuestionNote,
  getQuestionNoteImages,
  putQuestionNote,
  putQuestionNoteImage,
} from '@/api/compat'
import { formatReviewNoteTime } from '@/lib/feedbackNote'
import { useNameSpace } from '@/utils'
import type { QuestionNoteImage } from '@/types'
import styles from './QuestionNotes.module.css'

const ns = useNameSpace(styles)

export interface QuestionNotesProps {
  questionId: string
  refreshKey: number
  embedded?: boolean
  autoFocus?: boolean
  onContentStateChange?: (hasContent: boolean) => void
}

type NoteSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const NOTE_IMAGE_SRC_PREFIX = 'iface-note-image:'
const MAX_NOTE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const NOTE_FORMAT_ACTIONS = [
  { id: 'bold', label: 'B', title: '加粗', font: 'sans' as const },
  { id: 'heading', label: 'H2', title: '二级标题', font: 'sans' as const },
  { id: 'bullet', label: '- ', title: '无序列表', font: 'mono' as const },
  { id: 'todo', label: '[ ]', title: '待办项', font: 'mono' as const },
  { id: 'quote', label: '>', title: '引用', font: 'mono' as const },
  { id: 'code', label: '</>', title: '代码块', font: 'mono' as const },
  { id: 'link', label: 'link', title: '链接', font: 'mono' as const },
  { id: 'table', label: 'table', title: '表格', font: 'mono' as const },
] as const

type NoteFormatActionId = (typeof NOTE_FORMAT_ACTIONS)[number]['id']

function createLocalNoteImageId() {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `note-image-${Date.now()}-${cryptoId}`
}

function sanitizeImageAlt(name: string) {
  const baseName = name.replace(/\.[^.]+$/, '').trim()
  return (baseName || '本地图片').replace(/[[\]\n\r]/g, ' ')
}

function extractNoteImageIds(content: string): string[] {
  const ids = new Set<string>()
  const regex = /!\[[^\]]*]\(iface-note-image:([^)]+)\)/g
  let match = regex.exec(content)
  while (match) {
    if (match[1]) ids.add(match[1])
    match = regex.exec(content)
  }
  return Array.from(ids)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('invalid image data'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('failed to read image'))
    reader.readAsDataURL(file)
  })
}

function buildNoteInsertion(
  content: string,
  insertText: string,
  start: number,
  end: number,
): { nextContent: string; nextCursor: number } {
  const before = content.slice(0, start)
  const after = content.slice(end)
  const prefix = before.trim().length > 0 && !before.endsWith('\n\n') ? '\n\n' : ''
  const suffix = after.trim().length > 0 && !after.startsWith('\n\n') ? '\n\n' : ''
  const insertion = `${prefix}${insertText}${suffix}`

  return {
    nextContent: `${before}${insertion}${after}`,
    nextCursor: before.length + insertion.length,
  }
}

function getSelectedLineRange(content: string, start: number, end: number) {
  const lineStart = content.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextNewline = content.indexOf('\n', end)
  const lineEnd = nextNewline === -1 ? content.length : nextNewline
  return { lineStart, lineEnd }
}

function prefixSelectedLines(
  content: string,
  start: number,
  end: number,
  prefix: string,
): { nextContent: string; nextCursor: number } {
  const { lineStart, lineEnd } = getSelectedLineRange(content, start, end)
  const block = content.slice(lineStart, lineEnd)
  const nextBlock = block
    .split('\n')
    .map((line) =>
      line.trim()
        ? `${prefix}${line.replace(/^(- \[ \] |- |\* |\d+\. |> )/, '')}`
        : prefix.trimEnd(),
    )
    .join('\n')

  return {
    nextContent: `${content.slice(0, lineStart)}${nextBlock}${content.slice(lineEnd)}`,
    nextCursor: lineStart + nextBlock.length,
  }
}

function wrapSelection(
  content: string,
  start: number,
  end: number,
  before: string,
  after: string,
  fallback: string,
): { nextContent: string; nextCursor: number } {
  const selected = content.slice(start, end)
  const value = selected || fallback
  const insertion = `${before}${value}${after}`

  return {
    nextContent: `${content.slice(0, start)}${insertion}${content.slice(end)}`,
    nextCursor: selected ? start + insertion.length : start + before.length + value.length,
  }
}

function applyNoteFormat(
  content: string,
  actionId: NoteFormatActionId,
  start: number,
  end: number,
): { nextContent: string; nextCursor: number } {
  switch (actionId) {
    case 'bold':
      return wrapSelection(content, start, end, '**', '**', '重点')
    case 'heading':
      return prefixSelectedLines(content, start, end, '## ')
    case 'bullet':
      return prefixSelectedLines(content, start, end, '- ')
    case 'todo':
      return prefixSelectedLines(content, start, end, '- [ ] ')
    case 'quote':
      return prefixSelectedLines(content, start, end, '> ')
    case 'code': {
      const selected = content.slice(start, end).trim()
      return buildNoteInsertion(content, `\`\`\`ts\n${selected || '代码'}\n\`\`\``, start, end)
    }
    case 'link':
      return wrapSelection(content, start, end, '[', '](https://)', '链接文字')
    case 'table':
      return buildNoteInsertion(content, '| 项目 | 说明 |\n| --- | --- |\n|  |  |', start, end)
  }
}

function appendSpeechTranscript(current: string, transcript: string): string {
  const next = transcript.trim()
  if (!next) return current
  if (!current.trim()) return next
  return `${current.trimEnd()} ${next}`
}

function NoteToolbarButton({
  label,
  title,
  onClick,
  disabled,
  font,
}: {
  label: string
  title: string
  onClick: () => void
  disabled?: boolean
  font: 'sans' | 'mono'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={ns('toolbarBtn', font === 'sans' ? 'toolbarBtnBold' : 'toolbarBtnMono')}
    >
      {label}
    </button>
  )
}

// biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally reloads
export function QuestionNotes({
  questionId,
  refreshKey,
  embedded = false,
  autoFocus = false,
  onContentStateChange,
}: QuestionNotesProps) {
  const [content, setContent] = useState('')
  const [createdAt, setCreatedAt] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [noteImages, setNoteImages] = useState<Record<string, QuestionNoteImage>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>('idle')
  const [mode, setMode] = useState<'edit' | 'preview'>('preview')
  const [editorFocused, setEditorFocused] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [imageImportError, setImageImportError] = useState<string | null>(null)

  const loadedContentRef = useRef('')
  const saveTimerRef = useRef<number | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const focusEditor = useCallback(() => {
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const handleNoteSpeechTranscript = useCallback((transcript: string) => {
    setContent((prev) => appendSpeechTranscript(prev, transcript))
    setSpeechError(null)
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: handleNoteSpeechTranscript,
    onError: setSpeechError,
  })

  useEffect(() => {
    let cancelled = false

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    speech.stop()
    setLoading(true)
    setSaveStatus('idle')
    setSpeechError(null)
    setImageImportError(null)

    Promise.all([getQuestionNote(questionId), getQuestionNoteImages(questionId)] as const)
      .then(([note, images]) => {
        if (cancelled) return
        const nextContent = note?.content ?? ''
        loadedContentRef.current = nextContent
        setContent(nextContent)
        setCreatedAt(note?.createdAt ?? null)
        setUpdatedAt(note?.updatedAt ?? null)
        const imgMap: Record<string, any> = {}; for (const img of images) { imgMap[img.id] = img; }; setNoteImages(imgMap as any)
        onContentStateChange?.(nextContent.trim().length > 0)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        loadedContentRef.current = ''
        setContent('')
        setCreatedAt(null)
        setUpdatedAt(null)
        setNoteImages({})
        onContentStateChange?.(false)
        setSaveStatus('error')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [questionId, refreshKey, onContentStateChange, speech.stop])

  useEffect(() => {
    if (!autoFocus || loading || mode !== 'edit') return
    focusEditor()
  }, [autoFocus, focusEditor, loading, mode])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (content === loadedContentRef.current) return

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)

    setSaveStatus('saving')
    const nextContent = content

    saveTimerRef.current = window.setTimeout(async () => {
      const now = Date.now()
      try {
        await putQuestionNote(questionId, {
          content: nextContent,
          createdAt: createdAt ?? now,
        })
        const keepImageIds = extractNoteImageIds(nextContent)
        await deleteUnusedQuestionNoteImages(questionId, keepImageIds)

        loadedContentRef.current = nextContent
        if (nextContent.trim()) {
          setCreatedAt((prev) => prev ?? now)
          setUpdatedAt(now)
          setNoteImages((prev) =>
            Object.fromEntries(keepImageIds.flatMap((id) => (prev[id] ? [[id, prev[id]]] : []))),
          )
        } else {
          setCreatedAt(null)
          setUpdatedAt(null)
          setNoteImages({})
        }
        onContentStateChange?.(nextContent.trim().length > 0)
        setSaveStatus('saved')
        statusTimerRef.current = window.setTimeout(() => setSaveStatus('idle'), 1600)
      } catch {
        setSaveStatus('error')
      }
    }, 650)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [content, createdAt, loading, onContentStateChange, questionId])

  const handleModeChange = useCallback(
    (nextMode: 'edit' | 'preview') => {
      setMode(nextMode)
      if (nextMode === 'edit') focusEditor()
    },
    [focusEditor],
  )

  const handleApplyFormat = useCallback(
    (actionId: NoteFormatActionId) => {
      const editor = textareaRef.current
      const start = editor?.selectionStart ?? content.length
      const end = editor?.selectionEnd ?? content.length
      const { nextContent, nextCursor } = applyNoteFormat(content, actionId, start, end)

      setMode('edit')
      setContent(nextContent)
      window.setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
      }, 0)
    },
    [content],
  )

  const handlePickImage = useCallback(() => {
    setMode('edit')
    setImageImportError(null)
    imageInputRef.current?.click()
  }, [])

  const handleImageFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      if (!file.type.startsWith('image/')) {
        setImageImportError('请选择图片文件')
        return
      }
      if (file.size > MAX_NOTE_IMAGE_SIZE_BYTES) {
        setImageImportError('图片不能超过 5MB')
        return
      }

      try {
        setImageImportError(null)
        const dataUrl = await readFileAsDataUrl(file)
        const now = Date.now()
        const image: QuestionNoteImage = {
          id: createLocalNoteImageId(),
          questionId,
          name: file.name || 'local-image',
          mimeType: file.type || 'image/*',
          size: file.size,
          dataUrl,
          createdAt: now,
          updatedAt: now,
        }
        const saved = await putQuestionNoteImage(image)
        const editor = textareaRef.current
        const start = editor?.selectionStart ?? content.length
        const end = editor?.selectionEnd ?? content.length
        const markdown = `![${sanitizeImageAlt(file.name)}](${NOTE_IMAGE_SRC_PREFIX}${saved.id})`
        const { nextContent, nextCursor } = buildNoteInsertion(content, markdown, start, end)

        setNoteImages((prev) => ({ ...prev, [saved.id]: saved }))
        setMode('edit')
        setContent(nextContent)
        window.setTimeout(() => {
          textareaRef.current?.focus()
          textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
        }, 0)
      } catch {
        setImageImportError('图片导入失败')
      }
    },
    [content, questionId],
  )

  const handleNoteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        handleApplyFormat('bold')
      }
    },
    [handleApplyFormat],
  )

  const resolveNoteImageSrc = useCallback(
    (src: string) => {
      if (!src.startsWith(NOTE_IMAGE_SRC_PREFIX)) return undefined
      const id = src.slice(NOTE_IMAGE_SRC_PREFIX.length)
      return noteImages[id]?.dataUrl
    },
    [noteImages],
  )

  const noteLength = content.trim().length

  const statusText =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : updatedAt
            ? `最后编辑 ${formatReviewNoteTime(updatedAt)}`
            : '自动保存'

  return (
    <div
      className={ns(
        'container',
        embedded ? 'containerEmbedded' : 'containerCard',
        !embedded && 'animate-fade-in',
      )}
    >
      <div className={ns('header')}>
        <div className={ns('headerLeft')}>
          <span className={ns('icon')}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </svg>
          </span>
          <div className={ns('headerInfo')}>
            <h2 className={ns('headerTitle')}>题目笔记</h2>
            <p className={ns('statusText', saveStatus === 'error' ? 'statusTextDanger' : 'statusTextDefault')}>
              {loading ? '加载中…' : statusText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleModeChange(mode === 'edit' ? 'preview' : 'edit')}
          disabled={loading}
          className={ns('modeBtn', mode === 'edit' ? 'modeBtnEdit' : 'modeBtnView', loading && 'modeBtnDisabled')}
          title={mode === 'edit' ? '完成编辑' : '编辑题目笔记'}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {mode === 'edit' ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </>
            )}
          </svg>
          {mode === 'edit' ? '完成' : '编辑'}
        </button>
      </div>

      {mode === 'edit' ? (
        <>
          <div
            onFocusCapture={() => setEditorFocused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setEditorFocused(false)
              }
            }}
            className={ns('editor', editorFocused && 'editorFocused')}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />
            <div className={ns('toolbar')}>
              <div className={ns('toolbarActions')}>
                {NOTE_FORMAT_ACTIONS.map((action) => (
                  <NoteToolbarButton
                    key={action.id}
                    label={action.label}
                    title={action.title}
                    disabled={loading}
                    font={action.font}
                    onClick={() => handleApplyFormat(action.id)}
                  />
                ))}
                <NoteToolbarButton
                  label="img"
                  title="导入本地图片"
                  disabled={loading}
                  font="mono"
                  onClick={handlePickImage}
                />
              </div>
              <div className={ns('toolbarActionsRight')}>
                {(speech.interimTranscript || speechError || imageImportError) && (
                  <span
                    title={speech.interimTranscript || speechError || imageImportError || undefined}
                    className={ns(
                      'statusIndicator',
                      speechError || imageImportError ? 'statusIndicatorDanger' : 'statusIndicatorPrimary',
                    )}
                  >
                    {speech.interimTranscript
                      ? `正在识别：${speech.interimTranscript}`
                      : speechError || imageImportError}
                  </span>
                )}
                <SpeechInputButton
                  supported={speech.supported}
                  listening={speech.listening}
                  disabled={loading}
                  onToggle={speech.toggle}
                />
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              disabled={loading}
              placeholder="记录自己的理解、易错点、面试表达、下次要追问的问题…"
              rows={6}
              className={ns('textarea', embedded && 'textareaEmbedded')}
            />
          </div>
          {content.trim() && (
            <div className={ns('preview', embedded && 'previewEmbedded')}>
              <div className="prose" style={{ fontSize: 13, minWidth: 0 }}>
                <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
              </div>
            </div>
          )}
        </>
      ) : content.trim() ? (
        <div className={ns('viewContent', embedded && 'viewContentEmbedded')}>
          <div className="prose" style={{ fontSize: 13, minWidth: 0 }}>
            <MarkdownRenderer content={content} resolveImageSrc={resolveNoteImageSrc} />
          </div>
        </div>
      ) : (
        <div className={ns('emptyState')}>暂无笔记</div>
      )}

      {embedded && (
        <div className={ns('footer')}>
          <span>{saveStatus === 'saving' ? '正在自动保存' : 'Markdown'}</span>
          <span className={ns('wordCount')}>{noteLength.toLocaleString()} 字</span>
        </div>
      )}
    </div>
  )
}
