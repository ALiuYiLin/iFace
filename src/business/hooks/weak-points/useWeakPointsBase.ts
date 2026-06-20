import { useQuestions } from '@/hooks/useQuestions'
import { useStudyStore } from '@/store/useStudyStore'

export interface WeakPointsBaseData {
  allQuestions: ReturnType<typeof useQuestions>['allQuestions']
  initializing: boolean
  records: ReturnType<typeof useStudyStore>['records']
  setStatus: ReturnType<typeof useStudyStore>['setStatus']
}

export function useWeakPointsBase(): WeakPointsBaseData {
  const { allQuestions, initializing } = useQuestions()
  const { records, setStatus } = useStudyStore()

  return { allQuestions, initializing, records, setStatus }
}
