import type { SVGAttributes } from 'react'

export function IconNote(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
    </svg>
  )
}
