import type { ToastState } from './hooks/useSettingDrawerBase'
import styles from './SettingDrawer.module.css'
import { useNameSpace } from '@/utils'

const ns = useNameSpace(styles)

export function Toast({ message, type }: ToastState) {
  return (
    <div className={ns('toast')} data-type={type}
      style={{
        background: `var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'primary'})`,
        color: 'white',
      }}>
      {message}
    </div>
  )
}
