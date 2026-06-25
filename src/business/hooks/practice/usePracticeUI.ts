import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import type { Difficulty, Module, StudyStatus } from '@/types'
import type { PracticeBaseData } from './usePracticeBase'

export interface PracticeUIState {
  selectedModules: Module[]
  selectedDifficulty: Difficulty | 'all'
  selectedStatus: StudyStatus | 'all'
  isShuffled: boolean
  toggleModule: (mod: Module) => void
  toggleCategory: (catModules: Module[]) => void
  handleStart: (filteredIds: string[]) => void
  setSelectedDifficulty: (d: Difficulty | 'all') => void
  setSelectedStatus: (s: StudyStatus | 'all') => void
  setIsShuffled: (v: boolean) => void
  setSelectedModules: (mods: Module[]) => void
}

export function usePracticeUI(base: PracticeBaseData): PracticeUIState {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedModules, setSelectedModules] = useState<Module[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<StudyStatus | 'all'>('all')
  const [isShuffled, setIsShuffled] = useState(false)

  const { visibleQuestions } = base

  // Handle preset from URL params
  useEffect(() => {
    const ids = searchParams.get('ids')
    if (ids) {
      const idList = ids.split(',').filter(Boolean)
      if (idList.length > 0) {
        navigate(`/questions/${idList[0]}?ids=${ids}`, { replace: true })
      }
    }
  }, [searchParams, navigate])

  // Clean up selected modules when active modules change
  const activeModules = useMemo(
    () => [...new Set(visibleQuestions.map((q) => q.module))],
    [visibleQuestions],
  )
  useEffect(() => {
    const activeSet = new Set(activeModules)
    setSelectedModules((prev) => prev.filter((m) => activeSet.has(m)))
  }, [activeModules])

  const toggleModule = useCallback((mod: Module) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    )
  }, [])

  const toggleCategory = useCallback((catModules: Module[]) => {
    setSelectedModules((prev) => {
      const allSelected = catModules.every((m) => prev.includes(m))
      if (allSelected) return prev.filter((m) => !catModules.includes(m))
      const toAdd = catModules.filter((m) => !prev.includes(m))
      return [...prev, ...toAdd]
    })
  }, [])

  const handleStart = useCallback(
    (filteredIds: string[]) => {
      if (filteredIds.length === 0) return
      const ids = [...filteredIds]
      if (isShuffled) {
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]]
        }
      }
      navigate(createPracticeSessionPath(ids[0], ids))
    },
    [isShuffled, navigate],
  )

  return {
    selectedModules,
    selectedDifficulty,
    selectedStatus,
    isShuffled,
    toggleModule,
    toggleCategory,
    handleStart,
    setSelectedDifficulty,
    setSelectedStatus,
    setIsShuffled,
    setSelectedModules,
  }
}
