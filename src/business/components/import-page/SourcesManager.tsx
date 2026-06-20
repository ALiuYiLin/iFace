import { useNameSpace } from '@/utils'
import styles from './SourcesManager.module.css'

const ns = useNameSpace(styles)

export function SourcesManager({
  sources,
  onRemove,
}: {
  sources: string[]
  onRemove: (source: string) => void
}) {
  if (sources.length === 0) {
    return (
      <div className={ns('emptyState')}>
        暂无自定义来源，导入题目后会在这里显示
      </div>
    )
  }

  return (
    <div className={ns('list')}>
      {sources.map((source) => (
        <div key={source} className={ns('sourceRow')}>
          <span className={ns('sourceName')}>{source}</span>
          <button
            type="button"
            onClick={() => onRemove(source)}
            className={ns('deleteBtn')}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            删除
          </button>
        </div>
      ))}
    </div>
  )
}
