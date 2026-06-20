import { useState } from 'react'
import { useNameSpace } from '@/utils'
import styles from './SchemaGuide.module.css'

const ns = useNameSpace(styles)

const SCHEMA_EXAMPLE = `[
  {
    "id": "unique-id-001",
    "module": "React",
    "difficulty": 2,
    "question": "解释 React Hooks 的规则",
    "answer": "## Hooks 规则\\n\\n只在**顶层**调用 Hook...",
    "tags": ["hooks", "规则"],
    "source": "高频"
  }
]`

const MODULE_VALUES = [
  'JS基础',
  'React',
  '性能优化',
  '网络',
  'CSS',
  'TypeScript',
  '手写题',
  '项目深挖',
]

export function SchemaGuide() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={ns('container')}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={ns('toggleBtn')}
      >
        <span className={ns('toggleLabel')}>JSON 格式说明</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={ns('chevron')}
          data-expanded={expanded}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className={`animate-fade-in ${ns('content')}`}>
          {/* Field table */}
          <div className={ns('fieldTable')}>
            <table className={ns('table')}>
              <thead className={ns('tableHeader')}>
                <tr>
                  {['字段', '类型', '必填', '说明'].map((h) => (
                    <th key={h} className={ns('headerCell')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ['id', 'string', '必填', '唯一标识符'],
                  ['module', 'enum', '必填', MODULE_VALUES.join(' | ')],
                  ['difficulty', '1 | 2 | 3', '必填', '初级 | 中级 | 高级'],
                  ['question', 'string', '必填', '题目内容'],
                  ['answer', 'string (Markdown)', '必填', '参考答案，支持 Markdown'],
                  ['tags', 'string[]', '必填', '标签数组（可为空数组）'],
                  ['source', 'string', '可选', '来源标注，如"高频" "字节"'],
                ] as const).map(([field, type, required, desc], i) => (
                  <tr key={field} className={ns('tableRow')}>
                    <td className={ns('cellCode')}>{field}</td>
                    <td className={ns('cellType')}>{type}</td>
                    <td className={ns('cellRequired')} data-required={required === '必填'}>{required}</td>
                    <td className={ns('cellDesc')}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Example */}
          <div className={ns('exampleSection')}>
            <p className={ns('exampleLabel')}>示例</p>
            <pre className={ns('examplePre')}>{SCHEMA_EXAMPLE}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
