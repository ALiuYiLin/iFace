import { Kbd } from '@/components/ui'
import { useNameSpace } from '@/utils'
import type { AnswerPanelView } from './AnswerPanelTabs'
import styles from './ShortcutHints.module.css'

const ns = useNameSpace(styles)

export interface ShortcutHintsProps {
  answerVisible: boolean
  answerPanelView: AnswerPanelView
}

export function ShortcutHints({ answerVisible, answerPanelView }: ShortcutHintsProps) {
  const showStatusShortcuts = answerVisible && answerPanelView === 'answer'

  return (
    <div className={ns('container')}>
      {!answerVisible && (
        <span className={ns('hint')}>
          <Kbd>Space</Kbd>
          <span>查看答案</span>
        </span>
      )}
      {showStatusShortcuts && (
        <>
          <span className={ns('hint')}>
            <Kbd>1</Kbd>
            <span>没掌握</span>
          </span>
          <span className={ns('hint')}>
            <Kbd>2</Kbd>
            <span>大概会</span>
          </span>
          <span className={ns('hint')}>
            <Kbd>3</Kbd>
            <span>完全掌握</span>
          </span>
        </>
      )}
      <span className={ns('hint')}>
        <Kbd>{'→'}</Kbd>
        <span>下一题</span>
      </span>
      <span className={ns('hint')}>
        <Kbd>{'←'}</Kbd>
        <span>上一题</span>
      </span>
      <span className={ns('hint')}>
        <Kbd>N</Kbd>
        <span>笔记</span>
      </span>
      <span className={ns('hint')}>
        <Kbd>A</Kbd>
        <span>AI 助手</span>
      </span>
    </div>
  )
}
