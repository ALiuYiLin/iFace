import { useNameSpace } from '@/utils'
import styles from './StatusButton.module.css'

const ns = useNameSpace(styles)

const COLOR_MAP: Record<
  string,
  {
    idle: { color: string; bg: string; border: string }
    active: { color: string; bg: string; border: string }
    hover: { color: string; bg: string; border: string }
  }
> = {
  danger: {
    idle: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
    active: { color: 'white', bg: '#ef4444', border: '#ef4444' },
    hover: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  },
  warning: {
    idle: { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
    active: { color: 'white', bg: '#f59e0b', border: '#f59e0b' },
    hover: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  },
  success: {
    idle: { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)' },
    active: { color: 'white', bg: '#10b981', border: '#10b981' },
    hover: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  },
}

export interface StatusButtonProps {
  onClick: () => void
  label: string
  sublabel: string
  variant: 'danger' | 'warning' | 'success'
  kbd: string
  active: boolean
  disabled?: boolean
}

export function StatusButton({
  onClick,
  label,
  sublabel,
  variant,
  kbd: kbdKey,
  active,
  disabled,
}: StatusButtonProps) {
  const c = COLOR_MAP[variant]
  const cur = active ? c.active : c.idle

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={ns('container')}
      style={{
        border: `1px solid ${cur.border}`,
        background: cur.bg,
        color: cur.color,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget
          el.style.background = c.hover.bg
          el.style.borderColor = c.hover.border
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget
          el.style.background = cur.bg
          el.style.borderColor = cur.border
        }
      }}
    >
      <div className={ns('labelRow')}>
        <span className={ns('label')}>{label}</span>
        <span className={ns('kbd', active ? 'kbdActive' : 'kbdIdle')}>{kbdKey}</span>
      </div>
      <span className={ns('sublabel', active ? 'sublabelActive' : 'sublabelIdle')}>{sublabel}</span>
    </button>
  )
}
