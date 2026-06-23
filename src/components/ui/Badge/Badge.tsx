import type { HTMLAttributes, ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import styles from './Badge.module.css'

const ns = useNameSpace(styles)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Badge({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={`${ns('badge')} ${className}`} data-variant={variant} data-size={size} {...props}>
      {children}
    </span>
  )
}
