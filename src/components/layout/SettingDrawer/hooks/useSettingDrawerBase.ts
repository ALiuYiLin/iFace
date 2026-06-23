import { useCallback, useEffect, useRef, useState } from 'react'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import {
  bulkPutJdMatchReports,
  bulkPutMockInterviews,
  bulkPutQuestionAnswerAnnotations,
  bulkPutQuestionAnswerOverrides,
  bulkPutQuestionFlags,
  bulkPutQuestionNotes,
  bulkPutQuestions,
  bulkPutStudyRecords,
  type CategoryMap,
  DEFAULT_CATEGORY_MAP,
  exportAllData,
  getAllJdMatchReports,
  getAllMockInterviews,
  getAllQuestionAnswerAnnotations,
  getAllQuestionAnswerOverrides,
  getAllQuestionFlags,
  getAllQuestionNotes,
  getAllQuestions,
  getAllStudyRecords,
  getCategoryMap,
  getCustomSources,
  META_KEYS,
  resetDatabase,
  saveCategoryMap,
  setMeta,
} from '@/api/compat'
import type { SyncResult } from '@/lib/gistSync'
import { deleteBackupGist, pullFromGist, pushToGist } from '@/lib/gistSync'
import {
  countMergedAISessions,
  type ImportImpactItem,
  type ImportPreview,
  mergeCategoryMaps,
  parseImportPreview,
} from '@/lib/localBackup'
import { buildChatCompletionsBody } from '@/lib/aiClient'
import type { AIConfig, AISession } from '@/store/useAIStore'
import {
  buildChatCompletionsUrl,
  DEFAULT_AI_CONFIG,
  getAIProviderPreset,
  useAIStore,
} from '@/store/useAIStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useStudyStore } from '@/store/useStudyStore'

export type SettingDrawerTab = 'ai' | 'study' | 'data' | 'sync'

export interface DataStats {
  questions: number
  records: number
  notes: number
  answerAnnotations: number
  answerOverrides: number
  starred: number
  aiSessions: number
  mockInterviews: number
  jdMatchReports: number
}

export interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
}

export interface TestResultState {
  ok: boolean
  message: string
}

export interface SyncResultState {
  ok: boolean
  message: string
  at?: string
}

export interface SettingDrawerBaseData {
  tab: SettingDrawerTab
  setTab: (t: SettingDrawerTab) => void
  open: boolean
  onClose: () => void
  localConfig: AIConfig
  customModel: string
  customBaseUrl: string
  isDirty: boolean
  saved: boolean
  toast: ToastState | null
  confirmReset: 'records' | 'all' | null
  dataStats: DataStats | null
  importing: boolean
  importPreview: ImportPreview | null
  exporting: boolean
  testing: boolean
  testResult: TestResultState | null
  syncPushing: boolean
  syncPulling: boolean
  syncDeleting: boolean
  setSyncPushing: (v: boolean) => void
  setSyncPulling: (v: boolean) => void
  setSyncDeleting: (v: boolean) => void
  lastSyncResult: SyncResultState | null
  autoSynced: boolean
  categoryMap: CategoryMap
  importRef: React.RefObject<HTMLInputElement | null>
  drawerRef: React.RefObject<HTMLDivElement | null>
  setCustomModel: (v: string) => void
  setCustomBaseUrl: (v: string) => void
  setImportPreview: (v: ImportPreview | null) => void
  setConfirmReset: (v: 'records' | 'all' | null) => void
  setTestResult: (v: TestResultState | null) => void
  setLastSyncResult: (v: SyncResultState | null) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  patch: (partial: Partial<AIConfig>) => void
  handleSave: () => void
  handleReset: () => void
  handleTest: () => Promise<void>
  handleExport: () => Promise<void>
  handleImport: (file: File) => Promise<void>
  handleConfirmImport: () => Promise<void>
  handleResetConfirm: () => Promise<void>
  sessions: Record<string, AISession>
}

function countImportImpact<T>(
  incoming: T[],
  existingIds: Set<string>,
  getId: (item: T) => string,
): ImportImpactItem {
  return incoming.reduce<ImportImpactItem>(
    (acc, item) => {
      if (existingIds.has(getId(item))) {
        acc.overwritten++
      } else {
        acc.created++
      }
      return acc
    },
    { created: 0, overwritten: 0 },
  )
}

