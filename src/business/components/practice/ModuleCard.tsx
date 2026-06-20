import type { Module } from '@/types'
import { useNameSpace } from '@/utils'
import styles from './ModuleCard.module.css'

const ns = useNameSpace(styles)

export function ModuleCard({
  module,
  selected,
  questionCount,
  masteredCount,
  onClick,
}: {
  module: Module
  selected: boolean
  questionCount: number
  masteredCount: number
  onClick: () => void
}) {
  const percent = questionCount > 0 ? Math.round((masteredCount / questionCount) * 100) : 0

  return (
    <button type="button" onClick={onClick} className={ns('card')} data-selected={selected}>
      {selected && (
        <div className={ns('check')}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <p className={ns('name')} data-selected={selected}>{module}</p>
      <p className={ns('count')}>{questionCount} 道题</p>

      <div className={ns('bar')}>
        <div className={ns('barFill')} style={{ width: `${percent}%` }} />
      </div>
      <p className={ns('stat')}>{masteredCount}/{questionCount} 已掌握</p>
    </button>
  )
}
