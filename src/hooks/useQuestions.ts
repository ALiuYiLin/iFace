import { useCallback, useEffect, useRef, useState } from 'react'
import { getQuestions } from '@/api'
import type { Difficulty, FilterState, Module, Question, StudyStatus } from '@/types'

export type SortKey = 'default' | 'difficulty-asc' | 'difficulty-desc' | 'module'

interface UseQuestionsReturn {
  questions: Question[]
  allQuestions: Question[]
  filteredQuestions: Question[]
  loading: boolean
  initializing: boolean
  error: string | null
  totalCount: number
  reload: () => Promise<void>
  getQuestionById: (id: string) => Question | undefined
  getQuestionsByModule: (module: Module) => Question[]
  getDailyIds: (
    recordMap: Record<string, { status: string; lastUpdated: number }>,
    count?: number,
    questionIds?: string[],
  ) => Promise<string[]>
  getAdjacentIds: (
    currentId: string,
    filteredIds: string[],
  ) => { prevId: string | null; nextId: string | null }
}

// ─── In-memory cache shared across hook instances ─────────────────────────────

let _allQuestions: Question[] = []
let _loaded = false
const _waiters: Array<() => void> = []

async function fetchAllQuestions(): Promise<Question[]> {
  const res = await getQuestions({ pageSize: 1000 })
  return res.data
}

async function ensureLoaded(): Promise<Question[]> {
  if (_loaded) return _allQuestions
  if (_loading) {
    return new Promise<Question[]>((resolve) => {
      _waiters.push(() => resolve(_allQuestions))
    })
  }
  _loading = true
  try {
    const res = await fetchAllQuestions()
    _allQuestions = res
    _loaded = true
  } finally {
    _loading = false
    _waiters.forEach((fn) => fn())
    _waiters.length = 0
  }
  return _allQuestions
}

let _loading = false

export function invalidateQuestionsCache() {
  _loaded = false
}

// ─── Filter helper ────────────────────────────────────────────────────────────

