import { useNameSpace } from '@/utils'
import styles from './TextInput.module.css'

const ns = useNameSpace(styles)

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={ns('input')}
    />
  )
}
