import { useNameSpace } from '@/utils'
import styles from './SessionProgress.module.css'

const ns = useNameSpace(styles)

export interface SessionProgressProps {
  current: number
  total: number
  onExit: () => void
}

export function SessionProgress({ current, total, onExit }: SessionProgressProps) {
  const percent = total > 0 ? (current / total) * 100 : 0
  return (
    <div className={ns('container')}>
      <button type="button" onClick={onExit} className={ns('exitBtn')}>
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
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        退出练习
      </button>
      <div className={ns('barWrapper')}>
        <div className={ns('track')}>
          <div className={ns('fill')} style={{ width: `${percent}%` }} />
        </div>
        <span className={ns('counter')}>
          {current} / {total}
        </span>
      </div>
    </div>
  )
}
