import { useCallback, useEffect, useState } from 'react'
import type { CustomImportResult } from '@/lib/questionLoader'
import { importCustomQuestions, isMDFile, parseJSONSafe } from '@/lib/questionLoader'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import {
  deleteQuestionsBySource,
  getActiveModules,
  getAllQuestions,
  getCustomSources,
  removeCustomSource,
  unregisterModuleFromCategories,
} from '@/lib/db'
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

  // Load existing custom sources
  useEffect(() => {
    getCustomSources().then(setCustomSources)
  }, [])

  // ── Import handler ──
  const handleImport = useCallback(
    async (data: unknown, sourceName: string, categoryName: string) => {
      setLoading(true)
      try {
        const result = await importCustomQuestions(data, sourceName, categoryName || undefined)
        setResults((prev) => [result, ...prev])

        if (result.loaded > 0) {
          // Refresh custom sources list
          const updated = await getCustomSources()
          setCustomSources(updated)
          // Invalidate in-memory cache so question list refreshes
          invalidateQuestionsCache()
        }
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  // ── File drop handler ──
  const handleFiles = useCallback(
    async (files: File[], category: string) => {
      setLoading(true)
      for (const file of files) {
        const text = await file.text()

        // Handle .md files: convert via mdToQuestions first
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

        // Handle .json files
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

  // ── Paste handler ──
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

  // ── Remove source ──
  const handleRemoveSource = useCallback(async (source: string) => {
    if (!confirm(`确定要删除来源「${source}」的所有题目吗？此操作不可撤销。`)) return
    // Before deleting, find which modules belong to this source
    const all = await getAllQuestions()
    const affectedModules = [
      ...new Set(
        all
          .filter((q) => q.source === `custom_${source}` || q.source === source)
          .map((q) => q.module),
      ),
    ]
    await deleteQuestionsBySource(source)
    await removeCustomSource(source)
    // Unregister modules that no longer have any questions
    const remaining = await getActiveModules()
    for (const mod of affectedModules) {
      if (!remaining.includes(mod)) {
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
