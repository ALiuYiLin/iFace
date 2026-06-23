import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AIConfig, AISession, AIMessage } from '@/store/useAIStore'
import { DEFAULT_AI_CONFIG } from '@/store/useAIStore'

const STORAGE_KEY = 'iface_ai_config'
const SESSIONS_KEY = 'iface_ai_sessions'

function loadConfig(): AIConfig {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? { ...DEFAULT_AI_CONFIG, ...JSON.parse(r) } : { ...DEFAULT_AI_CONFIG } }
  catch { return { ...DEFAULT_AI_CONFIG } }
}
function saveConfig(config: AIConfig) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch {} }

function loadSessions(): Record<string, AISession> {
  try { const r = localStorage.getItem(SESSIONS_KEY); return r ? JSON.parse(r) : {} }
  catch { return {} }
}
function saveSessions(sessions: Record<string, AISession>) { try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)) } catch {} }

export interface AIState {
  config: AIConfig
  sessions: Record<string, AISession>
  streaming: boolean
  streamingQuestionId: string | null
}

const initialState: AIState = {
  config: loadConfig(),
  sessions: loadSessions(),
  streaming: false,
  streamingQuestionId: null,
}

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    updateConfig(state, action: PayloadAction<Partial<AIConfig>>) {
      state.config = { ...state.config, ...action.payload }
      saveConfig(state.config)
    },
    resetConfig(state) {
      state.config = { ...DEFAULT_AI_CONFIG }
      saveConfig(state.config)
    },
    upsertSessions(state, action: PayloadAction<AISession[]>) {
      for (const s of action.payload) {
        state.sessions[s.questionId] = s
      }
      saveSessions(state.sessions)
    },
    updateSession(state, action: PayloadAction<{ questionId: string; message: AIMessage }>) {
      const { questionId, message } = action.payload
      const existing = state.sessions[questionId]
      if (existing) {
        existing.messages = [...existing.messages, message]
        existing.updatedAt = Date.now()
      } else {
        state.sessions[questionId] = { questionId, messages: [message], createdAt: Date.now(), updatedAt: Date.now() }
      }
      saveSessions(state.sessions)
    },
    replaceSessionMessages(state, action: PayloadAction<{ questionId: string; messages: AIMessage[] }>) {
      const { questionId, messages } = action.payload
      if (state.sessions[questionId]) {
        state.sessions[questionId].messages = messages
        state.sessions[questionId].updatedAt = Date.now()
      }
      saveSessions(state.sessions)
    },
    clearSession(state, action: PayloadAction<string>) {
      if (state.sessions[action.payload]) {
        state.sessions[action.payload].messages = []
        state.sessions[action.payload].updatedAt = Date.now()
      }
      saveSessions(state.sessions)
    },
    clearAllSessions(state) {
      state.sessions = {}
      window.dispatchEvent(new CustomEvent('iface_ai_sessions_cleared'))
      saveSessions({})
    },
    setStreaming(state, action: PayloadAction<{ streaming: boolean; questionId?: string | null }>) {
      state.streaming = action.payload.streaming
      state.streamingQuestionId = action.payload.questionId ?? null
    },
  },
})

export const {
  updateConfig, resetConfig, upsertSessions, updateSession,
  replaceSessionMessages, clearSession, clearAllSessions, setStreaming,
} = aiSlice.actions

export default aiSlice.reducer
