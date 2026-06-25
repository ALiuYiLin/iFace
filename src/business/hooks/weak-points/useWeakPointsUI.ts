import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import type { Module } from '@/types'
import type { WeakPointsBaseData } from './useWeakPointsBase'

export type SortMode = 'oldest' | 'newest' | 'most-reviewed' | 'difficulty'

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'oldest', label: '最久未复习' },
  { value: 'newest', label: '最近标记' },
  { value: 'most-reviewed', label: '复习次数最多' },
  { value: 'difficulty', label: '难度从高到低' },
]

export interface WeakPointsUIState {
  selectedModule: Module | null
  sortMode: SortMode
  clearing: string | null
  setSelectedModule: (m: Module | null) => void
  setSortMode: (m: SortMode) => void
  handleStartSession: (sessionIds: string[]) => void
  handleMarkAllMastered: (displayItems: { question: { id: string } }[], setStatus: (id: string, status: string) => Promise<void>) => Promise<void>
}

export function useWeakPointsUI(): WeakPointsUIState {
  const navigate = useNavigate()
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('oldest')
  const [clearing, setClearing] = useState<string | null>(null)

  const handleStartSession = useCallback(
    (sessionIds: string[]) => {
      if (sessionIds.length === 0) return
      navigate(createPracticeSessionPath(sessionIds[0], sessionIds))
    },
    [navigate],
  )

  const handleMarkAllMastered = useCallback(
    async (
      displayItems: { question: { id: string } }[],
      setStatus: (id: string, status: string) => Promise<void>,
    ) => {
      if (displayItems.length === 0) return
      setClearing('all')
      for (const { question: q } of displayItems) {
        await setStatus(q.id, 'mastered')
      }
      setClearing(null)
    },
    [],
  )

  return {
    selectedModule,
    sortMode,
    clearing,
    setSelectedModule,
    setSortMode,
    handleStartSession,
    handleMarkAllMastered,
  }
}
