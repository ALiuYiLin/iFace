import { Link } from 'react-router-dom'
import type { Module, StudyStatus } from '@/types'
import { DIFFICULTY_LABELS } from '@/types'

export function DailyQuestionCard({
  questionId,
  index,
  questions,
  records,
}: {
  questionId: string
  index: number
  questions: {
    id: string
    question: string
    module: Module
    difficulty: number
    source?: string
  }[]
  records: Record<string, { status: StudyStatus }>
}) {
  const q = questions.find((q) => q.id === questionId)
  if (!q) return null

  const status: StudyStatus = records[questionId]?.status ?? 'unlearned'

  const diffStyle: Record<number, { color: string }> = {
    1: { color: 'var(--success)' },
    2: { color: 'var(--warning)' },
    3: { color: 'var(--danger)' },
  }

  const statusLabel: Record<StudyStatus, string | null> = {
    unlearned: null,
    mastered: '已掌握',
    review: '待复习',
  }

  const statusColor: Record<StudyStatus, string> = {
    unlearned: 'transparent',
    mastered: 'var(--success)',
    review: 'var(--warning)',
  }

  return (
    <Link
      to={`/questions/${q.id}`}
      className="animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        textDecoration: 'none',
        transition: 'border-color 0.15s, background 0.15s',
        animationDelay: `${index * 0.04}s`,
        background: 'var(--surface)',
        minWidth: 0,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--primary-rgb), 0.3)'
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
      }}
    >
      {/* Index */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: 'var(--surface-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-3)',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {index + 1}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom: 6,
            wordBreak: 'break-word',
          }}
        >
          {q.question}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{q.module}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: diffStyle[q.difficulty]?.color ?? 'var(--text-3)',
            }}
          >
            {DIFFICULTY_LABELS[q.difficulty as 1 | 2 | 3]}
          </span>
          {statusLabel[status] && (
            <span style={{ fontSize: 11, fontWeight: 500, color: statusColor[status] }}>
              {statusLabel[status]}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 4, color: 'var(--text-3)' }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
}
