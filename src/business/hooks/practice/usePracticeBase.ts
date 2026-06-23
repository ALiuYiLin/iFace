import { useEffect } from 'react'
import { useStudyStore } from '@/store/useStudyStore'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchPracticeData } from '@/store/pages/practiceSlice'
import type { CategoryMap, Question } from '@/api'

export interface PracticeBaseData {
  allQuestions: Question[]
  initializing: boolean
  records: ReturnType<typeof useStudyStore>['records']
  hiddenCategories: ReturnType<typeof useStudyStore>['hiddenCategories']
  categoryMap: CategoryMap
}

export function usePracticeBase(): PracticeBaseData {
  const dispatch = useAppDispatch()
  const { records, hiddenCategories } = useStudyStore()
  const { allQuestions, categoryMap, loading } = useAppSelector((s) => s.practice)

  useEffect(() => {
    dispatch(fetchPracticeData())
  }, [dispatch])

  return { allQuestions, initializing: loading, records, hiddenCategories, categoryMap }
}
