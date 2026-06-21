import { useCallback, useEffect, useRef, useState } from 'react'
import { useBufferedText } from '@/hooks/useBufferedText'
import { requestChatCompletionStream } from '@/lib/aiClient'
import type { ChatCompletionMessage } from '@/lib/aiClient'
import { getJdMatchReports, putJdMatchReport, deleteJdMatchReport } from '@/api'
import { parseResumeFile } from '@/lib/resumeParser'
import type { JdMatchReport } from '@/types'
import type { JdMatchBaseData } from './useJdMatchBase'

const DEFAULT_ROLE = '前端工程师'

const REPORT_SECTION_TITLES = new Set([
  '总体判断',
  '匹配点',
  '风险点',
  '缺失关键词',
  '可能追问',
  '准备建议',
])

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '未保存'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function extractGeneratedTitle(markdown: string, roleTitle: string): string {
  const titleLine = markdown.split('\n').find(isGeneratedTitleLine)
  const title = titleLine ? normalizeGeneratedTitle(titleLine) : ''
  if (title) return title.slice(0, 32)
  return `${roleTitle || DEFAULT_ROLE} · JD 诊断`
}

function stripGeneratedTitle(markdown: string): string {
  const lines = markdown.split('\n')
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0)
  if (firstContentIndex === -1 || !isGeneratedTitleLine(lines[firstContentIndex])) {
    return markdown.trim()
  }
  return [...lines.slice(0, firstContentIndex), ...lines.slice(firstContentIndex + 1)]
    .join('\n')
    .trim()
}

