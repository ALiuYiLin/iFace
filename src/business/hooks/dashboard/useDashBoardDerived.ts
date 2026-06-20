import { useEffect, useMemo, useState } from 'react'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import type { DashBoardBaseData } from './useDashBoardBase'

export interface DashBoardDerivedData {
  hiddenModules: Set<string>
  visibleQuestions: DashBoardBaseData['allQuestions']
  visibleQuestionIds: string[]
  counts: { mastered: number; review: number; unlearned: number }
  totalQuestions: number
  masteredPercent: number
  remainingQuestions: number
  estimatedDays: number
  recentNoteItems: {
    note: DashBoardBaseData['questionNotes'][number]
    question: DashBoardBaseData['allQuestions'][number]
  }[]
  moduleStats: {
    module: string
    questions: DashBoardBaseData['allQuestions']
  }[]
  dailyIds: string[]
  dailyLoading: boolean
}

export function useDashBoardDerived(base: DashBoardBaseData): DashBoardDerivedData {
  const {
    allQuestions,
    records,
    categoryMap,
    hiddenCategories,
    dailyGoal,
    questionNotes,
    getDailyIds,
  } = base

  const hiddenModules = useMemo(
    () => getHiddenModules(categoryMap, hiddenCategories),
    [categoryMap, hiddenCategories],
  )

  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, hiddenModules),
    [allQuestions, hiddenModules],
  )

  const visibleQuestionIds = useMemo(
    () => visibleQuestions.map((q) => q.id),
    [visibleQuestions],
  )

  const counts = useMemo(() => {
    const visibleIds = new Set(visibleQuestions.map((q) => q.id))
    let mastered = 0
    let review = 0
    for (const [id, r] of Object.entries(records)) {
      if (!visibleIds.has(id)) continue
      if (r.status === 'mastered') mastered++
      else if (r.status === 'review') review++
    }
    const tracked = mastered + review
    const unlearned = Math.max(0, visibleQuestions.length - tracked)
    return { mastered, review, unlearned }
  }, [records, visibleQuestions])

  const totalQuestions = visibleQuestions.length
  const masteredPercent =
    totalQuestions > 0 ? Math.round((counts.mastered / totalQuestions) * 100) : 0
  const remainingQuestions = Math.max(0, totalQuestions - counts.mastered)
  const estimatedDays =
    remainingQuestions === 0 ? 0 : Math.ceil(remainingQuestions / Math.max(1, dailyGoal))

  const recentNoteItems = useMemo(() => {
    const questionMap = new Map(visibleQuestions.map((q) => [q.id, q]))
    return questionNotes
      .filter((note) => note.content.trim().length > 0 && questionMap.has(note.questionId))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((note) => ({
        note,
        question: questionMap.get(note.questionId)!,
      }))
  }, [questionNotes, visibleQuestions])

  const moduleStats = useMemo(() => {
    const orderedModules: string[] = []
    const seen = new Set<string>()
    const sortedCategories = Object.entries(categoryMap).sort(([, a], [, b]) => {
      const aOrder = a.order ?? 99
      const bOrder = b.order ?? 99
      return aOrder - bOrder
    })
    for (const [catName, category] of sortedCategories) {
      if (hiddenCategories.has(catName)) continue
      for (const m of category.modules) {
        if (!seen.has(m)) {
          orderedModules.push(m)
          seen.add(m)
        }
      }
    }
    for (const q of visibleQuestions) {
      if (!seen.has(q.module)) {
        orderedModules.push(q.module)
        seen.add(q.module)
      }
    }
    return orderedModules
      .map((mod) => ({
        module: mod,
        questions: visibleQuestions.filter((q) => q.module === mod),
      }))
      .filter((s) => s.questions.length > 0)
  }, [visibleQuestions, categoryMap, hiddenCategories])

  const [dailyIds, setDailyIds] = useState<string[]>([])
  const [dailyLoading, setDailyLoading] = useState(true)

  useEffect(() => {
    if (visibleQuestionIds.length === 0) {
      setDailyIds([])
      setDailyLoading(false)
      return
    }
    setDailyLoading(true)
    getDailyIds(
      Object.fromEntries(
        Object.entries(records).map(([k, v]) => [
          k,
          { status: v.status, lastUpdated: v.lastUpdated ?? 0 },
        ]),
      ),
      dailyGoal,
      visibleQuestionIds,
    )
      .then(setDailyIds)
      .finally(() => setDailyLoading(false))
  }, [visibleQuestionIds, records, getDailyIds, dailyGoal])

  return {
    hiddenModules,
    visibleQuestions,
    visibleQuestionIds,
    counts,
    totalQuestions,
    masteredPercent,
    remainingQuestions,
    estimatedDays,
    recentNoteItems,
    moduleStats,
    dailyIds,
    dailyLoading,
  }
}
