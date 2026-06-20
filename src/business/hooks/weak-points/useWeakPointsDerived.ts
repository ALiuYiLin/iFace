import { useMemo } from 'react'
import type { Module } from '@/types'
import type { WeakPointsBaseData } from './useWeakPointsBase'

export interface WeakPointsDerivedData {
  weakRecords: { questionId: string; status: string; lastUpdated: number; reviewCount: number }[]
  weakItems: { record: { questionId: string; status: string; lastUpdated: number; reviewCount: number }; question: { id: string; module: Module; difficulty: number; question: string; tags: string[]; source?: string } }[]
  weakByModule: Record<Module, number>
  stats: { total: number; avgReviewCount: number; oldest: number | null }
  displayItems: { record: { questionId: string; status: string; lastUpdated: number; reviewCount: number }; question: { id: string; module: Module; difficulty: number; question: string; tags: string[]; source?: string } }[]
  sessionIds: string[]
}

type SortMode = 'oldest' | 'newest' | 'most-reviewed' | 'difficulty'

export function useWeakPointsDerived(
  base: WeakPointsBaseData,
  selectedModule: Module | null,
  sortMode: SortMode,
): WeakPointsDerivedData {
  const { allQuestions, records } = base

  const weakRecords = useMemo(
    () => Object.values(records).filter((r) => r.status === 'review'),
    [records],
  )

  const weakItems = useMemo(() => {
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]))
    return weakRecords
      .map((r) => {
        const q = questionMap.get(r.questionId)
        if (!q) return null
        return { record: r, question: q }
      })
      .filter(Boolean) as WeakPointsDerivedData['weakItems']
  }, [weakRecords, allQuestions])

  const weakByModule = useMemo(() => {
    const counts = {} as Record<Module, number>
    for (const { question } of weakItems) {
      counts[question.module] = (counts[question.module] ?? 0) + 1
    }
    return counts
  }, [weakItems])

  const stats = useMemo(() => {
    if (weakItems.length === 0) return { total: 0, avgReviewCount: 0, oldest: null }
    const total = weakItems.length
    const avgReviewCount = weakItems.reduce((s, { record: r }) => s + r.reviewCount, 0) / total
    const oldest = Math.min(...weakItems.map(({ record: r }) => r.lastUpdated))
    return { total, avgReviewCount, oldest }
  }, [weakItems])

  const displayItems = useMemo(() => {
    let items = weakItems
    if (selectedModule) {
      items = items.filter(({ question: q }) => q.module === selectedModule)
    }
    const sorted = [...items]
    switch (sortMode) {
      case 'oldest':
        sorted.sort((a, b) => a.record.lastUpdated - b.record.lastUpdated)
        break
      case 'newest':
        sorted.sort((a, b) => b.record.lastUpdated - a.record.lastUpdated)
        break
      case 'most-reviewed':
        sorted.sort((a, b) => b.record.reviewCount - a.record.reviewCount)
        break
      case 'difficulty':
        sorted.sort((a, b) => b.question.difficulty - a.question.difficulty)
        break
    }
    return sorted
  }, [weakItems, selectedModule, sortMode])

  const sessionIds = displayItems.map(({ question: q }) => q.id)

  return { weakRecords, weakItems, weakByModule, stats, displayItems, sessionIds }
}
