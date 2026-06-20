import { useNameSpace } from '@/utils'
import styles from './AnswerPanelTabs.module.css'

const ns = useNameSpace(styles)

export type AnswerPanelView = 'answer' | 'check'

export interface AnswerPanelTabsProps {
  activeView: AnswerPanelView
  answerLabel: string
  onChange: (view: AnswerPanelView) => void
}

export function AnswerPanelTabs({ activeView, answerLabel, onChange }: AnswerPanelTabsProps) {
  const items: Array<{ view: AnswerPanelView; label: string }> = [
    { view: 'answer', label: answerLabel },
    { view: 'check', label: '测试一下' },
  ]

  return (
    <div role="tablist" aria-label="答案学习视图" className={ns('tablist')}>
      {items.map((item) => {
        const active = activeView === item.view
        return (
          <button
            key={item.view}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.view)}
            className={ns('tab', active ? 'tabActive' : 'tabIdle')}
          >
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
