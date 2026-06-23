import type { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedMap = { sm: 'rounded', md: 'rounded-lg', lg: 'rounded-xl', full: 'rounded-full' }

export function Skeleton({ width, height, rounded = 'md', className = '', style, ...props }: SkeletonProps) {
  return <div className={`skeleton ${roundedMap[rounded]} ${className}`} style={{ width, height, ...style }} {...props} />
}
