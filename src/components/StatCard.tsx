import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  sub,
  accentColor,
  delay = 0,
  icon,
}: {
  label: string
  value: number | string
  sub?: string
  accentColor: string
  delay?: number
  icon: ReactNode
}) {
  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        animationDelay: `${delay}s`,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--text-2)',
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            marginBottom: 2,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}
