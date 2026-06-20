import { Spinner } from '@/components/ui'
import { useNameSpace } from '@/utils'
import styles from './AnswerOverrideEditor.module.css'

const ns = useNameSpace(styles)

export type AnswerOverrideSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AnswerOverrideEditorProps {
  draft: string
  saveStatus: AnswerOverrideSaveStatus
  canSave: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  onRestoreDefault: () => void
}

export function AnswerOverrideEditor({
  draft,
  saveStatus,
  canSave,
  onDraftChange,
  onSave,
  onCancel,
  onRestoreDefault,
}: AnswerOverrideEditorProps) {
  const statusText =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : 'Markdown'

  const statusColorClass =
    saveStatus === 'error'
      ? 'statusError'
      : saveStatus === 'saved'
        ? 'statusSaved'
        : 'statusIdle'

  return (
    <div className={ns('container')}>
      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={10}
        className={ns('textarea')}
      />

      <div className={ns('footer')}>
        <span className={ns('status', statusColorClass)}>{statusText}</span>

        <div className={ns('actions')}>
          <button type="button" onClick={onRestoreDefault} className={ns('restoreBtn')}>
            恢复默认
          </button>
          <button type="button" onClick={onCancel} className={ns('cancelBtn')}>
            取消
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saveStatus === 'saving'}
            className={ns(
              'saveBtn',
              canSave ? 'saveBtnEnabled' : 'saveBtnDisabled',
              saveStatus === 'saving' && 'saveBtnSaving',
            )}
          >
            {saveStatus === 'saving' && <Spinner size="sm" />}
            保存答案
          </button>
        </div>
      </div>
    </div>
  )
}
