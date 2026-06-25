import { useEffect } from 'react'
import { AIPanelWithStyles } from '@/components/ui/AIPanel'
import { useNameSpace } from '@/utils'
import { useAIStore } from '@/store/useAIStore'
import type { Question } from '@/types'
import styles from './AIDrawer.module.css'

const ns = useNameSpace(styles)

export interface AIDrawerProps {
  open: boolean
  onClose: () => void
  question: Question
  onOpenSettings: () => void
  initialPrompt?: { id: string; questionId: string; text: string } | null
  onInitialPromptConsumed?: (id: string) => void
}

export function AIDrawer({
  open,
  onClose,
  question,
  onOpenSettings,
  initialPrompt = null,
  onInitialPromptConsumed,
}: AIDrawerProps) {
  const { config } = useAIStore()

  useEffect(() => {
    if (open && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="关闭 AI 助手"
          onClick={onClose}
          className={ns('backdrop')}
        />
      )}

      <div
        aria-hidden={!open}
        className={ns('panel', open ? 'panelOpen' : 'panelClosed')}
      >
        <div className={ns('header')}>
          <div className={ns('headerLeft')}>
            <div className={ns('iconBox')}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                <circle cx="7.5" cy="14.5" r="1.5" />
                <circle cx="16.5" cy="14.5" r="1.5" />
              </svg>
            </div>
            <span className={ns('titleLabel')}>AI 助手</span>
            {config.model && (
              <span className={ns('modelBadge')}>{config.model}</span>
            )}
          </div>

          <div className={ns('headerRight')}>
            <span className={`${ns('escHint')} hidden-mobile`}>Esc</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭 AI 助手"
              className={ns('closeBtn')}
            >
              <svg
                width="14"
                height="14"
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
        </div>

        <div className={ns('content')}>
          <AIPanelWithStyles {...({ question, onOpenSettings, initialPrompt, onInitialPromptConsumed } as any)} />
        </div>
      </div>
    </>
  )
}
