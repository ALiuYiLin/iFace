import { useEffect, useState } from 'react'
import { usePromise } from '@/hooks/usePromise'
import { useStudyStore } from '@/store/useStudyStore'
import { getQuestions } from '@/api'
import type { Question } from '@/api'

export interface WeakPointsBaseData {
  allQuestions: Question[]
  initializing: boolean
  records: ReturnType<typeof useStudyStore>['records']
  setStatus: ReturnType<typeof useStudyStore>['setStatus']
}

export function useWeakPointsBase(): WeakPointsBaseData {
  const { records, setStatus } = useStudyStore()
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [loading, loadQuestions] = usePromise(async () => {
    const res = await getQuestions({ pageSize: 1000 })
    setAllQuestions(res.data)
  })

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  return { allQuestions, initializing: loading, records, setStatus }
}
