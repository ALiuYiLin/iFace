import { useCallback, useRef, useState } from 'react'
import { Spinner } from '@/components/ui'
import { isJSONFile, isMDFile } from '@/lib/questionLoader'
import { useNameSpace } from '@/utils'
import styles from './DropZone.module.css'

const ns = useNameSpace(styles)

export function DropZone({
  onFiles,
  loading,
  category,
  onCategoryChange,
}: {
  onFiles: (files: File[], category: string) => void
  loading: boolean
  category: string
  onCategoryChange: (v: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).filter((f) => isJSONFile(f) || isMDFile(f))
      if (files.length > 0) onFiles(files, category)
    },
    [onFiles, category],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) => isJSONFile(f) || isMDFile(f))
      if (files.length > 0) onFiles(files, category)
      e.target.value = ''
    },
    [onFiles, category],
  )

  return (
    <div className={ns('container')}>
      {/* Category input */}
      <div>
        <label htmlFor="import-file-category" className={ns('label')}>
          分类名称
          <span className={ns('labelOptional')}>（留空则自动从文件名推断，如"Go"、"Java"）</span>
        </label>
        <input
          id="import-file-category"
          type="text"
          placeholder="例如：Go、Java、系统设计…"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={`input-base ${ns('input')}`}
        />
      </div>

      {/* Drop area */}
      <button
        type="button"
        disabled={loading}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={ns('dropArea')}
        data-dragging={dragging}
        data-loading={loading}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json,.md,.markdown,text/markdown"
          multiple
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        {loading ? (
          <div className={ns('loadingWrap')}>
            <Spinner size="lg" className="text-(--primary)" />
            <p className={ns('spinnerText')}>导入中…</p>
          </div>
        ) : (
          <>
            <div className={ns('uploadIcon')} data-dragging={dragging}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={dragging ? 'white' : 'var(--text-3)'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className={ns('uploadText')}>{dragging ? '松开以导入' : '拖拽文件到此处'}</p>
              <p className={ns('uploadSubtext')}>或点击选择文件（支持多选）</p>
            </div>
            <div className={ns('formatRow')}>
              {['.json', '.md'].map((ext) => (
                <span key={ext} className={ns('formatBadge')}>
                  {ext}
                </span>
              ))}
            </div>
          </>
        )}
      </button>
    </div>
  )
}
