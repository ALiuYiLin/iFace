import { DIFFICULTY_LABELS, DIFFICULTY_STYLES, type Difficulty } from '@/types'
import { useNameSpace } from '@/utils'
import styles from './Chip.module.css'

const ns = useNameSpace(styles)

export function DifficultyChip({
  difficulty,
  selected,
  count,
  onClick,
}: {
  difficulty: Difficulty | 'all'
  selected: boolean
  count: number
  onClick: () => void
}) {
  const isAll = difficulty === 'all'
  const dStyle = !isAll ? DIFFICULTY_STYLES[difficulty as Difficulty] : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={ns('chip')}
      data-selected={selected}
      style={{
        borderColor: selected && !isAll && dStyle ? dStyle.borderColor : undefined,
        background: selected && !isAll && dStyle ? dStyle.background : undefined,
        color: selected && !isAll && dStyle ? dStyle.color : undefined,
      }}
    >
      {isAll ? '全部' : DIFFICULTY_LABELS[difficulty as Difficulty]}
      <span className={ns('count')} data-selected={selected}>{count}</span>
    </button>
  )
}
