type ToolIconType =
  | 'interview'
  | 'match'
  | 'prompt'
  | 'project'
  | 'questions'
  | 'review'
  | 'intro'
  | 'plan'

export function ToolIcon({ type }: { type: ToolIconType }) {
  if (type === 'interview') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7.5h10" />
        <path d="M7 11.5h6" />
        <path d="M6.5 18.5 4 21v-3.5A3.5 3.5 0 0 1 2 14.3V6.5A3.5 3.5 0 0 1 5.5 3h13A3.5 3.5 0 0 1 22 6.5v7A3.5 3.5 0 0 1 18.5 17H10" />
      </svg>
    )
  }

  if (type === 'prompt') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 8 4 4-4 4" />
        <path d="M12 16h6" />
        <rect x="3" y="4" width="18" height="16" rx="3" />
      </svg>
    )
  }

  if (type === 'project') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5h6l2 2h8v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M4 7.5V6a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v1.5" />
        <path d="M9 14h6" />
        <path d="M9 17h4" />
      </svg>
    )
  }

  if (type === 'questions') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9.2a2.4 2.4 0 0 1 4.6 1c0 1.8-2.4 2.1-2.4 3.8" />
        <path d="M12 17h.01" />
      </svg>
    )
  }

  if (type === 'review') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 4h6l1 2h3v14H5V6h3z" />
        <path d="M9 11h6" />
        <path d="M9 15h3" />
        <path d="m15 16 1.5 1.5L20 14" />
      </svg>
    )
  }

  if (type === 'intro') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M4 19a5 5 0 0 1 10 0" />
        <path d="M16 7h4" />
        <path d="M16 11h5" />
        <path d="M16 15h3" />
      </svg>
    )
  }

  if (type === 'plan') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="m8 15 2 2 4-4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h8" />
      <path d="M8 10h5" />
      <path d="M8 14h4" />
      <path d="m15 15 2 2 4-4" />
      <path d="M6 21h8" />
      <path d="M18 10V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2" />
    </svg>
  )
}
