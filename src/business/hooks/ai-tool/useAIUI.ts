import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBufferedText } from '@/hooks/useBufferedText'
import { requestChatCompletionStream } from '@/lib/aiClient'
import type { ChatCompletionMessage } from '@/lib/aiClient'
import type { AIBaseData } from './useAIBase'

function createInitialValues(tool: AIBaseData['tool']): Record<string, string> {
  if (!tool) return {}
  return Object.fromEntries(tool.fields.map((field) => [field.id, '']))
}

export function useAIUI(base: AIBaseData) {
  const { tool, config } = base
  const abortRef = useRef<AbortController | null>(null)
  const [values, setValues] = useState<Record<string, string>>(() =>
    tool ? createInitialValues(tool) : {},
  )
  const [result, setResult] = useState('')
  const {
    text: streamingText,
    appendText: appendStreamingText,
    resetText: setStreamingText,
  } = useBufferedText()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const displayResult = streamingText || result

  useEffect(() => {
    if (!tool) return
    setValues(createInitialValues(tool))
    setResult('')
    setStreamingText('')
    setError(null)
  }, [setStreamingText, tool])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const missingRequired = useMemo(() => {
    if (!tool) return null
    return tool.fields.find((field) => field.required && !values[field.id]?.trim()) ?? null
  }, [tool, values])

  const aiReady = config.enabled && config.apiKey.trim().length > 0

  const handleChange = useCallback((fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!tool) return
    if (!aiReady) {
      setError('请先在设置中启用 AI 并配置 API Key')
      return
    }
    if (missingRequired) {
      setError(`请填写${missingRequired.label}`)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setGenerating(true)
    setError(null)
    setResult('')
    setStreamingText('')

    const fieldText = tool.fields
      .map((field) => {
        const value = values[field.id]?.trim()
        return `## ${field.label}\n${value || '未提供'}`
      })
      .join('\n\n')

    const messages: ChatCompletionMessage[] = [
      {
        role: 'system',
        content:
          '你是一个中文技术面试教练。回答要具体、可执行、适合真实面试复盘，不要写空泛套话。输出 Markdown。',
      },
      {
        role: 'user',
        content: `请完成工具「${tool.title}」。\n\n${fieldText}\n\n## 输出要求\n${tool.outputGuide.trim()}`,
      },
    ]

    try {
      const markdown = await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.75, Math.max(0.25, config.temperature)),
          maxTokens: Math.max(1800, Math.min(config.maxTokens, 3200)),
          provider: config.provider,
        },
        messages,
        signal: controller.signal,
        onDelta: appendStreamingText,
      })
      setResult(markdown)
      setStreamingText('')
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setGenerating(false)
    }
  }, [aiReady, appendStreamingText, config, missingRequired, setStreamingText, tool, values])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setGenerating(false)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!displayResult) return
    await navigator.clipboard.writeText(displayResult)
  }, [displayResult])

  return {
    values,
    result,
    streamingText,
    displayResult,
    generating,
    error,
    settingsOpen,
    missingRequired,
    aiReady,
    handleChange,
    handleGenerate,
    handleStop,
    handleCopy,
    setSettingsOpen,
    setError,
  }
}
