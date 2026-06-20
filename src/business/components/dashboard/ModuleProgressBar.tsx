import { Link } from 'react-router-dom'
import type { Module, StudyStatus } from '@/types'

export function ModuleProgressBar({
  module,
  questions,
  records,
}: {
  module: Module
  questions: { id: string }[]
  records: Record<string, { status: StudyStatus }>
}) {
  const total = questions.length
  const mastered = questions.filter((q) => records[q.id]?.status === 'mastered').length
  const review = questions.filter((q) => records[q.id]?.status === 'review').length
  const percent = total > 0 ? Math.round((mastered / total) * 100) : 0

  return (
    <Link
      to={`/questions?module=${encodeURIComponent(module)}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 10px',
        borderRadius: 10,
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {module}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {mastered}/{total}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: 'var(--surface-3)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            {mastered > 0 && (
              <div
                style={{
                  height: '100%',
                  background: 'var(--success)',
                  width: `${(mastered / total) * 100}%`,
                  transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            )}
            {review > 0 && (
              <div
                style={{
                  height: '100%',
                  background: 'var(--warning)',
                  width: `${(review / total) * 100}%`,
                  transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            )}
          </div>
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
          minWidth: 30,
          textAlign: 'right',
          color:
            percent === 100
              ? 'var(--success)'
              : percent > 0
                ? 'var(--primary)'
                : 'var(--text-3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {percent}%
      </span>
    </Link>
  )
}
