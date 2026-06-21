import type { FilterState, Question, StudyStatus } from '@/types'

export type SortKey = 'default' | 'difficulty-asc' | 'difficulty-desc' | 'module'

export function invalidateQuestionsCache() {
  // No-op: questions are always fetched fresh from the API
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
