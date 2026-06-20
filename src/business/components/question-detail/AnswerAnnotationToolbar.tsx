import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNameSpace } from '@/utils'
import type { AnswerAnnotationColor, AnswerSelectionDraft } from './AnswerCommentMarkers'
import styles from './AnswerAnnotationToolbar.module.css'

const ns = useNameSpace(styles)

export const ANSWER_ANNOTATION_COLORS: AnswerAnnotationColor[] = ['yellow', 'green', 'blue', 'pink']

export function getAnswerAnnotationColor(color: AnswerAnnotationColor): {
  background: string
  dot: string
} {
  switch (color) {
    case 'green':
      return { background: 'rgba(16,185,129,0.14)', dot: '#10b981' }
    case 'blue':
      return { background: 'rgba(59,130,246,0.13)', dot: '#3b82f6' }
    case 'pink':
      return { background: 'rgba(236,72,153,0.13)', dot: '#ec4899' }
    default:
      return { background: 'rgba(245,158,11,0.16)', dot: '#f59e0b' }
  }
}

export interface AnswerAnnotationToolbarProps {
  toolbarRef: React.RefObject<HTMLDivElement | null>
  selection: AnswerSelectionDraft
  commentOpen: boolean
  commentDraft: string
  saving: boolean
  onHighlight: (color: AnswerAnnotationColor) => void
  onClearHighlight: () => void
  onOpenComment: () => void
  onCommentDraftChange: (value: string) => void
  onSaveComment: () => void
  onCancel: () => void
}

export function AnswerAnnotationToolbar({
  toolbarRef,
  selection,
  commentOpen,
  commentDraft,
  saving,
  onHighlight,
  onClearHighlight,
  onOpenComment,
  onCommentDraftChange,
  onSaveComment,
  onCancel,
}: AnswerAnnotationToolbarProps) {
  const commentInputRef = useRef<HTMLInputElement>(null)
  const isBottomToolbar = selection.toolbar === 'bottom'

  useEffect(() => {
    if (!commentOpen) return
    const frame = window.requestAnimationFrame(() => commentInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [commentOpen])

  if (typeof document === 'undefined') return null

  const toolbarStyle: React.CSSProperties = {
    top: isBottomToolbar ? 'auto' : selection.top,
    right: isBottomToolbar ? 12 : 'auto',
    bottom: isBottomToolbar ? 'max(12px, env(safe-area-inset-bottom))' : 'auto',
    left: isBottomToolbar ? 12 : selection.left,
    transform: isBottomToolbar
      ? 'none'
      : selection.placement === 'top'
        ? 'translate(-50%, calc(-100% - 8px))'
        : 'translate(-50%, 8px)',
    padding: isBottomToolbar ? 6 : 4,
    maxWidth: isBottomToolbar ? 'none' : 'min(360px, calc(100vw - 24px))',
  }

  return createPortal(
    <div
      ref={toolbarRef}
      className={ns('toolbar', isBottomToolbar ? 'toolbarBottom' : 'toolbarFloating')}
      style={toolbarStyle}
    >
      <div className={ns('colorsRow', isBottomToolbar && 'colorsRowCenter')}>
        {ANSWER_ANNOTATION_COLORS.map((color) => {
          const colorStyle = getAnswerAnnotationColor(color)
          return (
            <button
              type="button"
              key={color}
              title="高亮"
              aria-label="高亮"
              disabled={saving}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onHighlight(color)}
              className={ns('colorBtn', isBottomToolbar && 'colorBtnBottom')}
            >
              <span
                className={ns('colorDot')}
                style={{
                  background: colorStyle.dot,
                  boxShadow: `0 0 0 3px ${colorStyle.background}`,
                }}
              />
            </button>
          )
        })}
        <button
          type="button"
          title="取消高亮"
          aria-label="取消高亮"
          disabled={saving}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClearHighlight}
          className={ns('actionBtn', isBottomToolbar && 'actionBtnBottom')}
        >
          <svg
            width={isBottomToolbar ? 16 : 14}
            height={isBottomToolbar ? 16 : 14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="7" />
            <path d="M5 19 19 5" />
          </svg>
        </button>
        <span className={ns('separator')} />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOpenComment}
          disabled={saving}
          className={ns(
            'commentBtn',
            isBottomToolbar && 'commentBtnBottom',
            commentOpen ? 'commentBtnActive' : 'commentBtnIdle',
          )}
        >
          批注
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
          title="关闭"
          aria-label="关闭"
          className={ns('actionBtn', isBottomToolbar && 'actionBtnBottom')}
          style={{ fontSize: isBottomToolbar ? 18 : 16 }}
        >
          ×
        </button>
      </div>

      {commentOpen && (
        <div className={ns('commentInputRow', isBottomToolbar && 'commentInputRowBottom')}>
          <input
            ref={commentInputRef}
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSaveComment()
              if (event.key === 'Escape') onCancel()
            }}
            placeholder="写批注…"
            className={ns('commentInput', isBottomToolbar && 'commentInputBottom')}
          />
          <button
            type="button"
            onClick={onSaveComment}
            disabled={saving || !commentDraft.trim()}
            className={ns(
              'saveCommentBtn',
              commentDraft.trim() && !saving ? 'saveCommentBtnEnabled' : 'saveCommentBtnDisabled',
            )}
          >
            保存
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
