import { useEffect, useState } from 'react'
import { useQuestions } from '@/hooks/useQuestions'
import { useStudyStore } from '@/store/useStudyStore'
import { getCategoryMap } from '@/lib/db'
import type { CategoryMap } from '@/lib/db'
import { DEFAULT_CATEGORY_MAP } from '@/lib/db'

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
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  return { allQuestions, initializing, records, hiddenCategories, categoryMap }
}