async function withImportImpact(
  preview: ImportPreview,
  existingAISessions: Record<string, AISession>,
): Promise<ImportPreview> {
  const [
    questions,
    records,
    notes,
    answerAnnotations,
    answerOverrides,
    flags,
    mockInterviews,
    jdMatchReports,
  ] = await Promise.all([
    getAllQuestions(),
    getAllStudyRecords(),
    getAllQuestionNotes(),
    getAllQuestionAnswerAnnotations(),
    getAllQuestionAnswerOverrides(),
    getAllQuestionFlags(),
    getAllMockInterviews(),
    getAllJdMatchReports(),
  ])

  return {
    ...preview,
    impact: {
      questions: countImportImpact(
        preview.questions,
        new Set(questions.map((question) => question.id)),
        (question) => question.id,
      ),
      studyRecords: countImportImpact(
        preview.studyRecords,
        new Set(records.map((record) => record.questionId)),
        (record) => record.questionId,
      ),
      questionNotes: countImportImpact(
        preview.questionNotes,
        new Set(notes.map((note) => note.questionId)),
        (note) => note.questionId,
      ),
      questionAnswerAnnotations: countImportImpact(
        preview.questionAnswerAnnotations,
        new Set(answerAnnotations.map((annotation) => annotation.id)),
        (annotation) => annotation.id,
      ),
      questionAnswerOverrides: countImportImpact(
        preview.questionAnswerOverrides,
        new Set(answerOverrides.map((override) => override.questionId)),
        (override) => override.questionId,
      ),
      questionFlags: countImportImpact(
        preview.questionFlags,
        new Set(flags.map((flag) => flag.questionId)),
        (flag) => flag.questionId,
      ),
      aiSessions: countImportImpact(
        preview.aiSessions,
        new Set(Object.keys(existingAISessions)),
        (session) => session.questionId,
      ),
      mockInterviews: countImportImpact(
        preview.mockInterviews,
        new Set(mockInterviews.map((session) => session.id)),
        (session) => session.id,
      ),
      jdMatchReports: countImportImpact(
        preview.jdMatchReports,
        new Set(jdMatchReports.map((report) => report.id)),
        (report) => report.id,
      ),
    },
  }
}

function formatRemoteMergeSummary(result: SyncResult): string {
  const parts = [
    result.mergedRemoteRecordCount
      ? `${result.mergedRemoteRecordCount.toLocaleString()} 条学习记录`
      : null,
    result.mergedRemoteNoteCount ? `${result.mergedRemoteNoteCount.toLocaleString()} 条笔记` : null,
    result.mergedRemoteAnswerAnnotationCount
      ? `${result.mergedRemoteAnswerAnnotationCount.toLocaleString()} 个答案标注`
      : null,
    result.mergedRemoteQuestionFlagCount
      ? `${result.mergedRemoteQuestionFlagCount.toLocaleString()} 个重点标记`
      : null,
    result.mergedRemoteAISessionCount
      ? `${result.mergedRemoteAISessionCount.toLocaleString()} 个 AI 会话`
      : null,
    result.mergedRemoteQuestionCount
      ? `${result.mergedRemoteQuestionCount.toLocaleString()} 道自定义题`
      : null,
    result.mergedRemoteSourceCount
      ? `${result.mergedRemoteSourceCount.toLocaleString()} 个来源`
      : null,
    result.mergedRemoteCategoryCount
      ? `${result.mergedRemoteCategoryCount.toLocaleString()} 个分类`
      : null,
  ].filter(Boolean)

  return parts.length > 0 ? `，并保留云端较新的 ${parts.join('、')}` : ''
}

