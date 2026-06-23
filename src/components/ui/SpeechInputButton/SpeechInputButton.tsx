import { useNameSpace } from '@/utils'
import styles from './SpeechInputButton.module.css'

const ns = useNameSpace(styles)

interface SpeechInputButtonProps {
  supported: boolean
  listening: boolean
  disabled?: boolean
  onToggle: () => void
  showLabel?: boolean
}

export function SpeechInputButton({
  supported,
  listening,
  disabled = false,
  onToggle,
  showLabel = false,
}: SpeechInputButtonProps) {
  const unavailable = disabled || !supported
  const label = listening ? '停止' : '语音输入'
  const title = supported
    ? listening ? '停止语音输入' : '开始语音输入'
    : '当前浏览器不支持语音输入'

  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-label={title}
      title={title}
      disabled={unavailable}
      onClick={onToggle}
      data-listening={listening}
      data-unavailable={unavailable}
      className={ns('btn')}
      style={{
        width: showLabel ? 'auto' : 26,
        height: 26,
        minHeight: 26,
        padding: showLabel ? '3px 8px' : 0,
        gap: showLabel ? 5 : 0,
      }}
    >
      <span className={ns('iconWrap')}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
        {listening && <span className={ns('recDot')} />}
      </span>
      {showLabel && label}
    </button>
  )
}
