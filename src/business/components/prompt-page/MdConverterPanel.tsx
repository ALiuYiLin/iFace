import React, { useCallback, useState } from 'react'
import { mdToQuestions } from '@/lib/mdToQuestions'

export function MdConverterPanel() {
  const [mdInput, setMdInput] = useState('')
  const [result, setResult] = useState<{
    json: string
    count: number
    errors: string[]
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const mdFileInputRef = React.useRef<HTMLInputElement>(null)

  const handleMdFileImport = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setMdInput(text)
        setResult(null)
        setCopied(false)
      }
    }
    reader.readAsText(file, 'utf-8')
    // reset so same file can be re-imported
    e.target.value = ''
  }, [])

  const handleConvert = useCallback(() => {
    if (!mdInput.trim()) return
    const { questions, errors } = mdToQuestions(mdInput)
    setResult({
      json: JSON.stringify(questions, null, 2),
      count: questions.length,
      errors,
    })
    setCopied(false)
  }, [mdInput])

  const handleCopy = useCallback(() => {
    if (!result) return
    navigator.clipboard.writeText(result.json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  const handleDownload = useCallback(() => {
    if (!result) return
    const blob = new Blob([result.json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `questions-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [result])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hidden MD file input */}
      <input
        ref={mdFileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        style={{ display: 'none' }}
        onChange={handleMdFileImport}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Markdown → JSON 转换器
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            将 AI 输出的 Markdown 题目粘贴或导入文件，转换后复制 JSON 导入题库
          </p>
        </div>
      </div>

      {/* Two columns: input + output */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          alignItems: 'start',
        }}
        className="converter-cols"
      >
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
              AI 输出（Markdown）
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Import .md file button */}
              <button
                type="button"
                onClick={() => mdFileInputRef.current?.click()}
                title="从本地导入 .md 文件"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'var(--primary)',
                  background: 'none',
                  border: '1px solid rgba(var(--primary-rgb), 0.3)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: '3px 8px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--primary-light)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'none'
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                导入 .md
              </button>
              {mdInput && (
                <button
                  type="button"
                  onClick={() => {
                    setMdInput('')
                    setResult(null)
                  }}
                  style={{
                    fontSize: 11,
                    color: 'var(--text-3)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                >
                  清空
                </button>
              )}
            </div>
          </div>
          <textarea
            value={mdInput}
            onChange={(e) => setMdInput(e.target.value)}
            placeholder={`粘贴 AI 生成的 Markdown，格式如：

---
## 请解释闭包的概念
**模块**: JS基础
**难度**: 中级
**标签**: 闭包, 作用域

闭包是指函数能够访问其词法作用域外部变量的特性...

---
## 下一道题...`}
            style={{
              width: '100%',
              minHeight: 360,
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: 'var(--control-font-size)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-light)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            type="button"
            onClick={handleConvert}
            disabled={!mdInput.trim()}
            style={{
              padding: '9px 0',
              borderRadius: 9,
              border: 'none',
              background: mdInput.trim() ? 'var(--primary)' : 'var(--surface-3)',
              color: mdInput.trim() ? 'white' : 'var(--text-3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: mdInput.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            转换为 JSON
          </button>
        </div>

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
              JSON 结果
              {result && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'var(--success-light)',
                    color: 'var(--success)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  {result.count} 道题
                </span>
              )}
            </span>
            {result && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    fontSize: 11,
                    color: copied ? 'var(--success)' : 'var(--primary)',
                    background: copied ? 'var(--success-light)' : 'var(--primary-light)',
                    border: 'none',
                    borderRadius: 5,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: 500,
                  }}
                >
                  {copied ? '✓ 已复制' : '复制 JSON'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    fontSize: 11,
                    color: 'var(--text-2)',
                    background: 'var(--surface-3)',
                    border: 'none',
                    borderRadius: 5,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  下载
                </button>
              </div>
            )}
          </div>

          {result ? (
            <>
              {result.errors.length > 0 && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--warning-light)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    fontSize: 11,
                    color: '#92400e',
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>
                    ⚠️ {result.errors.length} 个解析警告
                  </p>
                  {result.errors.map((e) => (
                    <p key={e} style={{ opacity: 0.85, lineHeight: 1.5 }}>
                      {e}
                    </p>
                  ))}
                </div>
              )}
              <pre
                style={{
                  minHeight: 360,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.6,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {result.json}
              </pre>
              <a
                href="/import"
                style={{
                  padding: '9px 0',
                  borderRadius: 9,
                  background: 'var(--success)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.opacity = '0.88'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.opacity = '1'
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                前往导入题库
              </a>
            </>
          ) : (
            <div
              style={{
                minHeight: 360,
                borderRadius: 10,
                border: '1px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--text-3)',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.4 }}
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <p style={{ fontSize: 12 }}>在左侧粘贴 AI 输出后点击「转换为 JSON」</p>
            </div>
          )}
        </div>
      </div>

      {/* Format guide */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
          fontSize: 12,
          color: 'var(--text-2)',
          lineHeight: 1.6,
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          📋 Markdown 格式说明
        </p>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}
          className="format-guide-grid"
        >
          <span>• 每题以 <code style={{ fontSize: 11, padding: '1px 4px', borderRadius: 3, background: 'var(--surface-3)' }}>---</code> 分隔</span>
          <span>• 题目以 <code style={{ fontSize: 11, padding: '1px 4px', borderRadius: 3, background: 'var(--surface-3)' }}>## 题目内容</code> 开头</span>
          <span>• <strong>模块</strong> 字段自动映射（js/react/css/ts/网络/性能/手写/项目）</span>
          <span>• <strong>难度</strong> 支持：初级/中级/高级</span>
          <span>• <strong>标签</strong> 用逗号或顿号分隔</span>
          <span>• <strong>来源</strong> 可选，如"高频"、"字节"</span>
          <span>• ID 未填时自动生成（模块前缀-序号）</span>
          <span>• 答案为 meta 字段之后的所有 Markdown 内容</span>
        </div>
      </div>
    </div>
  )
}