export function useSettingDrawerBase(open: boolean, onClose: () => void): SettingDrawerBaseData {
  const { config, sessions, updateConfig, resetConfig, clearAllSessions, upsertSessions } =
    useAIStore()
  const {
    resetAll,
    studyMode,
    setStudyMode,
    answerNavigationMode,
    setAnswerNavigationMode,
    mobileQuestionNavEnabled,
    setMobileQuestionNavEnabled,
    aiFabVisible,
    setAiFabVisible,
    streak,
    resetStreak,
    dailyGoal,
    setDailyGoal,
    hiddenCategories,
    toggleCategoryVisibility,
  } = useStudyStore()
  const { token, user, isLoggedIn, loading: authLoading, login, logout } = useAuthStore()

  const [tab, setTab] = useState<SettingDrawerTab>('ai')
  const [localConfig, setLocalConfig] = useState<AIConfig>({ ...config })
  const [customModel, setCustomModel] = useState('')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmReset, setConfirmReset] = useState<'records' | 'all' | null>(null)
  const [dataStats, setDataStats] = useState<DataStats | null>(null)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [exporting, setExporting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResultState | null>(null)
  const [syncPushing, setSyncPushing] = useState(false)
  const [syncPulling, setSyncPulling] = useState(false)
  const [syncDeleting, setSyncDeleting] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResultState | null>(null)
  const [autoSynced, setAutoSynced] = useState(false)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  const importRef = useRef<HTMLInputElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      getCategoryMap().then(setCategoryMap)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setLocalConfig({ ...config })
      setIsDirty(false)
      setSaved(false)
    }
  }, [open, config])

  useEffect(() => {
    if (open && tab === 'data') {
      Promise.all([
        getAllQuestions(),
        getAllStudyRecords(),
        getAllQuestionNotes(),
        getAllQuestionAnswerAnnotations(),
        getAllQuestionAnswerOverrides(),
        getAllQuestionFlags(),
        getAllMockInterviews(),
        getAllJdMatchReports(),
      ]).then(
        ([
          questions,
          records,
          notes,
          answerAnnotations,
          answerOverrides,
          flags,
          mockInterviews,
          jdMatchReports,
        ]) => {
          setDataStats({
            questions: questions.length,
            records: records.length,
            notes: notes.length,
            answerAnnotations: answerAnnotations.length,
            answerOverrides: answerOverrides.length,
            starred: flags.filter((flag) => flag.starred).length,
            aiSessions: Object.keys(sessions).length,
            mockInterviews: mockInterviews.length,
            jdMatchReports: jdMatchReports.length,
          })
        },
      )
    }
  }, [open, sessions, tab])

  useEffect(() => {
    if (!isLoggedIn || !token || autoSynced) return

    ;(async () => {
      setAutoSynced(true)
      try {
        const result = await pullFromGist(token, Object.values(sessions))
        if (result === null) return
        if (result.ok) {
          invalidateQuestionsCache()
          if (result.aiSessions?.length) {
            upsertSessions(result.aiSessions)
          }
          setLastSyncResult({
            ok: true,
            message: `已自动同步 ${result.recordCount ?? 0} 条学习记录、${result.questionCount ?? 0} 道自定义题目、${result.noteCount ?? 0} 条笔记、${result.answerAnnotationCount ?? 0} 个答案标注、${result.questionFlagCount ?? 0} 个重点题、${result.aiSessionCount ?? 0} 个 AI 会话${formatRemoteMergeSummary(result)}`,
            at: result.exportedAt,
          })
        } else {
          setLastSyncResult({
            ok: false,
            message: `自动同步失败：${result.error ?? '未知错误'}`,
          })
        }
      } catch (err) {
        setLastSyncResult({
          ok: false,
          message: `自动同步失败：${err instanceof Error ? err.message : String(err)}`,
        })
      }
    })()
  }, [isLoggedIn, token, autoSynced, sessions, upsertSessions])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const frame = window.requestAnimationFrame(() => {
      drawerRef.current?.focus({ preventScroll: true })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      const elementToRestore = lastFocusedElementRef.current
      if (elementToRestore?.isConnected) {
        elementToRestore.focus({ preventScroll: true })
      }
      lastFocusedElementRef.current = null
    }
  }, [open])

  // ── Callbacks ────────────────────────────────────────────────────────────────

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type })
      setTimeout(() => setToast(null), 2800)
    },
    [],
  )

  const patch = useCallback((partial: Partial<AIConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...partial }))
    setIsDirty(true)
    setSaved(false)
  }, [])

  const resolveLocalAIConfig = useCallback(() => {
    const providerId = localConfig.provider ?? 'custom'
    const provider = getAIProviderPreset(providerId)
    const isKnownModel = provider.models.some((model) => model.value === localConfig.model)
    const finalModel = isKnownModel ? localConfig.model : customModel.trim()
    const finalBaseUrl = providerId === 'custom' ? customBaseUrl.trim() : localConfig.baseUrl.trim()

    return {
      ...localConfig,
      provider: providerId,
      model: finalModel,
      baseUrl: finalBaseUrl,
    }
  }, [customBaseUrl, customModel, localConfig])

  const handleSave = useCallback(() => {
    const finalConfig = resolveLocalAIConfig()

    if (!finalConfig.model) {
      showToast('请填写模型名称', 'error')
      return
    }
    if (!finalConfig.baseUrl) {
      showToast('请填写 Base URL', 'error')
      return
    }

    updateConfig(finalConfig)
    setIsDirty(false)
    setSaved(true)
    showToast('设置已保存 ✓')
    setTimeout(() => setSaved(false), 2000)
  }, [resolveLocalAIConfig, updateConfig, showToast])

  const handleReset = useCallback(() => {
    setLocalConfig({ ...DEFAULT_AI_CONFIG })
    setCustomModel('')
    setCustomBaseUrl('')
    resetConfig()
    setIsDirty(false)
    showToast('已恢复默认设置')
  }, [resetConfig, showToast])

  const handleTest = useCallback(async () => {
    const finalConfig = resolveLocalAIConfig()
    const finalModel = finalConfig.model
    const finalBaseUrl = finalConfig.baseUrl
    const apiKey = localConfig.apiKey.trim()

    if (!apiKey) {
      setTestResult({ ok: false, message: '请先填写 API Key' })
      return
    }
    if (!finalBaseUrl) {
      setTestResult({ ok: false, message: '请先填写 Base URL' })
      return
    }
    if (!finalModel) {
      setTestResult({ ok: false, message: '请先填写模型名称' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(buildChatCompletionsUrl(finalBaseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(
          buildChatCompletionsBody(
            { ...finalConfig, model: finalModel, baseUrl: finalBaseUrl, maxTokens: 10 },
            [{ role: 'user', content: 'Hi, reply with exactly: OK' }],
            false,
          ),
        ),
      })

      if (!response.ok) {
        const errText = await response.text()
        let errMsg = `HTTP ${response.status}`
        try {
          const errJson = JSON.parse(errText)
          errMsg = errJson?.error?.message ?? errMsg
        } catch {}
        setTestResult({ ok: false, message: errMsg })
      } else {
        const data = await response.json()
        const reply = data?.choices?.[0]?.message?.content ?? '（无内容）'
        setTestResult({ ok: true, message: `连接成功！模型回复：${reply.slice(0, 60)}` })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '网络错误'
      setTestResult({ ok: false, message: msg })
    } finally {
      setTesting(false)
    }
  }, [localConfig.apiKey, resolveLocalAIConfig])

  // ── Data Actions ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const aiSessions = Object.values(sessions)
      const backup = { ...data, aiSessions }
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `iface-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast(
        `已导出 ${data.questions.length} 题、${data.studyRecords.length} 条记录、${data.questionNotes.length} 条笔记、${data.questionAnswerAnnotations.length} 个答案标注、${data.questionAnswerOverrides.length} 个自定义答案、${data.questionFlags.filter((flag) => flag.starred).length} 个重点题、${aiSessions.length} 个 AI 会话、${data.mockInterviews.length} 场模拟面试、${data.jdMatchReports.length} 份 JD 诊断`,
      )
    } catch {
      showToast('导出失败，请重试', 'error')
    } finally {
      setExporting(false)
    }
  }, [sessions, showToast])

  const handleImport = useCallback(
    async (file: File) => {
      setImporting(true)
      setImportPreview(null)
      try {
        const text = await file.text()
        const preview = parseImportPreview(file.name, text)
        setImportPreview(await withImportImpact(preview, sessions))
        showToast('已解析备份，请确认后导入', 'info')
      } catch (err) {
        const msg = err instanceof Error ? err.message : '文件解析失败'
        showToast(msg, 'error')
      } finally {
        setImporting(false)
        if (importRef.current) importRef.current.value = ''
      }
    },
    [sessions, showToast],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview) return

    setImporting(true)
    try {
      const qCount = importPreview.questions.length
      const rCount = importPreview.studyRecords.length
      const nCount = importPreview.questionNotes.length
      const answerAnnotationCount = importPreview.questionAnswerAnnotations.length
      const answerOverrideCount = importPreview.questionAnswerOverrides.length
      const flagCount = importPreview.questionFlags.length
      const starredCount = importPreview.questionFlags.filter((flag) => flag.starred).length
      const aiCount = importPreview.aiSessions.length
      const mockInterviewCount = importPreview.mockInterviews.length
      const jdMatchReportCount = importPreview.jdMatchReports.length
      const sourceCount = importPreview.customSources.length
      const categoryCount = Object.keys(importPreview.customCategories).length

      if (qCount > 0) {
        await bulkPutQuestions(importPreview.questions)
        invalidateQuestionsCache()
      }

      if (sourceCount > 0) {
        const currentSources = await getCustomSources()
        await setMeta(META_KEYS.CUSTOM_SOURCES, [
          ...new Set([...currentSources, ...importPreview.customSources]),
        ])
      }

      if (categoryCount > 0) {
        const currentMap = await getCategoryMap()
        await saveCategoryMap(mergeCategoryMaps(currentMap, importPreview.customCategories))
      }

      if (rCount > 0) {
        await bulkPutStudyRecords(importPreview.studyRecords)
      }

      if (nCount > 0) {
        await bulkPutQuestionNotes(importPreview.questionNotes)
      }

      if (answerAnnotationCount > 0) {
        await bulkPutQuestionAnswerAnnotations(importPreview.questionAnswerAnnotations)
      }

      if (answerOverrideCount > 0) {
        await bulkPutQuestionAnswerOverrides(importPreview.questionAnswerOverrides)
      }

      if (flagCount > 0) {
        await bulkPutQuestionFlags(importPreview.questionFlags)
      }

      if (aiCount > 0) {
        upsertSessions(importPreview.aiSessions)
      }

      if (mockInterviewCount > 0) {
        await bulkPutMockInterviews(importPreview.mockInterviews)
      }

      if (jdMatchReportCount > 0) {
        await bulkPutJdMatchReports(importPreview.jdMatchReports)
      }

      showToast(
        `导入成功：${qCount} 题、${rCount} 条记录、${nCount} 条笔记、${answerAnnotationCount} 个答案标注、${answerOverrideCount} 个自定义答案、${starredCount} 个重点题、${aiCount} 个 AI 会话、${mockInterviewCount} 场模拟面试、${jdMatchReportCount} 份 JD 诊断、${sourceCount} 个来源、${categoryCount} 个分类`,
      )
      setImportPreview(null)

      const [
        questions,
        records,
        notes,
        answerAnnotations,
        answerOverrides,
        flags,
        mockInterviews,
        jdMatchReports,
      ] = await Promise.all([
        getAllQuestions(),
        getAllStudyRecords(),
        getAllQuestionNotes(),
        getAllQuestionAnswerAnnotations(),
        getAllQuestionAnswerOverrides(),
        getAllQuestionFlags(),
        getAllMockInterviews(),
        getAllJdMatchReports(),
      ])
      setDataStats({
        questions: questions.length,
        records: records.length,
        notes: notes.length,
        answerAnnotations: answerAnnotations.length,
        answerOverrides: answerOverrides.length,
        starred: flags.filter((flag) => flag.starred).length,
        aiSessions: countMergedAISessions(sessions, importPreview.aiSessions),
        mockInterviews: mockInterviews.length,
        jdMatchReports: jdMatchReports.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入失败，请重试'
      showToast(msg, 'error')
    } finally {
      setImporting(false)
    }
  }, [importPreview, sessions, showToast, upsertSessions])

  const handleResetConfirm = useCallback(async () => {
    if (!confirmReset) return
    try {
      if (confirmReset === 'records') {
        await resetAll()
        setDataStats((prev) => (prev ? { ...prev, records: 0 } : prev))
        showToast('学习记录已清空')
      } else {
        await resetDatabase()
        await resetAll()
        clearAllSessions()
        setDataStats({
          questions: 0,
          records: 0,
          notes: 0,
          answerAnnotations: 0,
          answerOverrides: 0,
          starred: 0,
          aiSessions: 0,
          mockInterviews: 0,
          jdMatchReports: 0,
        })
        showToast('所有数据已重置')
      }
    } catch {
      showToast('操作失败，请重试', 'error')
    } finally {
      setConfirmReset(null)
    }
  }, [confirmReset, resetAll, clearAllSessions, showToast])

  return {
    tab,
    setTab,
    open,
    onClose,
    localConfig,
    customModel,
    customBaseUrl,
    isDirty,
    saved,
    toast,
    confirmReset,
    dataStats,
    importing,
    importPreview,
    exporting,
    testing,
    testResult,
    syncPushing,
    syncPulling,
    syncDeleting,
    setSyncPushing,
    setSyncPulling,
    setSyncDeleting,
    lastSyncResult,
    autoSynced,
    categoryMap,
    importRef,
    drawerRef,
    setCustomModel,
    setCustomBaseUrl,
    setImportPreview,
    setConfirmReset,
    setTestResult,
    setLastSyncResult,
    showToast,
    patch,
    handleSave,
    handleReset,
    handleTest,
    handleExport,
    handleImport,
    handleConfirmImport,
    handleResetConfirm,
    sessions,
  }
}
