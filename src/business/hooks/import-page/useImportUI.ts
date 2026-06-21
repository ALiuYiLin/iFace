import { useCallback, useEffect, useState } from 'react'
import { importCustomQuestions } from '@/api'
import { isMDFile, parseJSONSafe } from '@/lib/fileUtils'
import type { CustomImportResult } from '@/api'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import { getCustomSources, getQuestions, deleteQuestionsBySource, removeCustomSource } from '@/api'
import { mdToQuestions } from '@/lib/mdToQuestions'

type Tab = 'file' | 'paste'

export interface ImportUIState {
  tab: Tab
  setTab: (v: Tab) => void
  loading: boolean
  setLoading: (v: boolean) => void
  results: CustomImportResult[]
  setResults: (v: CustomImportResult[] | ((prev: CustomImportResult[]) => CustomImportResult[])) => void
  customSources: string[]
  setCustomSources: (v: string[]) => void
  fileCategory: string
  setFileCategory: (v: string) => void
  handleImport: (data: unknown, sourceName: string, categoryName: string) => Promise<void>
  handleFiles: (files: File[], category: string) => Promise<void>
  handlePaste: (json: string, source: string, category: string) => Promise<void>
  handleRemoveSource: (source: string) => Promise<void>
}

export function useImportUI(): ImportUIState {
  const [tab, setTab] = useState<Tab>('file')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CustomImportResult[]>([])
  const [customSources, setCustomSources] = useState<string[]>([])
  const [fileCategory, setFileCategory] = useState('')

  useEffect(() => {
    getCustomSources().then(setCustomSources).catch(() => setCustomSources([]))
  }, [])

  const handleImport = useCallback(
    async (data: unknown, sourceName: string, categoryName: string) => {
      setLoading(true)
      try {
        const result = await importCustomQuestions(data, sourceName, categoryName || undefined)
        setResults((prev) => [result, ...prev])

        if (result.loaded > 0) {
          const updated = await getCustomSources()
          setCustomSources(updated)
          invalidateQuestionsCache()
        }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const handleFiles = useCallback(
    async (files: File[], category: string) => {
      setLoading(true)
      for (const file of files) {
        const text = await file.text()

        if (isMDFile(file)) {
          const { questions, errors } = mdToQuestions(text)
          if (questions.length === 0) {
            setResults((prev) => [
              {
                source: file.name,
                loaded: 0,
                errors: errors.map((msg, i) => ({ index: i, message: msg })),
                warnings: [],
              },
              ...prev,
            ])
            continue
          }
          const sourceName = file.name.replace(/\.(md|markdown)$/i, '')
          await handleImport(questions, sourceName, category)
          continue
        }

        const parsed = parseJSONSafe(text)
        if (!parsed.ok) {
          setResults((prev) => [
            {
              source: file.name,
              loaded: 0,
              errors: [{ index: -1, message: `JSON 解析失败：${parsed.error}` }],
              warnings: [],
            },
            ...prev,
          ])
          continue
        }
        await handleImport(parsed.data, file.name.replace(/\.json$/i, ''), category)
      }
      setLoading(false)
    },
    [handleImport],
  )

  const handlePaste = useCallback(
    async (json: string, source: string, category: string) => {
      const parsed = parseJSONSafe(json)
      if (!parsed.ok) {
        setResults((prev) => [
          {
            source,
            loaded: 0,
            errors: [{ index: -1, message: `JSON 解析失败：${parsed.error}` }],
            warnings: [],
          },
          ...prev,
        ])
        return
      }
      await handleImport(parsed.data, source, category)
    },
    [handleImport],
  )

  const handleRemoveSource = useCallback(async (source: string) => {
    if (!confirm(`确定要删除来源「${source}」的所有题目吗？此操作不可撤销。`)) return

    // Get affected modules before deleting
    const allRes = await getQuestions({ source, pageSize: 1000 })
    const affectedModules = [...new Set(allRes.data.map((q) => q.module))]

    await deleteQuestionsBySource(source)
    await removeCustomSource(source)

    // Remove module references from categories
    const { unregisterModuleFromCategories } = await import('@/api/categories')
    const remainingRes = await getQuestions({ pageSize: 1000 })
    const remainingModules = new Set(remainingRes.data.map((q) => q.module))
    for (const mod of affectedModules) {
      if (!remainingModules.has(mod)) {
        await unregisterModuleFromCategories(mod)
      }
    }
    const updated = await getCustomSources()
    setCustomSources(updated)
    invalidateQuestionsCache()
  }, [])

  return {
    tab,
    setTab,
    loading,
    setLoading,
    results,
    setResults,
    customSources,
    setCustomSources,
    fileCategory,
    setFileCategory,
    handleImport,
    handleFiles,
    handlePaste,
    handleRemoveSource,
  }
}
