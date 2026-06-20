import { useState } from 'react'
import React from 'react'
import { Button } from '@/components/ui'
import { buildBasePrompt, MODULE_SUGGESTIONS } from './presets'

export function CustomBuilder({ onGenerate }: { onGenerate: (prompt: string) => void }) {
  const [module, setModule] = useState('JS基础')
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false)
  const [count, setCount] = useState(60)
  const [diffPreset, setDiffPreset] = useState('standard')
  const [extraContext, setExtraContext] = useState('')
  const moduleInputRef = React.useRef<HTMLInputElement>(null)
  const moduleDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!moduleDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (
        !moduleInputRef.current?.contains(e.target as Node) &&
        !moduleDropdownRef.current?.contains(e.target as Node)
      ) {
        setModuleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moduleDropdownOpen])

  const filteredModules = MODULE_SUGGESTIONS.filter((m) =>
    m.toLowerCase().includes(module.toLowerCase()),
  )

  const diffOptions: Record<string, string> = {
    standard: '初级 30% / 中级 50% / 高级 20%（标准）',
    beginner: '初级 60% / 中级 35% / 高级 5%（入门）',
    advanced: '初级 10% / 中级 40% / 高级 50%（进阶）',
    mid: '初级 0% / 中级 60% / 高级 40%（中高级）',
  }

  const diffDetail: Record<string, string> = {
    standard: `- 初级（difficulty: 1）：${Math.round(count * 0.3)} 道\n- 中级（difficulty: 2）：${Math.round(count * 0.5)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.2)} 道`,
    beginner: `- 初级（difficulty: 1）：${Math.round(count * 0.6)} 道\n- 中级（difficulty: 2）：${Math.round(count * 0.35)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.05)} 道`,
    advanced: `- 初级（difficulty: 1）：${Math.round(count * 0.1)} 道\n- 中级（difficulty: 2）：${Math.round(count * 0.4)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.5)} 道`,
    mid: `- 初级（difficulty: 1）：0 道\n- 中级（difficulty: 2）：${Math.round(count * 0.6)} 道\n- 高级（difficulty: 3）：${Math.round(count * 0.4)} 道`,
  }

  const handleGenerate = () => {
    const detail = diffDetail[diffPreset]
      .replace(/（difficulty: \d）/g, '')
      .replace(/difficulty: \d,\s*/g, '')
    const prompt = buildBasePrompt(module, count, detail, extraContext)
    onGenerate(prompt)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {/* Module */}
        <div style={{ position: 'relative' }}>
          <label
            htmlFor="prompt-builder-module"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-2)',
              marginBottom: 6,
            }}
          >
            模块
            <span
              style={{
                marginLeft: 5,
                fontSize: 10,
                color: 'var(--text-3)',
                fontWeight: 400,
              }}
            >
              （可自由输入，如 Golang、Java）
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="prompt-builder-module"
              ref={moduleInputRef}
              type="text"
              value={module}
              onChange={(e) => {
                setModule(e.target.value)
                setModuleDropdownOpen(true)
              }}
              onFocus={() => setModuleDropdownOpen(true)}
              placeholder="输入或选择模块名…"
              style={{
                width: '100%',
                padding: '7px 30px 7px 10px',
                borderRadius: 10,
                fontSize: 'var(--control-font-size)',
                background: 'var(--surface)',
                border: moduleDropdownOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                boxShadow: moduleDropdownOpen ? '0 0 0 3px var(--primary-light)' : 'none',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
            {/* Chevron */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-3)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: moduleDropdownOpen
                  ? 'translateY(-50%) rotate(180deg)'
                  : 'translateY(-50%)',
                transition: 'transform 0.15s',
                pointerEvents: 'none',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>

            {/* Custom dropdown */}
            {moduleDropdownOpen && filteredModules.length > 0 && (
              <div
                ref={moduleDropdownRef}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  boxShadow: 'var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12))',
                  overflow: 'hidden',
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {filteredModules.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setModule(m)
                      setModuleDropdownOpen(false)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 13,
                      color: m === module ? 'var(--primary)' : 'var(--text)',
                      background: m === module ? 'var(--primary-light)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      if (m !== module)
                        (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                    }}
                    onMouseLeave={(e) => {
                      if (m !== module)
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Count */}
        <div>
          <label
            htmlFor="prompt-builder-count"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-2)',
              marginBottom: 6,
            }}
          >
            题目数量：
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{count} 道</span>
          </label>
          <input
            id="prompt-builder-count"
            type="range"
            min={20}
            max={100}
            step={5}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--primary)',
              cursor: 'pointer',
              marginTop: 4,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-3)',
              marginTop: 2,
            }}
          >
            <span>20</span>
            <span>60</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <div
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-2)',
            marginBottom: 8,
          }}
        >
          难度分布
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
          }}
        >
          {Object.entries(diffOptions).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setDiffPreset(key)}
              style={{
                padding: '7px 10px',
                borderRadius: 9,
                fontSize: 11,
                textAlign: 'left',
                border:
                  diffPreset === key
                    ? '1px solid rgba(var(--primary-rgb), 0.5)'
                    : '1px solid var(--border)',
                background: diffPreset === key ? 'var(--primary-light)' : 'transparent',
                color: diffPreset === key ? 'var(--primary)' : 'var(--text-2)',
                fontWeight: diffPreset === key ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Extra context */}
      <div>
        <label
          htmlFor="prompt-builder-extra-context"
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-2)',
            marginBottom: 6,
          }}
        >
          补充说明（可选）
        </label>
        <textarea
          id="prompt-builder-extra-context"
          placeholder="例如：重点覆盖 React Hooks 原理，包含大量代码题；或：针对 2024 年面试热点…"
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 10,
            fontSize: 'var(--control-font-size)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            resize: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.6,
          }}
        />
      </div>

      <Button
        variant="primary"
        onClick={handleGenerate}
        icon={
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        }
      >
        生成自定义 Prompt
      </Button>
    </div>
  )
}
