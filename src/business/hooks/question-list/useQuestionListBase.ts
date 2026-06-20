import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuestions } from '@/hooks/useQuestions'
import { useStudyStore } from '@/store/useStudyStore'
import {
  getAllQuestionFlags,
  getAllQuestionNotes,
  getCategoryMap,
  type CategoryMap,
  DEFAULT_CATEGORY_MAP,
} from '@/lib/db'
import type { QuestionFlag, QuestionNote } from '@/types'

export interface QuestionListBaseData {
  navigate: ReturnType<typeof useNavigate>
  allQuestions: ReturnType<typeof useQuestions>['allQuestions']
  initializing: boolean
  loading: boolean
  records: ReturnType<typeof useStudyStore>['records']
  getStatus: ReturnType<typeof useStudyStore>['getStatus']
  hiddenCategories: ReturnType<typeof useStudyStore>['hiddenCategories']
  categoryMap: CategoryMap
  questionFlags: QuestionFlag[]
  questionNotes: QuestionNote[]
}

export function useQuestionListBase(): QuestionListBaseData {
  const navigate = useNavigate()
  const { allQuestions, loading, initializing } = useQuestions()
  const { records, getStatus, hiddenCategories } = useStudyStore()

  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  const [questionFlags, setQuestionFlags] = useState<QuestionFlag[]>([])
  const [questionNotes, setQuestionNotes] = useState<QuestionNote[]>([])

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadQuestionMeta = async () => {
      const [notesResult, flagsResult] = await Promise.allSettled([
        getAllQuestionNotes(),
        getAllQuestionFlags(),
      ])

      if (cancelled) return
      setQuestionNotes(notesResult.status === 'fulfilled' ? notesResult.value : [])
      setQuestionFlags(flagsResult.status === 'fulfilled' ? flagsResult.value : [])
    }

    void loadQuestionMeta()
    window.addEventListener('focus', loadQuestionMeta)
    return () => {
      cancelled = true
      window.removeEventListener('focus', loadQuestionMeta)
    }
  }, [])

  return {
    navigate,
    allQuestions,
    initializing,
    loading,
    records,
    getStatus,
    hiddenCategories,
    categoryMap,
    questionFlags,
    questionNotes,
  }
}
