import type { ReactNode } from 'react'
import styles from './SettingDrawer.module.css'
import { useNameSpace } from '@/utils'

const ns = useNameSpace(styles)

interface FieldProps {
  label: string
  children: ReactNode
  hint?: string
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <div className={ns('field')}>
      <div className={ns('fieldLabel')}>{label}</div>
      {children}
      {hint && <p className={ns('fieldHint')}>{hint}</p>}
    </div>
  )
}
