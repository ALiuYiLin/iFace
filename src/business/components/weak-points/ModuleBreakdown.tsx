import { MODULE_LIST, type Module } from '@/types'
import { useNameSpace } from '@/utils'
import styles from './ModuleBreakdown.module.css'

const ns = useNameSpace(styles)

export function ModuleBreakdown({
  weakByModule,
  selectedModule,
  onSelect,
}: {
  weakByModule: Record<Module, number>
  selectedModule: Module | null
  onSelect: (m: Module | null) => void
}) {
  const modules = MODULE_LIST.filter((m) => weakByModule[m] > 0)
  if (modules.length === 0) return null

  const total = Object.values(weakByModule).reduce((a, b) => a + b, 0)

  return (
    <div className={ns('list')}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={ns('chip')}
        data-active={selectedModule === null}
      >
        全部
        <span className={ns('count')} data-active={selectedModule === null}>
          {total}
        </span>
      </button>

      {modules.map((mod) => {
        const active = selectedModule === mod
        return (
          <button
            type="button"
            key={mod}
            onClick={() => onSelect(active ? null : mod)}
            className={ns('chip')}
            data-active={active}
            data-type="module"
          >
            {mod}
            <span className={ns('count')} data-active={active}>
              {weakByModule[mod]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
