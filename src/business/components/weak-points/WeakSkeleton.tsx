import { Skeleton } from '@/components/ui'
import { useNameSpace } from '@/utils'
import styles from './WeakSkeleton.module.css'

const ns = useNameSpace(styles)

export function WeakSkeleton() {
  return (
    <div className={ns('root')}>
      <div className={ns('statsGrid')}>
        {['1', '2', '3'].map((key) => (
          <div key={key} className={`${ns('statCard')} card`}>
            <Skeleton width={40} height={24} rounded="md" />
            <Skeleton width={60} height={11} />
          </div>
        ))}
      </div>
      <div className={ns('list')}>
        {['1', '2', '3', '4', '5', '6'].map((key) => (
          <div key={key} className={`${ns('listItem')} card`}>
            <Skeleton width={26} height={26} rounded="md" />
            <Skeleton width={3} height={52} rounded="sm" />
            <div className={ns('listContent')}>
              <Skeleton width="75%" height={14} />
              <Skeleton width="45%" height={12} />
            </div>
            <div className={ns('listRight')}>
              <Skeleton width={52} height={20} rounded="md" />
              <Skeleton width={48} height={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
