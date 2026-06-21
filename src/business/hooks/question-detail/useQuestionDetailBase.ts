import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { usePromise } from '@/hooks/usePromise'
import { getQuestion, getQuestions } from '@/api'
import { readPracticeSession } from '@/lib/practiceSession'
import { useAIStore } from '@/store/useAIStore'
import { useStudyStore } from '@/store/useStudyStore'
import type { Question } from '@/api'

export function useQuestionDetailBase() {
  const { id } = useParams<{ id: string }>()
  const questionId = id ?? ''
  const [searchParams] = useSearchParams()

  const [question, setQuestion] = useState<Question | undefined>(undefined)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])

  const [loading, loadQuestion] = usePromise(async (qId: string) => {
    const data = await getQuestion(qId)
    setQuestion(data)
  })

  const [allLoading, loadAllQuestions] = usePromise(async () => {
    const res = await getQuestions({ pageSize: 1000 })
    setAllQuestions(res.data)
  })

  useEffect(() => {
    if (id) {
      loadQuestion(id)
    } else {
      setQuestion(undefined)
    }
  }, [id, loadQuestion])

  useEffect(() => {
    loadAllQuestions()
  }, [loadAllQuestions])

  const {
    records,
    getStatus,
    setStatus,
    getRecord,
    studyMode,
    answerNavigationMode,
    mobileQuestionNavEnabled,
    aiFabVisible,
    streak,
    incrementStreak,
  } = useStudyStore()
  const { config: aiConfig } = useAIStore()

  // Session context
  const sessionKey = searchParams.get('session')
  const inlineSessionIds = useMemo(
    () => searchParams.get('ids')?.split(',').filter(Boolean) ?? [],
    [searchParams],
  )
  const [storedSessionIds, setStoredSessionIds] = useState<string[]>(() =>
    readPracticeSession(sessionKey),
  )

  const sessionIds = inlineSessionIds.length > 0 ? inlineSessionIds : storedSessionIds
  const isInSession = sessionIds.length > 0
  const sessionIndex = isInSession ? sessionIds.indexOf(id ?? '') : -1

  const sessionSearch = sessionKey
    ? `?session=${sessionKey}`
    : sessionIds.length > 0
      ? `?ids=${sessionIds.join(',')}`
      : ''

  const sessionIdentity = sessionKey
    ? `session:${sessionKey}`
    : inlineSessionIds.length > 0
      ? `ids:${inlineSessionIds.join(',')}`
      : 'browse'

  const checkSearchParam = searchParams.get('check')

  const isAiEnabled = aiConfig.enabled && aiConfig.apiKey.trim().length > 0

  return {
    id,
    questionId,
    question,
    loading: loading || allLoading,
    allQuestions,
    records,
    getStatus,
    setStatus,
    getRecord,
    studyMode,
    answerNavigationMode,
    mobileQuestionNavEnabled,
    aiFabVisible,
    streak,
    incrementStreak,
    aiConfig,
    isAiEnabled,
    sessionKey,
    inlineSessionIds,
    storedSessionIds,
    setStoredSessionIds,
    sessionIds,
    isInSession,
    sessionIndex,
    sessionSearch,
    questionNavigationSearch:
      answerNavigationMode === 'check'
        ? `?check=1&${sessionSearch.slice(1)}`
        : sessionSearch,
    sessionIdentity,
    checkSearchParam,
    searchParams,
  }
}
