import { useEffect } from 'react'
import { useStudyStore } from '@/store/useStudyStore'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchWeakPointsData } from '@/store/pages/weakPointsSlice'
import type { Question } from '@/api'

export interface WeakPointsBaseData {
  allQuestions: Question[]
  initializing: boolean
  records: ReturnType<typeof useStudyStore>['records']
  setStatus: ReturnType<typeof useStudyStore>['setStatus']
}

export function useWeakPointsBase(): WeakPointsBaseData {
  const dispatch = useAppDispatch()
  const { records, setStatus } = useStudyStore()
  const { allQuestions, loading } = useAppSelector((s) => s.weakPoints)

  useEffect(() => {
    dispatch(fetchWeakPointsData())
  }, [dispatch])

  return { allQuestions, initializing: loading, records, setStatus }
}
