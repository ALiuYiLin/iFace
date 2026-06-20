import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuestion, useQuestions } from '@/hooks/useQuestions'
import { readPracticeSession } from '@/lib/practiceSession'
import { useAIStore } from '@/store/useAIStore'
import { useStudyStore } from '@/store/useStudyStore'

export function useQuestionDetailBase() {
  const { id } = useParams<{ id: string }>()
  const questionId = id ?? ''
  const [searchParams] = useSearchParams()

  const { question, loading } = useQuestion(id)
  const { allQuestions } = useQuestions()
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
    loading,
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
