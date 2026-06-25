import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useNameSpace } from '@/utils'
import { useAppSelector } from '@/store/hooks'
import { preloadRoute } from '@/lib/routePreload'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  type Difficulty,
  type Module,
} from '@/types'
import styles from './QuestionCard.module.css'

const ns = useNameSpace(styles)

interface QuestionCardProps {
  question: {
    id: string
    module: Module
    difficulty: Difficulty
    question: string
    tags: string[]
    source?: string
  }
  index: number
  noteSearchMatched?: boolean
  noteSnippet?: string
}

export const QuestionCard = memo(function QuestionCard({
  question: q,
  index,
  noteSearchMatched,
  noteSnippet,
}: QuestionCardProps) {
  const status = useAppSelector((s) => s.study.records[q.id]?.status ?? 'unlearned')
  const starred = useAppSelector((s) => s.questionList.starredIds.includes(q.id))
  const hasNote = useAppSelector((s) =>
    s.questionList.questionNotes.some((n) => n.question_id === q.id && n.content.trim().length > 0),
  )

  const statusClass =
    status === 'mastered'
      ? 'statusStripMastered'
      : status === 'review'
        ? 'statusStripReview'
        : 'statusStripUnlearned'

  return (
    <Link
      to={`/questions/${q.id}${noteSearchMatched ? '?note=1' : ''}`}
      className="animate-fade-in card card-interactive"
      style={{ animationDelay: `${Math.min(index * 0.025, 0.3)}s` }}
      onPointerEnter={() => preloadRoute('questionDetail')}
      onFocus={() => preloadRoute('questionDetail')}
    >
      <div className={ns('statusStrip', statusClass)} />

      <div className={ns('body')}>
        <p className={ns('questionText')}>{q.question}</p>

        <div className={ns('metaRow')}>
          <span className={ns('metaModule')}>{q.module}</span>
          <span className={ns('metaDot')}>·</span>

          <span
            className={ns('badge')}
            style={{
              color: DIFFICULTY_STYLES[q.difficulty].color,
              background: DIFFICULTY_STYLES[q.difficulty].background,
              borderColor: DIFFICULTY_STYLES[q.difficulty].borderColor,
            }}
          >
            {DIFFICULTY_LABELS[q.difficulty]}
          </span>

          {status !== 'unlearned' && (
            <span
              className={ns('badge')}
              style={{
                color: STATUS_STYLES[status].color,
                background: STATUS_STYLES[status].background,
                borderColor: STATUS_STYLES[status].borderColor,
              }}
            >
              {STATUS_LABELS[status]}
            </span>
          )}

          {starred && (
            <span className={ns('starredBadge')} title="重点题">
              <svg className={ns('starredIcon')} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              重点
            </span>
          )}

          {hasNote && (
            <span className={ns('noteBadge')} title={noteSearchMatched ? '笔记内容匹配当前搜索' : '这道题有笔记'}>
              <svg className={ns('noteIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
              {noteSearchMatched ? '命中笔记' : '笔记'}
            </span>
          )}

          {q.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={ns('tag')}>{tag}</span>
          ))}
        </div>

        {noteSearchMatched && noteSnippet && (
          <div className={ns('noteSnippet')}>
            <div className={ns('noteSnippetHeader')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
              笔记摘录
            </div>
            <p className={ns('noteSnippetText')}>{noteSnippet}</p>
          </div>
        )}
      </div>

      <svg className={ns('arrow')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
})
