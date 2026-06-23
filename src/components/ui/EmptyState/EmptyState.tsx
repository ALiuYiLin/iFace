import type { ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import styles from './EmptyState.module.css'

const ns = useNameSpace(styles)

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function DefaultEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)' }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`${ns('wrapper')} ${className}`}>
      <div className={ns('iconBox')}>{icon ?? <DefaultEmptyIcon />}</div>
      <p className={ns('title')}>{title}</p>
      {description && <p className={ns('desc')}>{description}</p>}
      {action && <div className={ns('action')}>{action}</div>}
    </div>
  )
}
