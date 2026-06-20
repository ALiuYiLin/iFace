import { useEffect, useState } from 'react'
import { useQuestions } from '@/hooks/useQuestions'
import { useStudyStore } from '@/store/useStudyStore'
import { getAllQuestionNotes, getCategoryMap } from '@/lib/db'
import type { CategoryMap } from '@/lib/db'
import { DEFAULT_CATEGORY_MAP } from '@/lib/db'
import type { QuestionNote } from '@/types'
import type { StudyStatus } from '@/types'
import type { StreakData } from '@/store/useStudyStore'

export interface DashBoardBaseData {
  allQuestions: ReturnType<typeof useQuestions>['allQuestions']
  loading: boolean
  initializing: boolean
  getDailyIds: ReturnType<typeof useQuestions>['getDailyIds']
  records: Record<string, { status: StudyStatus; lastUpdated?: number }>
  streak: StreakData
  dailyGoal: number
  hiddenCategories: Set<string>
  categoryMap: CategoryMap
  questionNotes: QuestionNote[]
  greeting: string
}

export function useDashBoardBase(): DashBoardBaseData {
  const { allQuestions, loading, initializing, getDailyIds } = useQuestions()
  const { records, streak, dailyGoal, hiddenCategories } = useStudyStore()

  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  const [questionNotes, setQuestionNotes] = useState<QuestionNote[]>([])
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const notes = await getAllQuestionNotes()
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

  return {
    allQuestions,
    loading,
    initializing,
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
