import { Button } from '@/components/ui'
import { useNameSpace } from '@/utils'
import styles from './SessionCompletionCard.module.css'

const ns = useNameSpace(styles)

export interface SessionCompletionCardProps {
  mastered: number
  review: number
  unlearned: number
  total: number
  retryCount: number
  onRetry: () => void
  onBackToPractice: () => void
  onDashboard: () => void
}

export function SessionCompletionCard({
  mastered,
  review,
  unlearned,
  total,
  retryCount,
  onRetry,
  onBackToPractice,
  onDashboard,
}: SessionCompletionCardProps) {
  const masteredPercent = total > 0 ? Math.round((mastered / total) * 100) : 0
  const hasRetry = retryCount > 0

  return (
    <div
      className={`card animate-scale-in ${ns('card')}`}
      style={{
        borderColor: mastered === total ? 'rgba(16,185,129,0.22)' : 'var(--border-subtle)',
      }}
    >
      <div className={ns('header')}>
        <div className={ns('headerLeft')}>
          <p className={ns('suptitle')}>本轮完成</p>
          <h2 className={ns('title')}>
            {hasRetry ? '还有可巩固的题目' : '这一轮全部掌握'}
          </h2>
          <p className={ns('desc')}>
            {hasRetry
              ? `建议立即重练 ${retryCount} 道未完全掌握的题，趁记忆还热。`
              : '可以结束本轮，或者回到练习配置继续挑战新的题目。'}
          </p>
        </div>
        <div
          className={ns('scoreCircle')}
          style={{
            background: mastered === total ? 'var(--success-light)' : 'var(--primary-light)',
            color: mastered === total ? 'var(--success)' : 'var(--primary)',
          }}
        >
          <span className={ns('scoreValue')}>{masteredPercent}%</span>
          <span className={ns('scoreLabel')}>掌握</span>
        </div>
      </div>

      <div className={ns('stats')}>
        {[
          { label: '已掌握', value: mastered, color: 'var(--success)', bg: 'var(--success-light)' },
          { label: '待复习', value: review, color: 'var(--warning)', bg: 'var(--warning-light)' },
          { label: '未学习', value: unlearned, color: 'var(--text-3)', bg: 'var(--surface-3)' },
        ].map((item) => (
          <div key={item.label} className={ns('statItem')}>
            <p className={ns('statLabel')}>{item.label}</p>
            <p className={ns('statValue')} style={{ color: item.color }}>
              {item.value}
            </p>
            <div className={ns('statBar')} style={{ background: item.bg }} />
          </div>
        ))}
      </div>

      <div className={ns('actions')}>
        <Button
          variant="primary"
          size="sm"
          onClick={hasRetry ? onRetry : onBackToPractice}
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
        >
          {hasRetry ? `重练 ${retryCount} 题` : '继续练习'}
        </Button>
        {hasRetry && (
          <Button variant="secondary" size="sm" onClick={onBackToPractice}>
            调整练习
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDashboard}>
          回概览
        </Button>
      </div>
    </div>
  )
}
