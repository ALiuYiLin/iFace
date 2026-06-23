import type { ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import styles from './SegmentedRing.module.css'

const ns = useNameSpace(styles)

interface SegmentedRingProps {
  mastered: number
  review: number
  total: number
  size?: number
  strokeWidth?: number
  label?: ReactNode
  className?: string
}

export function SegmentedRing({
  mastered,
  review,
  total,
  size = 140,
  strokeWidth = 10,
  label,
  className = '',
}: SegmentedRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const gap = total > 0 ? Math.min(2, circ * 0.01) : 0
  const masteredPct = total > 0 ? mastered / total : 0
  const reviewPct = total > 0 ? review / total : 0
  const masteredLen = masteredPct * circ - gap
  const reviewLen = reviewPct * circ - gap
  const reviewOffset = -(masteredPct * circ)

  return (
    <div className={`${ns('wrapper')} ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle className={ns('track')} cx={size / 2} cy={size / 2} r={r}
          strokeWidth={strokeWidth} />
        {mastered > 0 && (
          <circle className={ns('mastered')} cx={size / 2} cy={size / 2} r={r}
            strokeWidth={strokeWidth}
            strokeDasharray={`${Math.max(0, masteredLen)} ${circ}`}
            strokeDashoffset={0} />
        )}
        {review > 0 && (
          <circle className={ns('review')} cx={size / 2} cy={size / 2} r={r}
            strokeWidth={strokeWidth}
            strokeDasharray={`${Math.max(0, reviewLen)} ${circ}`}
            strokeDashoffset={reviewOffset} />
        )}
      </svg>
      {label && <div className={ns('label')}>{label}</div>}
    </div>
  )
}
