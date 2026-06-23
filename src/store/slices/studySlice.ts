import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { getStudyRecords, putStudyRecord as apiPutStudyRecord, deleteStudyRecord as apiDeleteStudyRecord, clearStudyRecords } from '@/api'
import type { StudyRecord, StudyRecordMap, StudyStatus } from '@/types'
import type { StreakData, StudyMode, AnswerNavigationMode } from '@/store/useStudyStore'
import { DAILY_GOAL_DEFAULT, DAILY_GOAL_MIN, DAILY_GOAL_MAX } from '@/store/useStudyStore'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STREAK_KEY = 'iface_streak'
const THEME_KEY = 'iface_theme'
const STUDY_MODE_KEY = 'iface_study_mode'
const ANSWER_NAV_KEY = 'iface_answer_navigation_mode'
const MOBILE_NAV_KEY = 'iface_mobile_question_nav_enabled'
const AI_FAB_KEY = 'iface_ai_fab_visible'
const DAILY_GOAL_KEY = 'iface_daily_goal'
const HIDDEN_CATS_KEY = 'iface_hidden_categories'

function loadJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}
function loadStr(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function saveStr(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}
function todayStr(): string { return new Date().toISOString().slice(0, 10) }
function loadTheme(): 'light' | 'dark' {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch { return 'light' }
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// ─── Initial State ───────────────────────────────────────────────────────────

export interface StudyState {
  records: StudyRecordMap
  theme: 'light' | 'dark'
  studyMode: StudyMode
  answerNavigationMode: AnswerNavigationMode
  mobileQuestionNavEnabled: boolean
  aiFabVisible: boolean
  streak: StreakData
  dailyGoal: number
  hiddenCategories: string[]
  initialized: boolean
}

const loadStreak = (): StreakData => {
  const s = loadJSON<StreakData>(STREAK_KEY, { currentStreak: 0, bestStreak: 0, todayCount: 0, lastActivityDate: todayStr() })
  if (s.lastActivityDate !== todayStr()) {
    return { ...s, currentStreak: 0, todayCount: 0, lastActivityDate: todayStr() }
  }
  return s
}

const initialState: StudyState = {
  records: {},
  theme: loadTheme(),
  studyMode: (loadStr(STUDY_MODE_KEY, 'answer-first') as StudyMode),
  answerNavigationMode: (loadStr(ANSWER_NAV_KEY, 'answer') as AnswerNavigationMode),
  mobileQuestionNavEnabled: loadJSON(MOBILE_NAV_KEY, false),
  aiFabVisible: loadJSON(AI_FAB_KEY, true),
  streak: loadStreak(),
  dailyGoal: (() => { try { const n = parseInt(localStorage.getItem(DAILY_GOAL_KEY) ?? '', 10); return !isNaN(n) && n >= DAILY_GOAL_MIN && n <= DAILY_GOAL_MAX ? n : DAILY_GOAL_DEFAULT } catch { return DAILY_GOAL_DEFAULT } })(),
  hiddenCategories: loadJSON(HIDDEN_CATS_KEY, []),
  initialized: false,
}

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const initStudy = createAsyncThunk('study/init', async () => {
  const records = await getStudyRecords()
  const map: StudyRecordMap = {}
  for (const r of records) {
    map[r.question_id] = { questionId: r.question_id, status: r.status as StudyStatus, lastUpdated: r.last_updated, reviewCount: r.review_count }
  }
  return {
    records: map,
    theme: loadTheme(),
    studyMode: loadStr(STUDY_MODE_KEY, 'answer-first') as StudyMode,
    answerNavigationMode: loadStr(ANSWER_NAV_KEY, 'answer') as AnswerNavigationMode,
    mobileQuestionNavEnabled: loadJSON(MOBILE_NAV_KEY, false),
    aiFabVisible: loadJSON(AI_FAB_KEY, true),
    streak: loadStreak(),
    dailyGoal: (() => { try { return parseInt(localStorage.getItem(DAILY_GOAL_KEY) ?? '', 10) || DAILY_GOAL_DEFAULT } catch { return DAILY_GOAL_DEFAULT } })(),
  }
})

export const setStatus = createAsyncThunk('study/setStatus', async ({ questionId, status, reviewCount }: { questionId: string; status: StudyStatus; reviewCount: number }) => {
  await apiPutStudyRecord(questionId, { status, reviewCount, lastUpdated: Date.now() })
  return { questionId, status, lastUpdated: Date.now(), reviewCount }
})

export const deleteRecord = createAsyncThunk('study/deleteRecord', async (questionId: string) => {
  await apiDeleteStudyRecord(questionId)
  return questionId
})

export const resetAllRecords = createAsyncThunk('study/resetAll', async () => {
  await clearStudyRecords()
})

// ─── Slice ───────────────────────────────────────────────────────────────────

const _sessionReviewed = new Set<string>()
export function clearSessionReview(questionId: string) { _sessionReviewed.delete(questionId) }

const studySlice = createSlice({
  name: 'study',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload
      saveStr(THEME_KEY, action.payload)
      applyTheme(action.payload)
    },
    toggleTheme(state) {
      const next = state.theme === 'light' ? 'dark' : 'light'
      state.theme = next
      saveStr(THEME_KEY, next)
      applyTheme(next)
    },
    setStudyMode(state, action: PayloadAction<StudyMode>) {
      state.studyMode = action.payload
      saveStr(STUDY_MODE_KEY, action.payload)
    },
    setAnswerNavigationMode(state, action: PayloadAction<AnswerNavigationMode>) {
      state.answerNavigationMode = action.payload
      saveStr(ANSWER_NAV_KEY, action.payload)
    },
    setMobileQuestionNavEnabled(state, action: PayloadAction<boolean>) {
      state.mobileQuestionNavEnabled = action.payload
      saveJSON(MOBILE_NAV_KEY, action.payload)
    },
    setAiFabVisible(state, action: PayloadAction<boolean>) {
      state.aiFabVisible = action.payload
      saveJSON(AI_FAB_KEY, action.payload)
    },
    incrementStreak(state) {
      const today = todayStr()
      const prev = state.streak
      const currentStreak = prev.lastActivityDate === today ? prev.currentStreak + 1 : 1
      state.streak = {
        currentStreak,
        bestStreak: Math.max(prev.bestStreak, currentStreak),
        todayCount: prev.lastActivityDate === today ? prev.todayCount + 1 : 1,
        lastActivityDate: today,
      }
      saveJSON(STREAK_KEY, state.streak)
    },
    resetStreak(state) {
      state.streak = { currentStreak: 0, bestStreak: state.streak.bestStreak, todayCount: 0, lastActivityDate: todayStr() }
      saveJSON(STREAK_KEY, state.streak)
    },
    setDailyGoal(state, action: PayloadAction<number>) {
      state.dailyGoal = Math.max(DAILY_GOAL_MIN, Math.min(DAILY_GOAL_MAX, Math.round(action.payload)))
      saveStr(DAILY_GOAL_KEY, String(state.dailyGoal))
    },
    setHiddenCategories(state, action: PayloadAction<string[]>) {
      state.hiddenCategories = action.payload
      saveJSON(HIDDEN_CATS_KEY, action.payload)
    },
    toggleCategoryVisibility(state, action: PayloadAction<string>) {
      const key = action.payload
      const next = state.hiddenCategories.includes(key)
        ? state.hiddenCategories.filter((c) => c !== key)
        : [...state.hiddenCategories, key]
      state.hiddenCategories = next
      saveJSON(HIDDEN_CATS_KEY, next)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initStudy.fulfilled, (state, action) => {
      Object.assign(state, action.payload, { initialized: true })
    })
    builder.addCase(setStatus.fulfilled, (state, action) => {
      const { questionId, status, lastUpdated, reviewCount } = action.payload
      state.records[questionId] = { questionId, status, lastUpdated, reviewCount }
    })
    builder.addCase(deleteRecord.fulfilled, (state, action) => {
      delete state.records[action.payload]
    })
    builder.addCase(resetAllRecords.fulfilled, (state) => {
      state.records = {}
    })
  },
})

export const {
  setTheme, toggleTheme, setStudyMode, setAnswerNavigationMode,
  setMobileQuestionNavEnabled, setAiFabVisible, incrementStreak,
  resetStreak, setDailyGoal, setHiddenCategories, toggleCategoryVisibility,
} = studySlice.actions

export default studySlice.reducer
