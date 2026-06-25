import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import type { Difficulty, Module, StudyStatus } from '@/types'
import type { QuestionListBaseData } from './useQuestionListBase'

// ─── Constants ────────────────────────────────────────────

export type SortOption = {
  value: string
  label: string
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'default', label: '默认排序' },
  { value: 'note-updated', label: '最近笔记' },
  { value: 'difficulty-asc', label: '难度↑' },
  { value: 'difficulty-desc', label: '难度↓' },
  { value: 'module', label: '按模块' },
]

const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))
const STATUS_VALUES = new Set<StudyStatus>(['unlearned', 'review', 'mastered'])
const DIFFICULTY_VALUES = new Set<Difficulty>([1, 2, 3])

// ─── URL helpers ──────────────────────────────────────────

function parseListParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function areArraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function parseModuleParams(params: URLSearchParams): Module[] {
  return uniqueValues(parseListParam(params, 'module') as Module[])
}

function parseDifficultyParams(params: URLSearchParams): Difficulty[] {
  return uniqueValues(
    parseListParam(params, 'difficulty')
      .map((value) => Number(value))
      .filter((value): value is Difficulty => DIFFICULTY_VALUES.has(value as Difficulty)),
  )
}

function parseStatusParams(params: URLSearchParams): StudyStatus[] {
  return uniqueValues(
    parseListParam(params, 'status').filter((value): value is StudyStatus =>
      STATUS_VALUES.has(value as StudyStatus),
    ),
  )
}

function parseSortParam(params: URLSearchParams): string {
  const value = params.get('sort') ?? 'default'
  return SORT_VALUES.has(value) ? value : 'default'
}

function parseNotesOnlyParam(params: URLSearchParams): boolean {
  return params.get('notes') === '1'
}

function parseStarredOnlyParam(params: URLSearchParams): boolean {
  return params.get('starred') === '1'
}

function buildQuestionListParams({
  modules,
  difficulties,
  statuses,
  starredOnly,
  notesOnly,
  search,
  sort,
}: {
  modules: Module[]
  difficulties: Difficulty[]
  statuses: StudyStatus[]
  starredOnly: boolean
  notesOnly: boolean
  search: string
  sort: string
}): URLSearchParams {
  const params = new URLSearchParams()
  if (modules.length > 0) params.set('module', modules.join(','))
  if (difficulties.length > 0) params.set('difficulty', difficulties.join(','))
  if (statuses.length > 0) params.set('status', statuses.join(','))
  if (starredOnly) params.set('starred', '1')
  if (notesOnly) params.set('notes', '1')
  if (search.trim()) params.set('q', search.trim())
  if (sort !== 'default') params.set('sort', sort)
  return params
}

// ─── Hook ─────────────────────────────────────────────────

export interface QuestionListUIState {
  keyword: string
  setKeyword: (v: string) => void
  debouncedKeyword: string
  sort: string
  handleSortChange: (v: string) => void
  selectedModules: Module[]
  selectedDifficulties: Difficulty[]
  selectedStatuses: StudyStatus[]
  starredOnly: boolean
  notesOnly: boolean
  toggleModule: (m: Module) => void
  toggleDifficulty: (d: Difficulty) => void
  toggleStatus: (s: StudyStatus) => void
  toggleStarredOnly: () => void
  toggleNotesOnly: () => void
  clearFilters: () => void
  startPracticeSession: (ids: string[]) => void
  mobileFilterOpen: boolean
  setMobileFilterOpen: Dispatch<SetStateAction<boolean>>
  searchRef: React.RefObject<HTMLInputElement | null>
  mobileFilterButtonRef: React.RefObject<HTMLButtonElement | null>
  mobileFilterPanelRef: React.RefObject<HTMLDivElement | null>
  /** Keep selectedModules valid when availableModules changes */
  validateModules: (availableModules: Module[], hasData: boolean) => void
}

