import { useCallback, useEffect, useRef } from 'react'
import { buildChatCompletionsUrl } from '../lib/aiClient'
import { useAppDispatch, useAppSelector } from './hooks'
import {
  updateConfig as rtUpdateConfig,
  resetConfig as rtResetConfig,
  upsertSessions as rtUpsertSessions,
  updateSession as rtUpdateSession,
  replaceSessionMessages as rtReplaceSessionMessages,
  clearSession as rtClearSession,
  clearAllSessions as rtClearAllSessions,
  setStreaming,
} from './slices/aiSlice'

export interface AIConfig {
  enabled: boolean
  provider: AIProviderId
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AISession {
  questionId: string
  messages: AIMessage[]
  createdAt: number
  updatedAt: number
}

export interface AIQuickAction {
  id: string
  label: string
  icon: string
  prompt: string
}

export interface AnswerFeedbackInput {
  questionText: string
  referenceAnswer: string
  userAnswer: string
}

const STORAGE_KEY = 'iface_ai_config'
const CONFIG_SYNC_EVENT = 'iface_ai_config_updated'

export type AIProviderId = 'openai' | 'deepseek' | 'dashscope' | 'zhipu' | 'custom'
export interface AIModelPreset { value: string; label: string; recommended?: boolean; description?: string }
export interface AIProviderPreset { id: AIProviderId; label: string; shortLabel: string; baseUrl: string; defaultModel: string; models: AIModelPreset[]; apiKeyPlaceholder: string; note?: string }

export const DEFAULT_SYSTEM_PROMPT = `你是 iFace 的技术面试教练，负责帮助用户把面试题答清楚、答准确、答得像真实候选人。`

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  { id: 'openai', label: 'OpenAI', shortLabel: 'OpenAI', baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', models: [
    { value: 'gpt-4o', label: 'GPT-4o', recommended: true, description: 'OpenAI 旗舰模型，综合能力强，适合面试分析' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '轻量版，速度快、成本低，日常够用' },
    { value: 'o3-mini', label: 'o3-mini', description: '推理增强模型，适合复杂逻辑拆解' },
  ], apiKeyPlaceholder: 'sk-...' },
  { id: 'deepseek', label: 'DeepSeek', shortLabel: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', models: [
    { value: 'deepseek-chat', label: 'DeepSeek-V3 Chat', recommended: true },
    { value: 'deepseek-reasoner', label: 'DeepSeek-R1 推理', description: '推理链路可追溯，适合场景追问' },
  ], apiKeyPlaceholder: 'sk-...' },
  { id: 'dashscope', label: '阿里通义千问', shortLabel: '千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-max', models: [
    { value: 'qwen-max', label: 'Qwen-Max', recommended: true },
    { value: 'qwen-plus', label: 'Qwen-Plus', description: '性价比之选' },
    { value: 'qwen-turbo', label: 'Qwen-Turbo', description: '轻量快速' },
  ], apiKeyPlaceholder: 'sk-...' },
  { id: 'zhipu', label: '智谱', shortLabel: '智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4-plus', models: [
    { value: 'glm-4-plus', label: 'GLM-4-Plus', recommended: true },
    { value: 'glm-4-flash', label: 'GLM-4-Flash', description: '免费模型' },
  ], apiKeyPlaceholder: 'your zhipu api key' },
  { id: 'custom', label: '自定义兼容接口', shortLabel: '自定义', baseUrl: '', defaultModel: '', models: [], apiKeyPlaceholder: 'sk-...', note: '输入一个兼容 OpenAI Chat Completions 接口的 API 地址（如 One API / New API / LobeChat 等代理网关）。' },
]

export const PRESET_MODELS = AI_PROVIDER_PRESETS.flatMap((p) => p.models)
export const PRESET_BASE_URLS: Record<string, string> = Object.fromEntries(
  AI_PROVIDER_PRESETS.filter((p) => p.id !== 'custom').map((p) => [p.id, p.baseUrl]),
)

export { buildChatCompletionsUrl }

export function getAIProviderPreset(providerId: AIProviderId): AIProviderPreset {
  return AI_PROVIDER_PRESETS.find((p) => p.id === providerId) ?? AI_PROVIDER_PRESETS[4]
}

export function buildSystemPrompt(customPrompt?: string): string { return customPrompt?.trim() || DEFAULT_SYSTEM_PROMPT }

export function buildQuestionSystemSuffix(question: { question: string; answer?: string }): string {
  return `\n\n当前题目：\n${question.question}\n\n参考答案：\n${question.answer ?? ''}`
}

export function buildQuestionContext(question: { question: string; answer: string; id: string; module: string; difficulty: number; tags: string[] }, difficulty?: number): string {
  const diffLabel = ['', '初级', '中级', '高级'][difficulty ?? question.difficulty] ?? '未知'
  return `题目：${question.question}\n难度：${diffLabel}\n分类：${question.module}`
}

