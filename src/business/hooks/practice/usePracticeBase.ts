import { useEffect, useState } from 'react'
import { usePromise } from '@/hooks/usePromise'
import { useStudyStore } from '@/store/useStudyStore'
import { getCategories, getQuestions } from '@/api'
import type { CategoryMap, Question } from '@/api'

export interface PracticeBaseData {
  allQuestions: Question[]
  initializing: boolean
  records: ReturnType<typeof useStudyStore>['records']
  hiddenCategories: ReturnType<typeof useStudyStore>['hiddenCategories']
  categoryMap: CategoryMap
}

export function usePracticeBase(): PracticeBaseData {
  const { records, hiddenCategories } = useStudyStore()
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})
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

  return { allQuestions, initializing: loading, records, hiddenCategories, categoryMap }
}
