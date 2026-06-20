import { useState } from 'react'
import { Button } from '@/components/ui'
import { parseJSONSafe } from '@/lib/questionLoader'
import { useNameSpace } from '@/utils'
import styles from './PastePanel.module.css'

const ns = useNameSpace(styles)

export function PastePanel({
  onImport,
  loading,
}: {
  onImport: (json: string, source: string, category: string) => void
  loading: boolean
}) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) {
      setError('请粘贴 JSON 内容')
      return
    }
    if (!source.trim()) {
      setError('请填写来源名称')
      return
    }
    const parsed = parseJSONSafe(text.trim())
    if (!parsed.ok) {
      setError(`JSON 格式错误：${parsed.error}`)
      return
    }
    setError('')
    onImport(text.trim(), source.trim(), category.trim())
  }

  return (
    <div className={ns('container')}>
      <div className={ns('fieldsGrid')}>
        <div>
          <label htmlFor="import-paste-source" className={ns('label')}>
            来源名称 <span className={ns('labelRequired')}>*</span>
          </label>
          <input
            id="import-paste-source"
            type="text"
            placeholder="例如：字节跳动、我的项目专题…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={`input-base ${ns('input')}`}
          />
        </div>
        <div>
          <label htmlFor="import-paste-category" className={ns('label')}>
            分类名称
            <span className={ns('labelOptional')}>（可选）</span>
          </label>
          <input
            id="import-paste-category"
            type="text"
            placeholder="例如：Go、Java、系统设计…"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`input-base ${ns('input')}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="import-paste-json" className={ns('label')}>
          JSON 内容 <span className={ns('labelRequired')}>*</span>
        </label>
        <textarea
          id="import-paste-json"
          placeholder={`粘贴题目 JSON 数组，格式：\n[\n  {\n    "id": "my-001",\n    "module": "Golang",\n    "difficulty": 2,\n    "question": "题目内容",\n    "answer": "## 参考答案\\n...",\n    "tags": ["goroutine"],\n    "source": "高频"\n  }\n]`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className={`input-base ${ns('textarea')}`}
        />
      </div>

      {error && (
        <p className={ns('error')}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={ns('errorIcon')}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      <Button
        variant="primary"
        fullWidth
        loading={loading}
        onClick={handleSubmit}
        icon={
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        }
      >
        导入题目
      </Button>
    </div>
  )
}
