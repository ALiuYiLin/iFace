import { useState } from 'react'
import { IconEye, IconEyeOff } from '@/components/icon'
import styles from './SettingDrawer.module.css'
import { useNameSpace } from '@/utils'

const ns = useNameSpace(styles)

interface ApiKeyInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function ApiKeyInput({ value, onChange, placeholder }: ApiKeyInputProps) {
  const [show, setShow] = useState(false)
  return (
    <div className={ns('apiKeyWrap')}>
      <input type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? 'sk-...'}
        className={`input-base ${ns('apiKeyInput')}`}
        autoComplete="off" spellCheck={false}
        data-mono={value && !show ? 'true' : undefined} />
      <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1} className={ns('apiKeyToggle')}>
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  )
}
