import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePromise } from '@/hooks/usePromise'
import { useStudyStore } from '@/store/useStudyStore'
import { getCategories, getQuestionFlags, getQuestionNotes, getQuestions } from '@/api'
import type { CategoryMap, QuestionFlag, QuestionNote, Question } from '@/api'

export interface QuestionListBaseData {
  navigate: ReturnType<typeof useNavigate>
  allQuestions: Question[]
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
  const { records, getStatus, hiddenCategories } = useStudyStore()

  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})
  const [questionFlags, setQuestionFlags] = useState<QuestionFlag[]>([])
  const [questionNotes, setQuestionNotes] = useState<QuestionNote[]>([])
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

    const loadQuestionMeta = async () => {
      const [notesResult, flagsResult] = await Promise.allSettled([
        getQuestionNotes(),
        getQuestionFlags(),
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
    initializing: loading,
    loading,
    records,
    getStatus,
    hiddenCategories,
    categoryMap,
    questionFlags,
    questionNotes,
  }
}
