import type { StudyStatus } from '@/types'

const dotColors: Record<StudyStatus, string> = {
  unlearned: 'var(--border)',
  mastered: 'var(--success)',
  review: 'var(--warning)',
}

export function StatusDot({ status, className = '' }: { status: StudyStatus; className?: string }) {
  return <span className={`status-dot ${className}`} style={{ background: dotColors[status] }} />
}
