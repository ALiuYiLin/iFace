import { useCallback, useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { useNameSpace } from '@/utils'
import styles from './StreakBanner.module.css'

const ns = useNameSpace(styles)
const STREAK_DISMISS_KEY = 'iface_streak_banner_dismissed_date'

const milestones: {
  min: number
  emoji: string
  msg: string
  color: string
  bg: string
  border: string
}[] = [
  {
    min: 50,
    emoji: '🏆',
    msg: '史诗级连击！你已经达到传说级别！',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)',
  },
  {
    min: 20,
    emoji: '👑',
    msg: '王者连击！专注力惊人！',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.18)',
  },
  {
    min: 10,
    emoji: '🚀',
    msg: '10 连击！你已进入深度专注状态！',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)',
  },
  {
    min: 5,
    emoji: '⚡',
    msg: '5 连击！手感火热，继续冲！',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.18)',
  },
  {
    min: 3,
    emoji: '🔥',
    msg: '连击开启！越刷越顺！',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)',
  },
  {
    min: 1,
    emoji: '✅',
    msg: '今日已作答，坚持就是胜利！',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)',
  },
]

export function StreakBanner() {
  const { streak, dailyGoal } = useAppSelector((s) => ({
    streak: s.study.streak,
    dailyGoal: s.study.dailyGoal,
  }))
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(STREAK_DISMISS_KEY)
      if (!stored) return false
      const today = new Date().toISOString().slice(0, 10)
      return stored === today
    } catch {
      return false
    }
  })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = useCallback(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(STREAK_DISMISS_KEY, today)
    } catch { /* ignore */ }
    setDismissed(true)
  }, [])

  if (dismissed || streak.todayCount === 0) return null

  const hit = milestones.find((m) => streak.currentStreak >= m.min) ?? milestones[milestones.length - 1]

  return (
    <div
      className={ns('banner', visible && 'bannerVisible')}
      style={{ background: hit.bg, border: `1px solid ${hit.border}` }}
    >
      <span className={ns('emoji')}>{hit.emoji}</span>

      <div className={ns('textContainer')}>
        <p className={ns('message')} style={{ color: hit.color }}>{hit.msg}</p>
        <div className={ns('statsRow')}>
          <span className={ns('statText')}>
            今日作答{' '}
            <span className={ns('statValue')}>{streak.todayCount}</span>
            {' '}题
          </span>
          {streak.currentStreak >= 2 && (
            <span className={ns('statText')}>
              🔥 当前连击{' '}
              <span className={ns('statValueHighlight')} style={{ color: hit.color }}>
                {streak.currentStreak}
              </span>
            </span>
          )}
          {streak.bestStreak > 0 && (
            <span className={ns('statText')}>
              最高记录{' '}
              <span className={ns('statValue')}>{streak.bestStreak}</span>
            </span>
          )}
        </div>
      </div>

      {streak.todayCount > 0 && (
        <div className={ns('progressContainer')}>
          <span className={ns('progressLabel')}>目标 {dailyGoal} 题</span>
          <div className={ns('progressTrack')}>
            <div
              className={ns('progressBar')}
              style={{
                width: `${Math.min(100, (streak.todayCount / dailyGoal) * 100)}%`,
                background: hit.color,
              }}
            />
          </div>
          {streak.todayCount >= dailyGoal && (
            <span className={ns('goalReached')} style={{ color: hit.color }}>
              今日目标达成 🎉
            </span>
          )}
        </div>
      )}

      <button type="button" onClick={handleDismiss} className={ns('dismissBtn')} aria-label="关闭">
        ×
      </button>
    </div>
  )
}
