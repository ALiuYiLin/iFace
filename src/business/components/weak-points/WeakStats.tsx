import { useNameSpace } from '@/utils'
import styles from './WeakStats.module.css'

const ns = useNameSpace(styles)

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  return `${Math.floor(days / 30)} 个月前`
}

export function WeakStats({
  total,
  avgReviewCount,
  oldest,
}: {
  total: number
  avgReviewCount: number
  oldest: number | null
}) {
  return (
    <div className={ns('grid')}>
      {[
        { value: total, label: '待复习题目', color: 'var(--warning)', small: false },
        { value: avgReviewCount.toFixed(1), label: '平均复习次数', color: 'var(--text)', small: false },
        { value: oldest ? timeAgo(oldest) : '—', label: '最久未复习', color: 'var(--text)', small: true },
      ].map((item) => (
        <div key={item.label} className={`${ns('item')} card`}>
          <p className={ns('value')} style={{ fontSize: item.small ? 15 : 22, color: item.color }}>
            {item.value}
          </p>
          <p className={ns('label')}>{item.label}</p>
        </div>
      ))}
    </div>
  )
}
