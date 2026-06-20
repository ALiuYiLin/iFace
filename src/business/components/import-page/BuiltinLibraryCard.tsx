import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { getAllQuestions } from '@/lib/db'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import {
  BUILTIN_MODULE_FILES,
  BUILTIN_QUESTIONS_VERSION,
  loadAllBuiltinModulesParallel,
} from '@/lib/questionLoader'
import { useNameSpace } from '@/utils'
import styles from './BuiltinLibraryCard.module.css'

const ns = useNameSpace(styles)

export function BuiltinLibraryCard() {
  const [builtinCount, setBuiltinCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const refreshStats = useCallback(async () => {
    const questions = await getAllQuestions()
    setBuiltinCount(questions.filter((question) => !question.id.startsWith('custom_')).length)
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  const handleLoadBuiltin = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    const force = Boolean(builtinCount && builtinCount > 0)

    try {
      const results = await loadAllBuiltinModulesParallel(force)
      const loaded = results.reduce((sum, result) => sum + result.loaded, 0)
      const failed = results.filter((result) =>
        result.errors.some((error) => error.index === -1 && result.loaded === 0),
      )
      invalidateQuestionsCache()
      await refreshStats()

      if (failed.length > 0) {
        setMessage({
          type: 'error',
          text: `有 ${failed.length} 个内置题库文件加载失败，请检查网络或刷新重试。`,
        })
      } else {
        setMessage({
          type: 'success',
          text: force
            ? `已重刷内置题库，写入 ${loaded.toLocaleString()} 道题。`
            : `已加载内置题库，写入 ${loaded.toLocaleString()} 道题。`,
        })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: `内置题库加载失败：${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setLoading(false)
    }
  }, [builtinCount, refreshStats])

  return (
    <div className={`card builtin-library-card animate-fade-in stagger-1 ${ns('card')}`}>
      <div className={ns('left')}>
        <span className={ns('iconCircle')}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
        <div className={ns('info')}>
          <p className={ns('title')}>内置题库</p>
          <p className={ns('desc')}>
            {builtinCount === null
              ? '正在读取本地题库状态…'
              : `本地已有 ${builtinCount.toLocaleString()} 道内置题，覆盖 ${BUILTIN_MODULE_FILES.length} 个题库文件。`}
          </p>
          <p className={ns('version')}>题库版本：{BUILTIN_QUESTIONS_VERSION}</p>
          {message && (
            <p className={ns('message')} data-type={message.type}>
              {message.text}
            </p>
          )}
        </div>
      </div>
      <Button
        variant={builtinCount && builtinCount > 0 ? 'secondary' : 'primary'}
        size="sm"
        loading={loading}
        onClick={handleLoadBuiltin}
        className={ns('actionBtn')}
      >
        {builtinCount && builtinCount > 0 ? '重刷内置题库' : '加载内置题库'}
      </Button>
    </div>
  )
}
