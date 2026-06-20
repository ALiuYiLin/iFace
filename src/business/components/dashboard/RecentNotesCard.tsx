import type { QuestionNote } from '@/types'
import type { Module } from '@/types'
import { DIFFICULTY_LABELS } from '@/types'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export type RecentNoteItem = {
  note: QuestionNote
  question: {
    id: string
    question: string
    module: Module
    difficulty: number
  }
}

function formatRecentNoteTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function getNotePreview(content: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_[\]`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return '暂无笔记内容'
  return text.length > 110 ? `${text.slice(0, 110)}...` : text
}

export function RecentNotesCard({
  notes,
  total,
}: {
  notes: RecentNoteItem[]
  total: number
}) {
  return (
    <div className="card animate-fade-in stagger-2" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 3,
            }}
          >
            最近笔记
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {total > 0 ? `${total} 道题已有笔记` : '记录后的题目会在这里出现'}
          </p>
        </div>
        <Link
          to="/questions?notes=1&sort=note-updated"
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          <Button variant="secondary" size="sm">
            查看全部
          </Button>
        </Link>
      </div>

      {notes.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: '14px 16px',
            borderRadius: 10,
            border: '1px dashed var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
              暂无笔记
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              在题目页按 N 打开笔记，复盘内容会自动汇总到这里。
            </p>
          </div>
          <Link to="/questions" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Button variant="primary" size="sm">
              去题库
            </Button>
          </Link>
        </div>
      ) : (
        <div
          className="recent-notes-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {notes.map(({ note, question }) => (
            <Link
              key={note.questionId}
              to={`/questions/${question.id}?note=1`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                minWidth: 0,
                minHeight: 116,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface)',
                textDecoration: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor =
                  'rgba(var(--primary-rgb), 0.28)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--primary)',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {question.module}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                  {DIFFICULTY_LABELS[question.difficulty as 1 | 2 | 3]}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: 'var(--text-3)',
                    flexShrink: 0,
                  }}
                >
                  {formatRecentNoteTime(note.updatedAt)}
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {question.question}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  lineHeight: 1.55,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {getNotePreview(note.content)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