function isGeneratedTitleLine(line: string): boolean {
  const trimmed = line.trim()
  const cleaned = normalizeGeneratedTitle(trimmed)
  if (!cleaned) return false
  if (/^#{0,6}\s*\*{0,2}标题[:：]/.test(trimmed)) return true
  return /^#{1,6}\s+/.test(trimmed) && !REPORT_SECTION_TITLES.has(cleaned)
}

function normalizeGeneratedTitle(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/^标题[:：]\s*/, '')
    .replace(/[*#`]/g, '')
    .trim()
}

function buildMessages(input: { roleTitle: string; jdText: string; resumeText: string }): ChatCompletionMessage[] {
  return [
    {
      role: 'system',
      content: `你是 iFace 的中文技术招聘顾问，负责做简历与岗位 JD 的面试前匹配诊断。
要求：
- 只基于用户提供的 JD 和简历判断，不要编造候选人经历。
- 结论要具体，可直接用于准备面试。
- 语气克制、专业，不要写客套话。
- 风险点要指出面试中可能被质疑的原因。
- 追问要像真实面试官会问的问题。`,
    },
    {
      role: 'user',
      content: `请诊断下面候选人与目标岗位的匹配度。

目标岗位：${input.roleTitle || DEFAULT_ROLE}

请用 Markdown 输出，并严格包含这些部分：
标题：用 12 个字以内生成本次诊断标题

## 总体判断
给出 1 段结论，并给出 0-100 的匹配分。

## 匹配点
列出 4-6 条，说明 JD 需求与简历证据如何对应。

## 风险点
列出 3-5 条，说明哪些地方可能被面试官追问或质疑。

## 缺失关键词
列出简历里缺少或不够突出的 JD 关键词，并说明是否需要补充。

## 可能追问
列出 6-8 个真实面试追问，优先围绕项目真实性、技术深度、岗位关键要求。

## 准备建议
给出 3-5 条下一步准备动作。

<JD>
${input.jdText}
</JD>

<简历>
${input.resumeText}
</简历>`,
    },
  ]
}

export function useJdMatchUI(base: JdMatchBaseData) {
  const { config, aiReady } = base
  const fileRef = useRef<HTMLInputElement>(null)
  const [roleTitle, setRoleTitle] = useState(DEFAULT_ROLE)
  const [jdText, setJdText] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [resumeFileName, setResumeFileName] = useState<string | null>(null)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [savedReports, setSavedReports] = useState<JdMatchReport[]>([])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const { text: streamingText, appendText: appendStreamingText, resetText: setStreamingText } = useBufferedText()
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [parsingResume, setParsingResume] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const displayReport = streamingText || report

  const loadReports = useCallback(async () => {
    const loaded = await getJdMatchReports()
    setSavedReports(loaded)
  }, [])

  useEffect(() => { loadReports() }, [loadReports])

  const handleResumeFile = useCallback(async (file: File) => {
    setParsingResume(true)
    setResumeMessage(null)
    setError(null)
    try {
      const parsed = await parseResumeFile(file)
      setResumeText(parsed.text)
      setResumeFileName(parsed.fileName)
      setResumeMessage(parsed.warning ?? `已解析 ${parsed.fileName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '简历解析失败')
    } finally {
      setParsingResume(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!aiReady) { setError('请先在设置中启用 AI 并配置 API Key'); return }
    if (!jdText.trim()) { setError('请粘贴岗位 JD'); return }
    if (!resumeText.trim()) { setError('请上传或粘贴简历文本'); return }

    setAnalyzing(true)
    setError(null)
    setReport('')
    setStreamingText('')

    try {
      const result = await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey, baseUrl: config.baseUrl, model: config.model,
          temperature: Math.min(0.7, Math.max(0.2, config.temperature)), maxTokens: 2400, provider: config.provider,
        },
        messages: buildMessages({ roleTitle: roleTitle.trim() || DEFAULT_ROLE, jdText: jdText.trim(), resumeText: resumeText.trim() }),
        onDelta: appendStreamingText,
      })
      const markdown = stripGeneratedTitle(result)
      const now = Date.now()
      const nextReport: JdMatchReport = {
        id: crypto.randomUUID(),
        title: extractGeneratedTitle(result, roleTitle.trim() || DEFAULT_ROLE),
        roleTitle: roleTitle.trim() || DEFAULT_ROLE,
        jdText: jdText.trim(),
        resumeText: resumeText.trim(),
        resumeFileName: resumeFileName ?? undefined,
        markdown,
        model: config.model,
        createdAt: now,
        updatedAt: now,
      }

      await putJdMatchReport(nextReport.id, nextReport)
      setSavedReports((prev) => [nextReport, ...prev].sort((a, b) => b.updatedAt - a.updatedAt))
      setActiveReportId(nextReport.id)
      setReport(markdown)
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成诊断失败')
    } finally {
      setAnalyzing(false)
    }
  }, [aiReady, appendStreamingText, config, jdText, resumeFileName, resumeText, roleTitle, setStreamingText])

  const handleSelectReport = useCallback((item: JdMatchReport) => {
    setRoleTitle(item.roleTitle)
    setJdText(item.jdText)
    setResumeText(item.resumeText)
    setResumeFileName(item.resumeFileName ?? null)
    setResumeMessage(null)
    setReport(item.markdown)
    setStreamingText('')
    setError(null)
    setActiveReportId(item.id)
  }, [setStreamingText])

  const handleDeleteReport = useCallback(async (id: string) => {
    await deleteJdMatchReport(id)
    setSavedReports((prev) => prev.filter((item) => item.id !== id))
    if (activeReportId === id) { setActiveReportId(null); setReport('') }
  }, [activeReportId])

  const handleNewDiagnosis = useCallback(() => {
    setRoleTitle(DEFAULT_ROLE); setJdText(''); setResumeText('')
    setResumeFileName(null); setResumeMessage(null); setReport('')
    setStreamingText(''); setError(null); setActiveReportId(null)
  }, [setStreamingText])

  const handleCopyReport = useCallback(async () => {
    if (!displayReport) return
    await navigator.clipboard.writeText(displayReport)
  }, [displayReport])

  return {
    fileRef, roleTitle, jdText, resumeText, resumeFileName, resumeMessage,
    report, savedReports, activeReportId, streamingText, displayReport,
    error, settingsOpen, parsingResume, analyzing,
    setRoleTitle, setJdText, setResumeText, setResumeFileName, setResumeMessage,
    setSettingsOpen, setError,
    handleResumeFile, handleAnalyze, handleSelectReport, handleDeleteReport,
    handleNewDiagnosis, handleCopyReport,
  }
}