export function buildAnswerFeedbackSystemSuffix(): string {
  return `你是一个严格的面试官，请对以下候选人的回答进行点评。请按以下维度评分和反馈：\n1. 知识点准确性\n2. 结构完整性\n3. 表达流畅度\n4. 深度与延展\n5. 改进建议`
}

export function buildAnswerFeedbackContext(input: AnswerFeedbackInput): string {
  return `题目：${input.questionText}\n参考答案：${input.referenceAnswer}\n候选人的回答：${input.userAnswer}`
}

export function getAIQuickActions(hasAnswer: boolean): AIQuickAction[] {
  const baseActions: AIQuickAction[] = [
    { id: 'analysis', label: '考点分析', icon: '🎯', prompt: '请分析这道题的核心考察点和面试官的考查意图。' },
    { id: 'structure', label: '答题结构', icon: '📋', prompt: '请给出一个适合口述的答题结构框架，要求逻辑清晰、层次分明。' },
    { id: 'followup', label: '追问预测', icon: '🔍', prompt: '作为面试官，你会对这道题进行哪些追问？请列出可能的追问方向。' },
  ]
  if (hasAnswer) baseActions.push({ id: 'evaluate', label: '我的回答', icon: '✍️', prompt: '请对我的回答进行点评，指出优点和不足，并给出改进建议。' })
  return baseActions
}

let abortRef: { current: AbortController | null } = { current: null }

export function useAIStore() {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s) => s.ai)

  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleCustomSync = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : null
      if (next) dispatch(rtUpdateConfig(next))
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        try { const v = JSON.parse(event.newValue ?? ''); if (v) dispatch(rtUpdateConfig(v)) }
        catch { /* ignore */ }
      }
    }
    window.addEventListener(CONFIG_SYNC_EVENT, handleCustomSync)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(CONFIG_SYNC_EVENT, handleCustomSync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [dispatch])

  const updateConfig = useCallback((patch: Partial<AIConfig>) => {
    dispatch(rtUpdateConfig(patch))
    window.dispatchEvent(new CustomEvent(CONFIG_SYNC_EVENT, { detail: patch }))
  }, [dispatch])

  const resetConfig = useCallback(() => {
    dispatch(rtResetConfig())
    window.dispatchEvent(new CustomEvent(CONFIG_SYNC_EVENT, { detail: DEFAULT_AI_CONFIG }))
  }, [dispatch])

  const getSession = useCallback((questionId: string): AISession | undefined => stateRef.current.sessions[questionId], [])
  const getMessages = useCallback((questionId: string): AIMessage[] => stateRef.current.sessions[questionId]?.messages ?? [], [])
  const clearSession = useCallback((questionId: string) => dispatch(rtClearSession(questionId)), [dispatch])
  const replaceSessionMessages = useCallback((questionId: string, messages: AIMessage[]) => dispatch(rtReplaceSessionMessages({ questionId, messages })), [dispatch])
  const clearAllSessions = useCallback(() => dispatch(rtClearAllSessions()), [dispatch])
  const upsertSessions = useCallback((sessions: AISession[]) => dispatch(rtUpsertSessions(sessions)), [dispatch])

  const abortStream = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; dispatch(setStreaming({ streaming: false })) }, [dispatch])

  const sendMessage = useCallback(async (questionId: string, messages: AIMessage[], systemPrompt: string) => {
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    const sid = `${questionId}_${Date.now()}`
    dispatch(setStreaming({ streaming: true, questionId: sid }))
    try {
      let fullText = ''
      const { requestChatCompletionStream } = await import('../lib/aiClient')
      await requestChatCompletionStream({
        config: { ...stateRef.current.config, systemPrompt } as any,
        messages,
        onDelta: (chunk) => { if (!signal.aborted) fullText += chunk },
        signal,
      })
      if (!signal.aborted) {
        const assistantMsg: AIMessage = { role: 'assistant', content: fullText || '(empty response)' }
        dispatch(rtUpdateSession({ questionId, message: assistantMsg }))
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal.aborted) return
      const errorMsg: AIMessage = { role: 'assistant', content: `请求失败：${err?.message ?? '未知错误'}` }
      dispatch(rtUpdateSession({ questionId, message: errorMsg }))
    } finally {
      if (!signal.aborted) { abortRef.current = null; dispatch(setStreaming({ streaming: false })) }
    }
  }, [dispatch])

  const getQuickActions = useCallback(getAIQuickActions, [])

  return {
    config: state.config as AIConfig,
    sessions: state.sessions,
    streaming: state.streaming,
    streamingQuestionId: state.streamingQuestionId,
    updateConfig,
    resetConfig,
    getSession,
    getMessages,
    clearSession,
    replaceSessionMessages,
    clearAllSessions,
    upsertSessions,
    sendMessage,
    abortStream,
    getQuickActions,
  }
}
