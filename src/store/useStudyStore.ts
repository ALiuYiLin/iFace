import { useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from './hooks'
import {
  initStudy, setStatus as setStatusThunk, deleteRecord, resetAllRecords,
  clearSessionReview as rtClearSessionReview,
  setTheme, toggleTheme, setStudyMode, setAnswerNavigationMode,
  setMobileQuestionNavEnabled, setAiFabVisible, incrementStreak,
  resetStreak, setDailyGoal, setHiddenCategories, toggleCategoryVisibility,
} from './slices/studySlice'
import type { StudyRecord, StudyStatus } from '@/types'

export interface StreakData {
  currentStreak: number
  bestStreak: number
  todayCount: number
  lastActivityDate: string
}

export type StudyMode = 'answer-first' | 'answer-alongside' | 'memory-only'
export type AnswerNavigationMode = 'answer' | 'check'

export const DAILY_GOAL_MIN = 5
export const DAILY_GOAL_MAX = 50
export const DAILY_GOAL_DEFAULT = 10

export function clearSessionReview(questionId: string) { rtClearSessionReview(questionId) }

const sessionReviewed = new Set<string>()

export function useStudyStore() {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s) => s.study)

  useEffect(() => { if (!state.initialized) dispatch(initStudy()) }, [dispatch, state.initialized])

  const hiddenCategories = useMemo(() => new Set(state.hiddenCategories), [state.hiddenCategories])

  const getStatus = useCallback((id: string): StudyStatus => state.records[id]?.status ?? 'unlearned', [state.records])
  const getRecord = useCallback((id: string): StudyRecord | undefined => state.records[id], [state.records])

  const statusCounts = useMemo(() => {
    const c = { unlearned: 0, mastered: 0, review: 0 }
    for (const r of Object.values(state.records)) c[r.status]++
    return c
  }, [state.records])

  const getStatusCounts = useCallback((ids?: string[]) => {
    if (!ids) return statusCounts
    const c = { unlearned: 0, mastered: 0, review: 0 }
    for (const id of ids) { c[state.records[id]?.status ?? 'unlearned']++ }
    return c
  }, [state.records, statusCounts])

  const getWeakQuestions = useCallback((): StudyRecord[] =>
    Object.values(state.records).filter((r) => r.status === 'review').sort((a, b) => a.lastUpdated - b.lastUpdated),
  [state.records])

  const getEstimatedDays = useCallback((total: number, daily = 10): number => {
    const mastered = Object.values(state.records).filter((r) => r.status === 'mastered').length
    const remaining = total - mastered
    return remaining <= 0 ? 0 : Math.ceil(remaining / daily)
  }, [state.records])

  const setStatus = useCallback(async (id: string, status: StudyStatus) => {
    const existing = state.records[id]
    const alreadyCounted = sessionReviewed.has(id)
    let reviewCount = existing?.reviewCount ?? 0
    if (status === 'review' && !alreadyCounted) { reviewCount++; sessionReviewed.add(id) }
    await dispatch(setStatusThunk({ questionId: id, status, reviewCount })).unwrap()
  }, [dispatch, state.records])

  return {
    records: state.records,
    theme: state.theme,
    studyMode: state.studyMode,
    answerNavigationMode: state.answerNavigationMode,
    mobileQuestionNavEnabled: state.mobileQuestionNavEnabled,
    aiFabVisible: state.aiFabVisible,
    streak: state.streak,
    dailyGoal: state.dailyGoal,
    hiddenCategories,
    initialized: state.initialized,
    statusCounts,
    setStatus,
    clearRecord: (id: string) => { dispatch(deleteRecord(id)) },
    resetAll: () => { dispatch(resetAllRecords()) },
    setTheme: (t: 'light' | 'dark') => dispatch(setTheme(t)),
    toggleTheme: () => dispatch(toggleTheme()),
    setStudyMode: (m: StudyMode) => dispatch(setStudyMode(m)),
    setAnswerNavigationMode: (m: AnswerNavigationMode) => dispatch(setAnswerNavigationMode(m)),
    setMobileQuestionNavEnabled: (v: boolean) => dispatch(setMobileQuestionNavEnabled(v)),
    setAiFabVisible: (v: boolean) => dispatch(setAiFabVisible(v)),
    setDailyGoal: (n: number) => dispatch(setDailyGoal(n)),
    setHiddenCategories: (cats: string[]) => dispatch(setHiddenCategories(cats)),
    toggleCategoryVisibility: (key: string) => dispatch(toggleCategoryVisibility(key)),
    isCategoryHidden: (name: string) => hiddenCategories.has(name),
    incrementStreak: () => dispatch(incrementStreak()),
    resetStreak: () => dispatch(resetStreak()),
    getStatus,
    getRecord,
    getStatusCounts,
    getWeakQuestions,
    getEstimatedDays,
  }
}
