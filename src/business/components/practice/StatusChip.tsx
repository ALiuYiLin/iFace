import { STATUS_LABELS, type StudyStatus } from '@/types'
import { useNameSpace } from '@/utils'
import styles from './Chip.module.css'

const ns = useNameSpace(styles)

const STATUS_BG: Record<string, string> = {
  all: 'var(--primary)',
  unlearned: '#71717a',
  mastered: '#10b981',
  review: '#f59e0b',
}

export function StatusChip({
  status,
  selected,
  count,
  onClick,
}: {
  status: StudyStatus | 'all'
  selected: boolean
  count: number
  onClick: () => void
}) {
  const label = status === 'all' ? '全部状态' : STATUS_LABELS[status as StudyStatus]

  return (
    <button
      type="button"
      onClick={onClick}
      className={ns('chip')}
      data-selected={selected}
      style={{
        borderColor: selected ? STATUS_BG[status] : undefined,
        background: selected ? STATUS_BG[status] : undefined,
        color: selected ? 'white' : undefined,
      }}
    >
      {label}
      <span className={ns('count')} data-selected={selected}>{count}</span>
    </button>
  )
}
