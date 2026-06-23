import styles from './SettingDrawer.module.css'
import { useNameSpace } from '@/utils'

const ns = useNameSpace(styles)

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <button type="button" className={ns('toggle')} data-checked={checked} onClick={() => onChange(!checked)}>
      <div className={ns('toggleBody')}>
        <p className={ns('toggleLabel')}>{label}</p>
        {description && <p className={ns('toggleDesc')}>{description}</p>}
      </div>
      <div className={ns('toggleTrack')}>
        <div className={ns('toggleKnob')} />
      </div>
    </button>
  )
}
