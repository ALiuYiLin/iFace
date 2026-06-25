import { Link } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { useNameSpace } from '@/utils'
import type { Module } from '@/types'
import styles from './ModuleProgressBar.module.css'

const ns = useNameSpace(styles)

export function ModuleProgressBar({
  module,
  questions,
}: {
  module: Module
  questions: { id: string }[]
}) {
  const records = useAppSelector((s) => s.study.records)
  const total = questions.length
  const mastered = questions.filter((q) => records[q.id]?.status === 'mastered').length
  const review = questions.filter((q) => records[q.id]?.status === 'review').length
  const percent = total > 0 ? Math.round((mastered / total) * 100) : 0

  const percentColor = percent === 100 ? 'var(--success)' : percent > 0 ? 'var(--primary)' : 'var(--text-3)'

  return (
    <Link to={`/questions?module=${encodeURIComponent(module)}`} className={ns('link')}>
      <div className={ns('body')}>
        <div className={ns('header')}>
          <span className={ns('name')}>{module}</span>
          <span className={ns('count')}>{mastered}/{total}</span>
        </div>
        <div className={ns('track')}>
          <div className={ns('barGroup')}>
            {mastered > 0 && (
              <div className={ns('barMastered')} style={{ width: `${(mastered / total) * 100}%` }} />
            )}
            {review > 0 && (
              <div className={ns('barReview')} style={{ width: `${(review / total) * 100}%` }} />
            )}
          </div>
        </div>
      </div>
      <span className={ns('percent')} style={{ color: percentColor }}>{percent}%</span>
    </Link>
  )
}
