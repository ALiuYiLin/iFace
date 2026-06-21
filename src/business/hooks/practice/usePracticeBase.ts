import { useEffect, useState } from 'react'
import { useQuestions } from '@/hooks/useQuestions'
import { useStudyStore } from '@/store/useStudyStore'
import { getCategories } from '@/api'
import type { CategoryMap } from '@/api'

export interface PracticeBaseData {
  allQuestions: ReturnType<typeof useQuestions>['allQuestions']
  initializing: boolean
  records: ReturnType<typeof useStudyStore>['records']
  hiddenCategories: ReturnType<typeof useStudyStore>['hiddenCategories']
  categoryMap: CategoryMap
}

export function usePracticeBase(): PracticeBaseData {
  const { allQuestions, initializing } = useQuestions()
  const { records, hiddenCategories } = useStudyStore()
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})

  useEffect(() => {
    getCategories().then(setCategoryMap).catch(() => setCategoryMap({}))
  }, [])

  return { allQuestions, initializing, records, hiddenCategories, categoryMap }
}
