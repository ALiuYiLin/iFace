import { useMemo } from 'react'
import type { Question, StudyStatus } from '@/types'

export interface SessionStats {
  mastered: number
  review: number
  unlearned: number
  total: number
  retryIds: string[]
}

export interface RelatedPracticeItem {
  question: Question
  status: StudyStatus
  matchedTags: string[]
}

export function useQuestionDetailDerived(params: {
  question: Question | undefined
  allQuestions: Question[]
  id: string | undefined
  records: Record<string, { status: StudyStatus; reviewCount: number }>
  getStatus: (id: string) => StudyStatus
  getRecord: (id: string) => { status: StudyStatus; reviewCount: number } | undefined
  sessionIds: string[]
  isInSession: boolean
  sessionIndex: number
  searchParams: URLSearchParams
}) {
  const { getStatus, getRecord } = params

  const currentStatus = params.id ? getStatus(params.id) : 'unlearned' as StudyStatus
  const record = params.id ? getRecord(params.id) : undefined
  const reviewCount = record?.reviewCount ?? 0

  // Adjacent IDs
  const { prevIdByList, nextIdByList } = useMemo(() => {
    if (!params.id || params.allQuestions.length === 0) return { prevIdByList: null, nextIdByList: null }
    const sameModule = params.question
      ? params.allQuestions.filter((q) => q.module === params.question!.module)
      : params.allQuestions
    const idx = sameModule.findIndex((q) => q.id === params.id)
    if (idx === -1) return { prevIdByList: null, nextIdByList: null }
    return {
      prevIdByList: idx > 0 ? sameModule[idx - 1].id : null,
      nextIdByList: idx < sameModule.length - 1 ? sameModule[idx + 1].id : null,
    }
  }, [params.id, params.allQuestions, params.question])

  const prevId = params.isInSession
    ? params.sessionIndex > 0
      ? params.sessionIds[params.sessionIndex - 1]
      : null
    : (params.searchParams.get('prev') ?? prevIdByList)
  const nextId = params.isInSession
    ? params.sessionIndex >= 0 && params.sessionIndex < params.sessionIds.length - 1
      ? params.sessionIds[params.sessionIndex + 1]
      : null
    : (params.searchParams.get('next') ?? nextIdByList)

  const sessionCurrent = params.sessionIndex + 1
  const sessionTotal = params.sessionIds.length

  const sessionStats = useMemo((): SessionStats => {
    const counts = { mastered: 0, review: 0, unlearned: 0 }
    const retryIds: string[] = []

    for (const qid of params.sessionIds) {
      const status = params.records[qid]?.status ?? 'unlearned'
      counts[status]++
      if (status !== 'mastered') retryIds.push(qid)
    }

    return {
      ...counts,
      total: params.sessionIds.length,
      retryIds,
    }
  }, [params.records, params.sessionIds])

  const relatedPracticeItems = useMemo((): RelatedPracticeItem[] => {
    if (!params.question || params.allQuestions.length === 0) return []

    const currentTags = new Set(params.question.tags.map((tag) => tag.toLowerCase()))
    const statusRank: Record<StudyStatus, number> = {
      review: 2,
      unlearned: 1,
      mastered: 0,
    }

    return params.allQuestions
      .filter((candidate) => candidate.id !== params.question!.id)
      .map((candidate) => {
        const matchedTags = candidate.tags.filter((tag) => currentTags.has(tag.toLowerCase()))
        const status = params.records[candidate.id]?.status ?? 'unlearned'
        const sameModule = candidate.module === params.question!.module
        const sameDifficulty = candidate.difficulty === params.question!.difficulty
        const score =
          matchedTags.length * 8 +
          (sameModule ? 5 : 0) +
          (sameDifficulty ? 2 : 0) +
          statusRank[status] * 3

        return {
          question: candidate,
          status,
          matchedTags,
          score,
        }
      })
      .filter((item) => item.score >= 5)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (statusRank[b.status] !== statusRank[a.status]) {
          return statusRank[b.status] - statusRank[a.status]
        }
        return a.question.id.localeCompare(b.question.id)
      })
      .slice(0, 5)
  }, [params.allQuestions, params.question, params.records])

  return {
    currentStatus,
    reviewCount,
    prevId,
    nextId,
    sessionCurrent,
    sessionTotal,
    sessionStats,
    relatedPracticeItems,
  }
}
