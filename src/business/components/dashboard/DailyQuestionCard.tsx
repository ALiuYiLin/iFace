import { Link } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { useNameSpace } from '@/utils'
import { DIFFICULTY_LABELS } from '@/types'
import type { Module, StudyStatus } from '@/types'
import styles from './DailyQuestionCard.module.css'

const ns = useNameSpace(styles)

const diffColor: Record<number, string> = {
  1: 'var(--success)',
  2: 'var(--warning)',
  3: 'var(--danger)',
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

export function DailyQuestionCard({ questionId, index }: { questionId: string; index: number }) {
  const records = useAppSelector((s) => s.study.records)
  const question = useAppSelector((s) =>
    s.dashboard.allQuestions.find((q) => q.id === questionId),
  )

  if (!question) return null

  const status: StudyStatus = records[questionId]?.status ?? 'unlearned'

  return (
    <Link
      to={`/questions/${question.id}`}
      className={ns('card', 'animate-fade-in')}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className={ns('index')}>{index + 1}</div>

      <div className={ns('content')}>
        <p className={ns('questionText')}>{question.question}</p>
        <div className={ns('meta')}>
          <span className={ns('module')}>{question.module}</span>
          <span className={ns('difficulty')} style={{ color: diffColor[question.difficulty] }}>
            {DIFFICULTY_LABELS[question.difficulty as 1 | 2 | 3]}
          </span>
          {statusLabel[status] && (
            <span className={ns('status')} style={{ color: statusColor[status] }}>
              {statusLabel[status]}
            </span>
          )}
        </div>
      </div>

      <svg className={ns('arrow')} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
}
