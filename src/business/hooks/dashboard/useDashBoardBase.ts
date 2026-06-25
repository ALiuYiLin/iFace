import { useCallback, useEffect, useState } from 'react'
import { useStudyStore } from '@/store/useStudyStore'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchDashboard } from '@/store/pages/dashboardSlice'
import type { CategoryMap, Question, QuestionNote } from '@/api'
import type { StudyStatus } from '@/types'
import type { StreakData } from '@/store/useStudyStore'

export interface DashBoardBaseData {
  allQuestions: Question[]
  loading: boolean
  initializing: boolean
  getDailyIds: (
    recordMap: Record<string, { status: string; lastUpdated: number }>,
    count?: number,
    questionIds?: string[],
  ) => Promise<string[]>
  records: Record<string, { status: StudyStatus; lastUpdated?: number }>
  streak: StreakData
  dailyGoal: number
  hiddenCategories: Set<string>
  categoryMap: CategoryMap
  questionNotes: QuestionNote[]
}

function getDailyRecommendations(
  allIds: string[],
  recordMap: Record<string, { status: string; lastUpdated: number }>,
  count = 10,
): Promise<string[]> {
  const reviewIds = allIds
    .filter((id) => recordMap[id]?.status === 'review')
    .sort((a, b) => (recordMap[a]?.lastUpdated ?? 0) - (recordMap[b]?.lastUpdated ?? 0))
  const unlearnedIds = allIds.filter((id) => !recordMap[id] || recordMap[id].status === 'unlearned')
  const result: string[] = []
  const seen = new Set<string>()
  for (const id of [...reviewIds, ...unlearnedIds]) {
    if (result.length >= count) break
    if (!seen.has(id)) { result.push(id); seen.add(id) }
  }
  return Promise.resolve(result)
}

export function useDashBoardBase(): DashBoardBaseData {
  const dispatch = useAppDispatch()
  const { records, streak, dailyGoal, hiddenCategories } = useStudyStore()
  const { allQuestions, categoryMap, questionNotes: storeNotes, loading } = useAppSelector((s) => s.dashboard)

  const [liveNotes, setLiveNotes] = useState<QuestionNote[]>([])

  const questionNotes = liveNotes.length > 0 ? liveNotes : storeNotes

  useEffect(() => {
    dispatch(fetchDashboard())
  }, [dispatch])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const notes = await import('@/api').then((m) => m.getQuestionNotes())
        if (!cancelled) setLiveNotes(notes)
      } catch { if (!cancelled) setLiveNotes([]) }
    }
    load()
    window.addEventListener('focus', load)
    return () => { cancelled = true; window.removeEventListener('focus', load) }
  }, [])

  const getDailyIds = useCallback(
    async (rm: Record<string, { status: string; lastUpdated: number }>, count = 10, questionIds?: string[]) => {
      const allIds = questionIds ?? allQuestions.map((q) => q.id)
      return getDailyRecommendations(allIds, rm, count)
    },
    [allQuestions],
  )

  return {
    allQuestions,
    loading,
    initializing: loading,
    getDailyIds,
    records,
    streak,
    dailyGoal,
    hiddenCategories,
    categoryMap,
    questionNotes,
  }
}
