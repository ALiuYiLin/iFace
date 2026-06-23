import type { ReactNode } from 'react'
import styles from './SettingDrawer.module.css'
import { useNameSpace } from '@/utils'

const ns = useNameSpace(styles)

export function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className={ns('sectionHeader')}>
      <div className={ns('sectionHeaderIcon')}>{icon}</div>
      <span className={ns('sectionHeaderTitle')}>{title}</span>
    </div>
  )
}
