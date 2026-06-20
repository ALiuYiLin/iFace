import { Skeleton } from '@/components/ui'
import styles from './ListSkeleton.module.css'

export function ListSkeleton() {
  return (
    <div className={styles.wrapper}>
      {[
        'question-list-skeleton-1',
        'question-list-skeleton-2',
        'question-list-skeleton-3',
        'question-list-skeleton-4',
        'question-list-skeleton-5',
        'question-list-skeleton-6',
        'question-list-skeleton-7',
        'question-list-skeleton-8',
      ].map((key) => (
        <div key={key} className={`card ${styles.card}`}>
          <Skeleton width={3} height={52} rounded="sm" />
          <div className={styles.body}>
            <Skeleton width="75%" height={14} />
            <Skeleton width="45%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}
