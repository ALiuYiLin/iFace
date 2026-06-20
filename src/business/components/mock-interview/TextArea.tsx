import { useNameSpace } from '@/utils'
import styles from './TextArea.module.css'

const ns = useNameSpace(styles)

export function TextArea({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  minHeight?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={ns('textarea')}
      style={{ minHeight }}
    />
  )
}
