import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudyStore } from '@/store/useStudyStore'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchQuestionList } from '@/store/pages/questionListSlice'
import { getQuestionFlags, getQuestionNotes } from '@/api'
import type { Question } from '@/api'
import type { QuestionFlag, QuestionNote } from '@/types'

export interface QuestionListBaseData {
  navigate: ReturnType<typeof useNavigate>
  allQuestions: Question[]
  initializing: boolean
  loading: boolean
  records: ReturnType<typeof useStudyStore>['records']
  getStatus: ReturnType<typeof useStudyStore>['getStatus']
  hiddenCategories: ReturnType<typeof useStudyStore>['hiddenCategories']
  categoryMap: import("@/api").CategoryMap
  questionFlags: QuestionFlag[]
  questionNotes: QuestionNote[]
}

export function useQuestionListBase(): QuestionListBaseData {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { records, getStatus, hiddenCategories } = useStudyStore()
  const { allQuestions, categoryMap, loading } = useAppSelector((s) => s.questionList)

  const [questionFlags, setQuestionFlags] = useState<import("@/types").QuestionFlag[]>([])
  const [questionNotes, setQuestionNotes] = useState<import("@/types").QuestionNote[]>([])

  useEffect(() => {
    dispatch(fetchQuestionList())
  }, [dispatch])

  useEffect(() => {
    let cancelled = false
    const loadMeta = async () => {
      const [notesResult, flagsResult] = await Promise.allSettled([
        getQuestionNotes(),
        getQuestionFlags(),
      ])
      if (cancelled) return
      setQuestionNotes(notesResult.status === 'fulfilled' ? notesResult.value.map((n: any) => ({ questionId: n.question_id, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at })) : [])
      setQuestionFlags(flagsResult.status === 'fulfilled' ? flagsResult.value.map((f: any) => ({ questionId: f.question_id, starred: !!f.starred, createdAt: f.created_at, updatedAt: f.updated_at })) : [])
    }
    void loadMeta()
    window.addEventListener('focus', loadMeta)
    return () => { cancelled = true; window.removeEventListener('focus', loadMeta) }
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
