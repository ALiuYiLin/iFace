import { useNameSpace } from '@/utils'
import styles from './ResultToast.module.css'

const ns = useNameSpace(styles)

export interface ImportResult {
  source: string
  loaded: number
  errors: { index: number; message: string }[]
  warnings: string[]
}

export function ResultToast({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0
  const success = result.loaded > 0

  return (
    <div className={ns('toast')} data-success={success}>
      <div className={ns('header')}>
        <div className={ns('headerLeft')}>
          <div className={ns('iconBox')} data-success={success}>
            {success ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
          <div>
            <p className={ns('title')} data-success={success}>
              {success ? `成功导入 ${result.loaded} 道题` : '导入失败，没有有效题目'}
            </p>
            <p className={ns('source')}>来源：{result.source}</p>
          </div>
        </div>
        <button type="button" onClick={onDismiss} className={ns('dismiss')} aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {hasWarnings && (
        <div className={ns('section')}>
          <p className={ns('sectionTitle')} data-type="warning">警告（{result.warnings.length}）</p>
          <div className={ns('scrollArea')} style={{ maxHeight: 80 }}>
            {result.warnings.map((w) => <p key={w} className={ns('warningText')}>{w}</p>)}
          </div>
        </div>
      )}

      {hasErrors && (
        <div className={ns('section')}>
          <p className={ns('sectionTitle')} data-type="error">无效题目（{result.errors.length} 条）</p>
          <div className={ns('scrollArea')} style={{ maxHeight: 100, fontFamily: 'var(--font-mono)' }}>
            {result.errors.slice(0, 5).map((e) => (
              <p key={`${e.index}-${e.message}`} className={ns('errorText')}>
                [{e.index === -1 ? '格式' : `第${e.index + 1}条`}] {e.message}
              </p>
            ))}
            {result.errors.length > 5 && <p className={ns('errorText')}>还有 {result.errors.length - 5} 个错误</p>}
          </div>
        </div>
      )}
    </div>
  )
}
