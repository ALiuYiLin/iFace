import type { PromptPreset } from './presets'

export function PresetCard({
  preset,
  selected,
  onClick,
}: {
  preset: PromptPreset
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        padding: '12px 14px',
        borderRadius: 14,
        border: selected
          ? '1px solid rgba(var(--primary-rgb), 0.5)'
          : '1px solid var(--border-subtle)',
        background: selected ? 'var(--primary-light)' : 'var(--surface)',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
        boxShadow: selected ? 'none' : 'var(--shadow-xs)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
          ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
        }
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: selected ? 'rgba(var(--primary-rgb), 0.12)' : 'var(--surface-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: selected ? 'var(--primary)' : 'var(--text-3)',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {preset.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: selected ? 'var(--primary)' : 'var(--text)',
            marginBottom: 3,
            transition: 'color 0.15s',
          }}
        >
          {preset.title}
        </p>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            lineHeight: 1.5,
          }}
        >
          {preset.description}
        </p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  )
}
