import { Link } from 'react-router-dom'
import { getInlinePracticeSearch } from '@/lib/practiceSession'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, type Difficulty, type Module } from '@/types'
import { useNameSpace } from '@/utils'
import styles from './WeakQuestionRow.module.css'

const ns = useNameSpace(styles)

export function WeakQuestionRow({
  question,
  lastUpdated,
  reviewCount,
  index,
  sessionIds,
}: {
  question: { id: string; module: Module; difficulty: Difficulty; question: string; tags: string[]; source?: string }
  lastUpdated: number
  reviewCount: number
  index: number
  sessionIds: string[]
}) {
  const idsParam = getInlinePracticeSearch(sessionIds)
  const rankBg = index < 3 ? 'rgba(239,68,68,0.1)' : index < 10 ? 'rgba(245,158,11,0.1)' : 'var(--surface-3)'
  const rankColor = index < 3 ? 'var(--danger)' : index < 10 ? 'var(--warning)' : 'var(--text-3)'
  const timeAgo = formatTimeAgo(lastUpdated)

  return (
    <Link
      to={`/questions/${question.id}${idsParam}`}
      className={ns('row', 'animate-fade-in', 'card', 'card-interactive')}
      style={{ animationDelay: `${Math.min(index * 0.03, 0.4)}s` }}
    >
      <div className={ns('rank')} style={{ background: rankBg, color: rankColor }}>
        {index + 1}
      </div>

      <div className={ns('strip')} />

      <div className={ns('content')}>
        <p className={ns('question')}>{question.question}</p>

        <div className={ns('meta')}>
          <span className={ns('module')}>{question.module}</span>
          <span className={ns('dot')}>·</span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {DIFFICULTY_LABELS[question.difficulty]}
          </span>
          {question.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={ns('tag')}>{tag}</span>
          ))}
        </div>
      </div>

      <div className={ns('right')}>
        <span className={ns('reviewBadge')}>待复习</span>
        <span className={ns('time')}>{timeAgo}</span>
        {reviewCount > 0 && <span className={ns('time')}>已复习 {reviewCount} 次</span>}
      </div>

      <svg
        width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={ns('arrow')}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 个月前`
}