export function applyFilters(
  questions: Question[],
  filter: Partial<FilterState>,
  recordMap: Record<string, { status: StudyStatus }>,
  sort: SortKey = 'default',
): Question[] {
  let result = questions

  if (filter.modules && filter.modules.length > 0) {
    const set = new Set(filter.modules)
    result = result.filter((q) => set.has(q.module))
  }

  if (filter.difficulties && filter.difficulties.length > 0) {
    const set = new Set(filter.difficulties)
    result = result.filter((q) => set.has(q.difficulty))
  }

  if (filter.statuses && filter.statuses.length > 0) {
    const set = new Set(filter.statuses)
    result = result.filter((q) => {
      const status = recordMap[q.id]?.status ?? 'unlearned'
      return set.has(status as StudyStatus)
    })
  }

  if (filter.search?.trim()) {
    const keyword = filter.search.trim().toLowerCase()
    result = result.filter(
      (q) =>
        q.question.toLowerCase().includes(keyword) ||
        q.tags.some((t) => t.toLowerCase().includes(keyword)) ||
        q.module.toLowerCase().includes(keyword) ||
        q.source?.toLowerCase().includes(keyword),
    )
  }

  switch (sort) {
    case 'difficulty-asc':
      result = [...result].sort((a, b) => a.difficulty - b.difficulty)
      break
    case 'difficulty-desc':
      result = [...result].sort((a, b) => b.difficulty - a.difficulty)
      break
    case 'module':
      result = [...result].sort((a, b) => a.module.localeCompare(b.module))
      break
    default:
      break
  }

  return result
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuestions(
  filter?: Partial<FilterState>,
  recordMap?: Record<string, { status: StudyStatus }>,
  sort: SortKey = 'default',
): UseQuestionsReturn {
  const [allQuestions, setAllQuestions] = useState<Question[]>(_allQuestions)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filterRef = useRef(filter)
  filterRef.current = filter
  const recordRef = useRef(recordMap)
  recordRef.current = recordMap

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const questions = await ensureLoaded()
      setAllQuestions(questions)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reload = useCallback(async () => {
    invalidateQuestionsCache()
    await load()
  }, [load])

  const filteredQuestions = useCallback((): Question[] => {
    if (!filter && !recordMap) return allQuestions
    return applyFilters(allQuestions, filter ?? {}, recordMap ?? {}, sort)
  }, [allQuestions, filter, recordMap, sort])()

  const getQuestionById = useCallback(
    (id: string): Question | undefined => allQuestions.find((q) => q.id === id),
    [allQuestions],
  )

  const getQuestionsByModule = useCallback(
    (module: Module): Question[] => allQuestions.filter((q) => q.module === module),
    [allQuestions],
  )

  const getDailyIds = useCallback(
    async (
      rm: Record<string, { status: string; lastUpdated: number }>,
      count = 10,
      questionIds?: string[],
    ): Promise<string[]> => {
      const allIds = questionIds ?? allQuestions.map((q) => q.id)
      return getDailyRecommendations(allIds, rm, count)
    },
    [allQuestions],
  )

  const getAdjacentIds = useCallback(
    (currentId: string, filteredIds: string[]): { prevId: string | null; nextId: string | null } => {
      const idx = filteredIds.indexOf(currentId)
      if (idx === -1) return { prevId: null, nextId: null }
      return {
        prevId: idx > 0 ? filteredIds[idx - 1] : null,
        nextId: idx < filteredIds.length - 1 ? filteredIds[idx + 1] : null,
      }
    },
    [],
  )

  return {
    questions: allQuestions,
    allQuestions,
    filteredQuestions,
    loading,
    initializing,
    error,
    totalCount: allQuestions.length,
    reload,
    getQuestionById,
    getQuestionsByModule,
    getDailyIds,
    getAdjacentIds,
  }
}

// ─── Lightweight hook for a single question (detail page) ─────────────────────

export function useQuestion(id: string | undefined): {
  question: Question | undefined
  loading: boolean
} {
  const [question, setQuestion] = useState<Question | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setQuestion(undefined)
      return
    }
    let cancelled = false
    setLoading(true)
    import('@/api').then(({ getQuestion }) => {
      if (cancelled) return
      getQuestion(id).then(setQuestion).catch(() => setQuestion(undefined)).finally(() => setLoading(false))
    })
    return () => { cancelled = true }
  }, [id])

  return { question, loading }
}

// ─── Hook for practice session (filtered list of ids) ─────────────────────────

export function usePracticeQuestions(
  module: Module | null,
  difficulty: Difficulty | null,
): { questions: Question[]; loading: boolean } {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ensureLoaded()
      .then((all) => {
        let filtered = all
        if (module) filtered = filtered.filter((q) => q.module === module)
        if (difficulty) filtered = filtered.filter((q) => q.difficulty === difficulty)
        setQuestions(filtered)
      })
      .finally(() => setLoading(false))
  }, [module, difficulty])

  return { questions, loading }
}

// ─── Daily recommendations (lightweight, copied from questionLoader) ──────────

async function getDailyRecommendations(
  allIds: string[],
  recordMap: Record<string, { status: string; lastUpdated: number }>,
  count = 10,
): Promise<string[]> {
  const reviewIds = allIds
    .filter((id) => recordMap[id]?.status === 'review')
    .sort((a, b) => (recordMap[a]?.lastUpdated ?? 0) - (recordMap[b]?.lastUpdated ?? 0))

  const unlearnedIds = allIds.filter((id) => !recordMap[id] || recordMap[id].status === 'unlearned')

  const result: string[] = []
  const seen = new Set<string>()
  for (const id of [...reviewIds, ...unlearnedIds]) {
    if (result.length >= count) break
    if (!seen.has(id)) {
      result.push(id)
      seen.add(id)
    }
  }
  return result
}
