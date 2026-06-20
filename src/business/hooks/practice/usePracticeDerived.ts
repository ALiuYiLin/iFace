import { useEffect, useMemo, useState } from 'react'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import type { Difficulty, Module, StudyStatus } from '@/types'
import type { PracticeBaseData } from './usePracticeBase'

export interface PracticeDerivedData {
  visibleQuestions: PracticeBaseData['allQuestions']
  activeModules: Module[]
  moduleStats: { module: Module; total: number; mastered: number }[]
  categoriesWithModules: { name: string; builtin: boolean; modules: Module[] }[]
  difficultyStats: Record<number, number>
  filteredQuestions: PracticeBaseData['allQuestions']
  statusCounts: Record<string, number>
}

export function usePracticeDerived(
  base: PracticeBaseData,
  selectedModules: Module[],
  selectedDifficulty: Difficulty | 'all',
  selectedStatus: StudyStatus | 'all',
): PracticeDerivedData {
  const { allQuestions, records, categoryMap, hiddenCategories } = base

  const hiddenModules = useMemo(
    () => getHiddenModules(categoryMap, hiddenCategories),
    [categoryMap, hiddenCategories],
  )
  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, hiddenModules),
    [allQuestions, hiddenModules],
  )

  const activeModules = useMemo(
    () => [...new Set(visibleQuestions.map((q) => q.module))],
    [visibleQuestions],
  )

  const moduleStats = useMemo(
    () => activeModules.map((mod) => {
      const qs = visibleQuestions.filter((q) => q.module === mod)
      const mastered = qs.filter((q) => records[q.id]?.status === 'mastered').length
      return { module: mod, total: qs.length, mastered }
    }),
    [visibleQuestions, activeModules, records],
  )

  const categoriesWithModules = useMemo(() => {
    const activeSet = new Set(activeModules)
    const fromMap = Object.values(categoryMap)
      .sort((a, b) => {
        if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
        return (a.order ?? 0) - (b.order ?? 0)
      })
      .map((cat) => ({
        name: cat.name,
        builtin: cat.builtin,
        modules: cat.modules.filter((m) => activeSet.has(m)),
      }))
      .filter((cat) => cat.modules.length > 0)

    const assignedModules = new Set(fromMap.flatMap((c) => c.modules))
    const uncategorized = activeModules.filter((m) => !assignedModules.has(m))
    if (uncategorized.length > 0) {
      fromMap.push({ name: '其他', builtin: false, modules: uncategorized })
    }
    return fromMap
  }, [categoryMap, activeModules])

  const difficultyStats = useMemo(() => {
    const base_ = { 1: 0, 2: 0, 3: 0 }
    let filtered = visibleQuestions
    if (selectedModules.length > 0) {
      const set = new Set(selectedModules)
      filtered = filtered.filter((q) => set.has(q.module))
    }
    for (const q of filtered) base_[q.difficulty]++
    return base_
  }, [visibleQuestions, selectedModules])

  const filteredQuestions = useMemo(() => {
    let result = visibleQuestions
    if (selectedModules.length > 0) {
      const set = new Set(selectedModules)
      result = result.filter((q) => set.has(q.module))
    }
    if (selectedDifficulty !== 'all') {
      result = result.filter((q) => q.difficulty === selectedDifficulty)
    }
    if (selectedStatus !== 'all') {
      result = result.filter((q) => {
        const status = records[q.id]?.status ?? 'unlearned'
        return status === selectedStatus
      })
    }
    return result
  }, [visibleQuestions, selectedModules, selectedDifficulty, selectedStatus, records])

  const statusCounts = useMemo(() => {
    let pool = visibleQuestions
    if (selectedModules.length > 0) {
      const set = new Set(selectedModules)
      pool = pool.filter((q) => set.has(q.module))
    }
    if (selectedDifficulty !== 'all') {
      pool = pool.filter((q) => q.difficulty === selectedDifficulty)
    }
    const counts: Record<string, number> = { all: pool.length, unlearned: 0, mastered: 0, review: 0 }
    for (const q of pool) {
      const s = records[q.id]?.status ?? 'unlearned'
      counts[s]++
    }
    return counts
  }, [visibleQuestions, selectedModules, selectedDifficulty, records])

  return { visibleQuestions, activeModules, moduleStats, categoriesWithModules, difficultyStats, filteredQuestions, statusCounts }
}
