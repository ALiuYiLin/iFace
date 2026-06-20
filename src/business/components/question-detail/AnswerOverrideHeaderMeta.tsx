import { formatReviewNoteTime } from '@/lib/feedbackNote'
import { useNameSpace } from '@/utils'
import styles from './AnswerOverrideHeaderMeta.module.css'

const ns = useNameSpace(styles)

export interface AnswerOverrideHeaderMetaProps {
  updatedAt: number | null
  showingOriginal: boolean
  onToggleOriginal: () => void
}

export function AnswerOverrideHeaderMeta({
  updatedAt,
  showingOriginal,
  onToggleOriginal,
}: AnswerOverrideHeaderMetaProps) {
  return (
    <div className={ns('container')}>
      <span className={ns('dateLabel')}>
        {updatedAt ? formatReviewNoteTime(updatedAt) : '已自定义'}
      </span>
      <button type="button" onClick={onToggleOriginal} className={ns('toggleBtn')}>
        {showingOriginal ? '看自定义' : '看参考答案'}
      </button>
    </div>
  )
}
