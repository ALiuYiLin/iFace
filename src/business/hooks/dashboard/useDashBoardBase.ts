import { useCallback, useEffect, useState } from 'react'
import { usePromise } from '@/hooks/usePromise'
import { useStudyStore } from '@/store/useStudyStore'
import { getCategories, getQuestionNotes, getQuestions } from '@/api'
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
  greeting: string
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
    if (!seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }
  return Promise.resolve(result)
}

export function useDashBoardBase(): DashBoardBaseData {
  const { records, streak, dailyGoal, hiddenCategories } = useStudyStore()

  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})
  const [questionNotes, setQuestionNotes] = useState<QuestionNote[]>([])
  const [greeting, setGreeting] = useState('')
  const [loading, loadQuestions] = usePromise(async () => {
    const res = await getQuestions({ pageSize: 1000 })
    setAllQuestions(res.data)
  })

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    getCategories().then(setCategoryMap).catch(() => setCategoryMap({}))
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const notes = await getQuestionNotes()
        if (!cancelled) setQuestionNotes(notes)
      } catch {
        if (!cancelled) setQuestionNotes([])
      }
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
    }
  }, [])

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 6) setGreeting('夜深了，注意休息')
    else if (h < 10) setGreeting('早上好，开始今天的备战')
    else if (h < 13) setGreeting('上午好，专注备战')
    else if (h < 17) setGreeting('下午好，继续加油')
    else if (h < 20) setGreeting('晚上好，刷题时间到')
    else setGreeting('晚上好，坚持就是胜利')
  }, [])

  const getDailyIds = useCallback(
    async (
      rm: Record<string, { status: string; lastUpdated: number }>,
      count = 10,
      questionIds?: string[],
    ): Promise<string[]> => {
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
    greeting,
  }
}
