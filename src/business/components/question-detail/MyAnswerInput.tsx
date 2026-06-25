import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { requestChatCompletionStream } from '@/lib/aiClient'
import { appendQuestionNoteContent } from '@/api/compat'
import { buildReviewNoteMarkdown } from '@/lib/feedbackNote'
import { buildAnswerFeedbackSystemSuffix, useAIStore } from '@/store/useAIStore'
import { useNameSpace } from '@/utils'
import { FeedbackScorePanel, splitFeedbackScore } from './FeedbackScorePanel'
import styles from './MyAnswerInput.module.css'

const ns = useNameSpace(styles)

const MY_ANSWER_DRAFT_PREFIX = 'iface_my_answer_draft_'

function getMyAnswerDraftKey(questionId: string): string {
  return `${MY_ANSWER_DRAFT_PREFIX}${questionId}`
}

function loadMyAnswerDraft(questionId: string): string {
  if (!questionId) return ''
  try {
    return localStorage.getItem(getMyAnswerDraftKey(questionId)) ?? ''
  } catch {
    return ''
  }
}

function saveMyAnswerDraft(questionId: string, text: string): void {
  if (!questionId) return
  try {
    const key = getMyAnswerDraftKey(questionId)
    if (text.trim()) {
      localStorage.setItem(key, text)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore storage failures
  }
}

function appendSpeechTranscript(current: string, transcript: string): string {
  const next = transcript.trim()
  if (!next) return current
  if (!current.trim()) return next
  return `${current.trimEnd()} ${next}`
}

export interface MyAnswerInputProps {
  questionId: string
  questionText: string
  answerText: string
  onOpenAIPanel: () => void
  onOpenNote?: () => void
  isAiEnabled: boolean
  onNoteSaved?: () => void
  compact?: boolean
  autoFocus?: boolean
}

export function MyAnswerInput({
  questionId,
  questionText,
  answerText,
  onOpenAIPanel,
  onOpenNote,
  isAiEnabled,
  onNoteSaved,
  compact = false,
  autoFocus = true,
}: MyAnswerInputProps) {
  const { config, streaming, streamingQuestionId } = useAIStore()

  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState(() => loadMyAnswerDraft(questionId))
  const [feedback, setFeedback] = useState<string | null>(null)
  const [streamingFeedback, setStreamingFeedback] = useState('')
  const feedbackRef = useRef('')
  const [error, setError] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = streaming && streamingQuestionId === `${questionId}_selfcheck`

  const handleSpeechTranscript = useCallback((transcript: string) => {
    setText((prev) => appendSpeechTranscript(prev, transcript))
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: handleSpeechTranscript,
    onError: setError,
  })

  useEffect(() => {
    speech.stop()
    setCollapsed(false)
    setText(loadMyAnswerDraft(questionId))
    setFeedback(null)
    setStreamingFeedback('')
    setError(null)
    setSavingNote(false)
    setNoteSaved(false)
  }, [questionId, speech.stop])

  useEffect(() => {
    if (feedback || streamingFeedback) return
    saveMyAnswerDraft(questionId, text)
  }, [feedback, questionId, streamingFeedback, text])

  useEffect(() => {
    if (autoFocus && !compact && !collapsed && !feedback) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [autoFocus, collapsed, compact, feedback])

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isStreaming) return

    speech.stop()
    setError(null)
    setStreamingFeedback('')

    
    const systemSuffix = buildAnswerFeedbackSystemSuffix()
    const userInput: import("@/lib/aiClient").ChatCompletionMessage = {
      role: 'user' as const,
      content: `题目：${questionText}\n参考答案：${answerText}\n候选人的回答：${text.trim()}`,
    }
    const allMessages: import("@/lib/aiClient").ChatCompletionMessage[] = [
      { role: 'system' as const, content: `${config.systemPrompt}\n\n${systemSuffix}` },
      userInput,
      { role: 'user' as const, content: '请批改我的作答，并给出一版更适合面试口述的修正版。' },
    ]
    try {
      await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          provider: config.provider,
        },
        messages: allMessages,
        onDelta: (chunk: string) => { feedbackRef.current += chunk; setStreamingFeedback((prev) => prev + chunk) },
        signal: new AbortController().signal,
      })
      const fullText = feedbackRef.current
