import { useCallback, useEffect, useState } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { type ChatCompletionMessage, requestChatCompletionStream } from '@/lib/aiClient'
import { getMockInterviews, getQuestions, putMockInterview, deleteMockInterview } from '@/api'
import { useAIStore } from '@/store/useAIStore'
import type { MockInterviewSession, Question } from '@/types'

export function useMockBase(options?: { onFinalTranscript?: (text: string) => void }) {
  const { config } = useAIStore()
  const [questions, setQuestions] = useState<Question[]>([])
  const [sessions, setSessions] = useState<MockInterviewSession[]>([])

  const aiReady = config.enabled && config.apiKey.trim().length > 0

  const loadSessions = useCallback(async () => {
    const loaded = await getMockInterviews()
    setSessions(loaded)
  }, [])

  useEffect(() => {
    loadSessions()
    getQuestions({ pageSize: 1000 }).then((res) => setQuestions(res.data))
  }, [loadSessions])

  const requestAI = useCallback(
    async (
      messages: ChatCompletionMessage[],
      onDelta: (delta: string) => void,
      maxTokens = 1800,
    ) => {
      if (!config.enabled) throw new Error('请先在设置中启用 AI 功能')
      if (!config.apiKey.trim()) throw new Error('请先在设置中配置 API Key')
      return requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: Math.min(0.8, Math.max(0.3, config.temperature)),
          maxTokens,
          provider: config.provider,
        },
        messages,
        onDelta,
      })
    },
    [config],
  )

  const saveSession = useCallback(async (session: MockInterviewSession) => {
    const next = { ...session, updatedAt: Date.now() }
    await putMockInterview(next.id, next)
    setSessions((prev) =>
      [next, ...prev.filter((item) => item.id !== next.id)].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      ),
    )
    return next
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteMockInterview(sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }, [])

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinalTranscript: options?.onFinalTranscript ?? (() => {}),
  })

  return {
    config,
    aiReady,
    questions,
    sessions,
    loadSessions,
    requestAI,
    saveSession,
    deleteSession,
    speech,
  }
}
