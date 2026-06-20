import { useCallback, useEffect, useState } from 'react'
import type { StreakData } from '@/store/useStudyStore'

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

export function StreakBanner({
  streak,
  dailyGoal,
}: {
  streak: StreakData
  dailyGoal: number
}) {
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

  // Animate in after mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleDismiss = useCallback(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(STREAK_DISMISS_KEY, today)
    } catch {
      // ignore
    }
    setDismissed(true)
  }, [])

  if (dismissed || streak.todayCount === 0) return null

  const hit =
    milestones.find((m) => streak.currentStreak >= m.min) ??
    milestones[milestones.length - 1]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 12,
        background: hit.bg,
        border: `1px solid ${hit.border}`,
        marginBottom: 20,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 0.3s var(--ease-out), transform 0.3s var(--ease-out)',
      }}
    >
      {/* Emoji */}
      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{hit.emoji}</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: hit.color, marginBottom: 1 }}>
          {hit.msg}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            今日作答{' '}
            <span
              style={{
                fontWeight: 600,
                color: 'var(--text-2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {streak.todayCount}
            </span>{' '}
            题
          </span>
          {streak.currentStreak >= 2 && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              🔥 当前连击{' '}
              <span
                style={{ fontWeight: 600, color: hit.color, fontVariantNumeric: 'tabular-nums' }}
              >
                {streak.currentStreak}
              </span>
            </span>
          )}
          {streak.bestStreak > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              最高记录{' '}
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {streak.bestStreak}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Progress mini bar */}
      {streak.todayCount > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{ fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}
          >
            目标 {dailyGoal} 题
          </span>
          <div
            style={{
              width: 80,
              height: 4,
              background: 'var(--border)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: hit.color,
                borderRadius: 99,
                width: `${Math.min(100, (streak.todayCount / dailyGoal) * 100)}%`,
                transition: 'width 0.6s var(--ease-out)',
              }}
            />
          </div>
          {streak.todayCount >= dailyGoal && (
            <span style={{ fontSize: 10, color: hit.color, fontWeight: 600 }}>
              今日目标达成 🎉
            </span>
          )}
        </div>
      )}

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-3)',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 4,
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-3)'
        }}
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  )
}
