import { useEffect } from 'react'
import { useNameSpace } from '@/utils'
import styles from './StreakCelebration.module.css'

const ns = useNameSpace(styles)

export interface StreakCelebrationProps {
  streak: number
  onDone: () => void
}

const MILESTONES: Record<number, { emoji: string; message: string; color: string }> = {
  3: { emoji: '\u{1F525}', message: '连续 3 题！保持住！', color: '#f59e0b' },
  5: { emoji: '⚡', message: '5 连击！状态很好！', color: '#6366f1' },
  10: { emoji: '\u{1F680}', message: '10 连击！你太厉害了！', color: '#10b981' },
  20: { emoji: '\u{1F451}', message: '20 连击！无人能挡！', color: '#f59e0b' },
  50: { emoji: '\u{1F3C6}', message: '50 连击！传说级别！', color: '#ef4444' },
}

export function StreakCelebration({ streak, onDone }: StreakCelebrationProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  const levels = [50, 20, 10, 5, 3]
  const hit = levels.find((l) => streak === l)
  if (!hit) return null

  const { emoji, message, color } = MILESTONES[hit]

  return (
    <div className={ns('overlay')}>
      <span className={ns('emoji')}>{emoji}</span>
      <div
        className={ns('badge')}
        style={{
          background: color,
          boxShadow: `0 4px 20px ${color}55`,
        }}
      >
        {message}
      </div>
    </div>
  )
}
