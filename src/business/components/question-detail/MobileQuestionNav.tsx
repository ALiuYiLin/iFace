import { useNameSpace } from '@/utils'
import styles from './MobileQuestionNav.module.css'

const ns = useNameSpace(styles)

export interface MobileQuestionNavProps {
  prevDisabled: boolean
  nextDisabled: boolean
  onPrev: () => void
  onNext: () => void
}

export function MobileQuestionNav({ prevDisabled, nextDisabled, onPrev, onNext }: MobileQuestionNavProps) {
  return (
    <div className={ns('container')}>
      <button type="button" onClick={onPrev} disabled={prevDisabled} className={ns('navBtn')}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        上一题
      </button>
      <button type="button" onClick={onNext} disabled={nextDisabled} className={ns('navBtn')}>
        下一题
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  )
}
