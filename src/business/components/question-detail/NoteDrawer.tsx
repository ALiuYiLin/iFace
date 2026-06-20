import { useEffect, useRef } from 'react'
import { Kbd } from '@/components/ui'
import { useNameSpace } from '@/utils'
import type { Question } from '@/types'
import { QuestionNotes } from './QuestionNotes'
import styles from './NoteDrawer.module.css'

const ns = useNameSpace(styles)

export interface NoteDrawerProps {
  open: boolean
  onClose: () => void
  question: Question
  refreshKey: number
  onContentStateChange: (hasContent: boolean) => void
}

export function NoteDrawer({
  open,
  onClose,
  question,
  refreshKey,
  onContentStateChange,
}: NoteDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => panelRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="关闭题目笔记"
        onClick={onClose}
        className={ns('backdrop')}
      />
      <aside
        ref={panelRef}
        className={ns('panel')}
        role="dialog"
        aria-modal="true"
        aria-label="题目笔记"
        tabIndex={-1}
      >
        <div className={ns('header')}>
          <div className={ns('headerLeft')}>
            <div className={ns('headerTitleRow')}>
              <p className={ns('headerTitle')}>题目笔记</p>
              <span className={ns('kbdGroup')}>
                <Kbd>N</Kbd>
                <Kbd>Esc</Kbd>
              </span>
            </div>
            <p className={ns('questionPreview')}>{question.question}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭题目笔记"
            className={ns('closeBtn')}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={ns('content')}>
          <QuestionNotes
            questionId={question.id}
            refreshKey={refreshKey}
            embedded
            autoFocus
            onContentStateChange={onContentStateChange}
          />
        </div>
      </aside>
    </>
  )
}
