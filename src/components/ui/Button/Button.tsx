import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import { Spinner } from '../Spinner'
import styles from './Button.module.css'

const ns = useNameSpace(styles)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      data-variant={variant}
      data-size={size}
      className={`${ns('btn')} ${fullWidth ? ns('fullWidth') : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      ) : icon ? (
        <span className={ns('iconWrap')}>{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className={ns('iconWrap')}>{iconRight}</span>}
    </button>
  )
}