export function useQuestionListUI(base: QuestionListBaseData): QuestionListUIState {
  const { navigate } = base
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedModules, setSelectedModules] = useState<Module[]>(() =>
    parseModuleParams(searchParams),
  )
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(() =>
    parseDifficultyParams(searchParams),
  )
  const [selectedStatuses, setSelectedStatuses] = useState<StudyStatus[]>(() =>
    parseStatusParams(searchParams),
  )
  const [starredOnly, setStarredOnly] = useState(() => parseStarredOnlyParam(searchParams))
  const [notesOnly, setNotesOnly] = useState(() => parseNotesOnlyParam(searchParams))
  const [keyword, setKeyword] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<string>(() => parseSortParam(searchParams))
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  const searchRef = useRef<HTMLInputElement | null>(null)
  const mobileFilterButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobileFilterPanelRef = useRef<HTMLDivElement | null>(null)
  const lastSyncedSearchRef = useRef(searchParams.toString())

  // ── Debounced search ──
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 250)
    return () => clearTimeout(t)
  }, [keyword])

  // ── Sync URL params (bidirectional) ──
  useEffect(() => {
    const currentSearch = searchParams.toString()
    const desiredParams = buildQuestionListParams({
      modules: selectedModules,
      difficulties: selectedDifficulties,
      statuses: selectedStatuses,
      starredOnly,
      notesOnly,
      search: debouncedKeyword,
      sort,
    })
    const desiredSearch = desiredParams.toString()

    // If URL changed externally, re-read filter values
    if (currentSearch !== lastSyncedSearchRef.current && currentSearch !== desiredSearch) {
      const nextParams = new URLSearchParams(currentSearch)
      const nextModules = parseModuleParams(nextParams)
      const nextDifficulties = parseDifficultyParams(nextParams)
      const nextStatuses = parseStatusParams(nextParams)
      const nextStarredOnly = parseStarredOnlyParam(nextParams)
      const nextNotesOnly = parseNotesOnlyParam(nextParams)
      const nextSearch = nextParams.get('q') ?? ''
      const nextSort = parseSortParam(nextParams)

      if (!areArraysEqual(selectedModules, nextModules)) {
        setSelectedModules(nextModules)
      }
      if (!areArraysEqual(selectedDifficulties, nextDifficulties)) {
        setSelectedDifficulties(nextDifficulties)
      }
      if (!areArraysEqual(selectedStatuses, nextStatuses)) {
        setSelectedStatuses(nextStatuses)
      }
      if (notesOnly !== nextNotesOnly) {
        setNotesOnly(nextNotesOnly)
      }
      if (starredOnly !== nextStarredOnly) {
        setStarredOnly(nextStarredOnly)
      }
      if (keyword !== nextSearch) {
        setKeyword(nextSearch)
      }
      if (debouncedKeyword !== nextSearch) {
        setDebouncedKeyword(nextSearch)
      }
      if (sort !== nextSort) {
        setSort(nextSort)
      }
      lastSyncedSearchRef.current = currentSearch
      return
    }

    // Push state to URL when filters change internally
    if (currentSearch !== desiredSearch) {
      lastSyncedSearchRef.current = desiredSearch
      setSearchParams(desiredParams, { replace: true })
    } else {
      lastSyncedSearchRef.current = currentSearch
    }
  }, [
    searchParams,
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    notesOnly,
    keyword,
    debouncedKeyword,
    sort,
    setSearchParams,
  ])

  // ── Keyboard shortcut: / to focus search ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchRef.current &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName ?? '')
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Mobile filter drawer effects ──
  useEffect(() => {
    if (!mobileFilterOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      mobileFilterPanelRef.current?.focus({ preventScroll: true })
    })

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileFilterOpen(false)
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = previousOverflow
      if (mobileFilterButtonRef.current?.isConnected) {
        mobileFilterButtonRef.current.focus({ preventScroll: true })
      }
    }
  }, [mobileFilterOpen])

  const toggleStarredOnly = useCallback(() => {
    setStarredOnly((prev) => !prev)
  }, [])

  const toggleNotesOnly = useCallback(() => {
    setNotesOnly((prev) => !prev)
  }, [])

  // ── Keyboard shortcut: N for notes only toggle ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null
      const activeTag = activeElement?.tagName ?? ''
      const isTyping =
        activeElement?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)

      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || isTyping) return
      e.preventDefault()
      toggleNotesOnly()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleNotesOnly])

  // ── Toggle helpers ──
  const toggleModule = useCallback((m: Module) => {
    setSelectedModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }, [])

  const toggleDifficulty = useCallback((d: Difficulty) => {
    setSelectedDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    )
  }, [])

  const toggleStatus = useCallback((s: StudyStatus) => {
    setSelectedStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedModules([])
    setSelectedDifficulties([])
    setSelectedStatuses([])
    setStarredOnly(false)
    setNotesOnly(false)
    setKeyword('')
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSort(value)
  }, [])

  const validateModules = useCallback((availableModules: Module[], hasData: boolean) => {
    if (!hasData && availableModules.length === 0) return
    setSelectedModules((prev) => prev.filter((m) => availableModules.includes(m)))
  }, [])

  const startPracticeSession = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      navigate(createPracticeSessionPath(ids[0], ids))
    },
    [navigate],
  )

  return {
    keyword,
    setKeyword,
    debouncedKeyword,
    sort,
    handleSortChange,
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    notesOnly,
    toggleModule,
    toggleDifficulty,
    toggleStatus,
    toggleStarredOnly,
    toggleNotesOnly,
    clearFilters,
    startPracticeSession,
    mobileFilterOpen,
    setMobileFilterOpen,
    searchRef,
    mobileFilterButtonRef,
    mobileFilterPanelRef,
    validateModules,
  }
}