setFeedback(fullText)
setStreamingFeedback('')
saveMyAnswerDraft(questionId, '')
    } catch (err: any) {
      setError(err.message ?? '请求失败')
      setStreamingFeedback('')
    }
  }, [text, isStreaming, speech.stop, questionId, questionText, answerText, config])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleCollapse = useCallback(() => {
    speech.stop()
    setCollapsed(true)
  }, [speech.stop])

  const handleReset = useCallback(() => {
    speech.stop()
    setFeedback(null)
    setStreamingFeedback('')
    setText('')
    setError(null)
    setSavingNote(false)
    setNoteSaved(false)
    saveMyAnswerDraft(questionId, '')
    setTimeout(() => textareaRef.current?.focus(), 60)
  }, [questionId, speech.stop])

  const handleSaveFeedbackToNote = useCallback(async () => {
    if (!feedback || savingNote || noteSaved) return

    setSavingNote(true)
    setError(null)
    try {
      await appendQuestionNoteContent(
        questionId,
        buildReviewNoteMarkdown({
          questionText,
          userAnswer: text,
          feedback,
        }),
      )
      setNoteSaved(true)
      onNoteSaved?.()
    } catch (err) {
      setError(`保存笔记失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSavingNote(false)
    }
  }, [feedback, noteSaved, onNoteSaved, questionId, questionText, savingNote, text])

  const displayFeedback = feedback ?? (streamingFeedback || null)
  const parsedFeedback = feedback ? splitFeedbackScore(feedback) : null
  const feedbackContent = parsedFeedback?.content || displayFeedback
  const feedbackScore = parsedFeedback?.score ?? null

  if (collapsed) {
    return (
      <div className={ns('wrapper', compact ? 'wrapperCompact' : 'wrapperCard')}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={ns('collapsedBtn', compact ? 'collapsedBtnCompact' : 'collapsedBtnCard')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          我的作答已收起，点击展开…
        </button>
      </div>
    )
  }

  return (
    <div className={ns('wrapper', compact ? 'wrapperCompact' : 'wrapperCard')}>
      <div className={ns('header', compact ? 'headerCompact' : 'headerCard')}>
        <span className={ns('headerLeft')}>
          <span className={ns('headerIcon')}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </span>
          我的作答
        </span>
        <button
          type="button"
          onClick={handleCollapse}
          className={ns('headerCollapseBtn')}
          title="收起作答区"
        >
          收起
        </button>
      </div>

      <div className={ns('body', compact ? 'bodyCompact' : 'bodyCard')}>
        {!displayFeedback && (
          <div
            className={ns('inputArea', inputFocused && 'inputAreaFocused')}
            onFocusCapture={() => setInputFocused(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setInputFocused(false)
              }
            }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="用自己的话说说你对这道题的理解……不用完整，写核心思路就行"
              rows={3}
              className={ns('textarea')}
            />
            <div className={ns('inputFooter')}>
              <div className={ns('toolbarLeft')}>
                <SpeechInputButton
                  supported={speech.supported}
                  listening={speech.listening}
                  disabled={isStreaming}
                  onToggle={speech.toggle}
                />
                {speech.interimTranscript ? (
                  <span
                    title={speech.interimTranscript}
                    className={ns('interimText', compact && 'interimTextCompact')}
                  >
                    正在识别：{speech.interimTranscript}
                  </span>
                ) : (
                  <span className={ns('aiHint')}>
                    {isAiEnabled ? (
                      <>&#8984;+Enter 提交作答</>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenAIPanel}
                        className={ns('aiConfigBtn')}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        </svg>
                        配置 AI 才能获得反馈
                      </button>
                    )}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() || !isAiEnabled || isStreaming}
                className={ns('submitBtn', text.trim() && isAiEnabled ? 'submitBtnEnabled' : 'submitBtnDisabled')}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                提交作答
              </button>
            </div>
          </div>
        )}

        {(displayFeedback || isStreaming) && (
          <div className={ns('feedbackCard')}>
            <div className={ns('answerPreview')}>
              <p className={ns('answerPreviewLabel')}>我的作答</p>
              <p className={ns('answerPreviewText')}>{text}</p>
            </div>

            <div className={ns('feedbackContent')}>
              <div className={ns('feedbackHeader')}>
                <div className={ns('feedbackIcon')}>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                </div>
                <span className={ns('feedbackLabel')}>AI 点评</span>
                {isStreaming && (
                  <span className={ns('streamingDots')}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={ns('streamingDot')}
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>
              {feedbackContent && (
                <div className="prose" style={{ fontSize: 13 }}>
                  <MarkdownRenderer content={feedbackContent} />
                  {feedbackScore && <FeedbackScorePanel score={feedbackScore} />}
                </div>
              )}
            </div>

            {feedback && !isStreaming && (
              <div className={ns('feedbackActions')}>
                <button
                  type="button"
                  onClick={handleSaveFeedbackToNote}
                  disabled={savingNote || noteSaved}
                  className={ns(
                    'actionBtn',
                    'actionBtnSave',
                    savingNote
                      ? 'actionBtnSaving'
                      : noteSaved
                        ? 'actionBtnSaved'
                        : 'actionBtnSaveEnabled',
                  )}
                >
                  {savingNote ? (
                    <span style={{ display: 'inline-flex' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </span>
                  ) : (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  )}
                  {savingNote ? '保存中…' : noteSaved ? '已保存到笔记' : '保存为复盘笔记'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={ns('actionBtn', 'actionBtnGhost')}
                >
                  重新作答
                </button>
                {noteSaved && onOpenNote && (
                  <button
                    type="button"
                    onClick={onOpenNote}
                    className={ns('actionBtn', 'actionBtnSecondary')}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                      <path d="M8 7h6" />
                      <path d="M8 11h8" />
                    </svg>
                    打开笔记
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenAIPanel}
                  className={ns('actionBtn', 'actionBtnPrimary')}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                  深入讨论
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className={ns('errorBlock')}>
            {error}
            <button type="button" onClick={() => setError(null)} className={ns('errorDismissBtn')}>
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
