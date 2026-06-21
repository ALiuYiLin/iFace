import { useEffect, useState } from 'react'
import { getCategoryMap } from '@/api/compat'
import { useNameSpace } from '@/utils'
import styles from './CategoriesDisplay.module.css'

const ns = useNameSpace(styles)

export function CategoriesDisplay() {
  const [catMap, setCatMap] = useState<Record<
    string,
    { name: string; modules: string[]; builtin: boolean }
  > | null>(null)

  useEffect(() => {
    getCategoryMap().then(setCatMap)
  }, [])

  if (!catMap || Object.keys(catMap).length === 0) return null

  const entries = Object.values(catMap).sort((a, b) => {
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className={ns('container')}>
      {entries.map((cat) => (
        <div key={cat.name} className={ns('row')}>
          <span className={ns('name')}>{cat.name}</span>
          {cat.builtin && (
            <span className={ns('builtinBadge')}>内置</span>
          )}
          <div className={ns('modulesWrap')}>
            {cat.modules.map((m) => (
              <span key={m} className={ns('module')}>{m}</span>
            ))}
            {cat.modules.length === 0 && (
              <span className={ns('emptyModules')}>暂无模块</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
