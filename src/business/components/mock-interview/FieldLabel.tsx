import { useNameSpace } from '@/utils'
import styles from './FieldLabel.module.css'

const ns = useNameSpace(styles)

export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className={ns('root')}>
      <span className={ns('label')}>{label}</span>
      {hint && <span className={ns('hint')}>{hint}</span>}
    </div>
  )
}
