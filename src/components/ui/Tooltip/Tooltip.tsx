import type { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  return (
    <div className={`relative group inline-flex ${className}`}>
      {children}
      <div className={`absolute z-50 px-2 py-1 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none bg-[var(--text)] text-[var(--surface)] opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 ${positionClasses[position]}`}>
        {content}
      </div>
    </div>
  )
}
