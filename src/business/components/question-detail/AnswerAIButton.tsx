import type { ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import styles from './AnswerAIButton.module.css'

const ns = useNameSpace(styles)

export interface AnswerAIButtonProps {
  title: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}

export function AnswerAIButton({ title, active = false, onClick, children }: AnswerAIButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      className={ns('btn', active && 'btnActive')}
    >
      {children}
    </button>
  )
}
