import { Link } from 'react-router-dom'
import { Badge, Button } from '@/components/ui'
import { useNameSpace } from '@/utils'
import { DIFFICULTY_LABELS, DIFFICULTY_STYLES, STATUS_LABELS, STATUS_STYLES, type Question, type StudyStatus } from '@/types'
import styles from './RelatedPracticeCard.module.css'

const ns = useNameSpace(styles)

export interface RelatedPracticeItem {
  question: Question
  status: StudyStatus
  matchedTags: string[]
}

export interface RelatedPracticeCardProps {
  items: RelatedPracticeItem[]
  onStartPractice: () => void
}

export function RelatedPracticeCard({ items, onStartPractice }: RelatedPracticeCardProps) {
  if (items.length === 0) return null

  return (
    <div className={`card animate-fade-in ${ns('card')}`}>
      <div className={ns('header')}>
        <div className={ns('headerLeft')}>
          <p className={ns('suptitle')}>同主题加练</p>
          <h2 className={ns('title')}>继续巩固相近考点</h2>
          <p className={ns('desc')}>
            已按标签、模块和掌握状态挑出最相关的题目。
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onStartPractice}
          icon={
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
        >
          练这 {items.length} 题
        </Button>
      </div>

      <div className={ns('list')}>
        {items.slice(0, 3).map((item) => {
          const difficultyStyle = DIFFICULTY_STYLES[item.question.difficulty]
          const statusStyle = STATUS_STYLES[item.status]
          const detailParts = [
            item.question.module,
            item.matchedTags.length > 0 ? item.matchedTags.slice(0, 2).join(' / ') : null,
          ].filter(Boolean)

          return (
            <Link
              key={item.question.id}
              to={`/questions/${item.question.id}`}
              className={ns('row')}
            >
              <div className={ns('rowText')}>
                <p className={ns('rowTitle')}>{item.question.question}</p>
                <p className={ns('rowMeta')}>{detailParts.join(' · ')}</p>
              </div>
              <div className={ns('badges')}>
                <Badge size="sm" variant="ghost" style={difficultyStyle}>
                  {DIFFICULTY_LABELS[item.question.difficulty]}
                </Badge>
                <Badge size="sm" variant="ghost" style={statusStyle}>
                  {STATUS_LABELS[item.status]}
                </Badge>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
