import type { ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import styles from './ProgressRing.module.css'

const ns = useNameSpace(styles)

interface ProgressRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: ReactNode
  className?: string
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 7,
  color = 'var(--primary)',
  trackColor = 'var(--border)',
  label,
  className = '',
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ

  return (
    <div className={`${ns('wrapper')} ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle className={ns('track')} cx={size / 2} cy={size / 2} r={r}
          stroke={trackColor} strokeWidth={strokeWidth} />
        <circle className={ns('progress')} cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      {label && <div className={ns('label')}>{label}</div>}
    </div>
  )
}
