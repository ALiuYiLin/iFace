import { DIFFICULTY_LABELS, STATUS_LABELS, type Difficulty, type Module, type StudyStatus } from '@/types'
import { Button } from '@/components/ui'
import { useNameSpace } from '@/utils'
import styles from './SessionPreview.module.css'

const ns = useNameSpace(styles)

export function SessionPreview({
  count,
  modules,
  difficulty,
  statusFilter,
  onStart,
  onShuffle,
  isShuffled,
}: {
  count: number
  modules: Module[]
  difficulty: Difficulty | 'all'
  statusFilter: StudyStatus | 'all'
  onStart: () => void
  onShuffle: () => void
  isShuffled: boolean
}) {
  const canStart = count > 0

  return (
    <div className={`${ns('card')} card animate-scale-in`}>
      <div className={ns('titleRow')}>
        <h3 className={ns('title')}>练习配置</h3>
        <span className={ns('countBadge')} data-can-start={canStart}>{count} 道题</span>
      </div>

      <div className={ns('config')}>
        {[
          { label: '难度', value: difficulty === 'all' ? '全部难度' : DIFFICULTY_LABELS[difficulty as Difficulty] },
          { label: '状态', value: statusFilter === 'all' ? '全部状态' : STATUS_LABELS[statusFilter as StudyStatus] },
          {
            label: '模块',
            value: modules.length === 0 ? '全部模块' : modules.length === 1 ? modules[0] : `${modules.length} 个模块`,
          },
        ].map((row, i, arr) => (
          <div key={row.label} className={ns('row')} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <span className={ns('rowLabel')}>{row.label}</span>
            <span className={ns('rowValue')}>{row.value}</span>
          </div>
        ))}
      </div>

      <button type="button" onClick={onShuffle} className={ns('shuffleBtn')} data-active={isShuffled}>
        <div className={ns('shuffleLeft')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          随机顺序
        </div>
        <div className={ns('toggle')} data-active={isShuffled}>
          <div className={ns('toggleKnob')} data-active={isShuffled} />
        </div>
      </button>

      {!canStart ? (
        <p className={ns('empty')}>没有符合条件的题目</p>
      ) : (
        <Button variant="primary" size="lg" fullWidth onClick={onStart}
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
        >
          开始练习 {count} 道题
        </Button>
      )}
    </div>
  )
}
