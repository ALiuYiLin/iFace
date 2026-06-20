import { useMemo } from 'react'
import { applyFilters, type SortKey } from '@/hooks/useQuestions'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { BUILTIN_MODULES } from '@/types'
import type { Module, Question, QuestionNote } from '@/types'
import type { QuestionListBaseData } from './useQuestionListBase'
import type { QuestionListUIState } from './useQuestionListUI'

// ─── Utility functions ───────────────────────────────────

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function questionMatchesKeyword(question: Question, keyword: string): boolean {
  if (!keyword) return true
  return (
    question.question.toLowerCase().includes(keyword) ||
    question.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
    question.module.toLowerCase().includes(keyword) ||
    Boolean(question.source?.toLowerCase().includes(keyword))
  )
}

function getNoteSearchSnippet(content: string, keyword: string): string {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_[\]`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return ''

  const index = keyword ? text.toLowerCase().indexOf(keyword) : -1
  if (index === -1) return text.length > 120 ? `${text.slice(0, 120)}...` : text

  const start = Math.max(0, index - 36)
  const end = Math.min(text.length, index + keyword.length + 64)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

function sortQuestionsByRecentNote(
  questions: Question[],
  noteByQuestionId: Map<string, QuestionNote>,
): Question[] {
  return [...questions].sort((a, b) => {
    const aUpdatedAt = noteByQuestionId.get(a.id)?.updatedAt ?? 0
    const bUpdatedAt = noteByQuestionId.get(b.id)?.updatedAt ?? 0
    if (aUpdatedAt !== bUpdatedAt) return bUpdatedAt - aUpdatedAt
    return 0
  })
}

// ─── Hook ────────────────────────────────────────────────

export interface QuestionListDerivedData {
  hiddenModules: Set<string>
  visibleQuestions: Question[]
  availableModules: Module[]
  noteByQuestionId: Map<string, QuestionNote>
  noteIds: Set<string>
  starredIds: Set<string>
  starredCount: number
  noteCount: number
  filteredQuestions: Question[]
  noteSearchMatchedIds: Set<string>
  noteSearchSnippets: Map<string, string>
}

export function useQuestionListDerived(
  base: QuestionListBaseData,
  ui: QuestionListUIState,
): QuestionListDerivedData {
  const {
    allQuestions,
    records,
    categoryMap,
    hiddenCategories,
    questionFlags,
    questionNotes,
  } = base

  const {
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    notesOnly,
    debouncedKeyword,
    sort,
  } = ui

  // ── Hidden modules & visible questions ──
  const hiddenModules = useMemo(
    () => getHiddenModules(categoryMap, hiddenCategories),
    [categoryMap, hiddenCategories],
  )

  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, hiddenModules),
    [allQuestions, hiddenModules],
  )

  // ── Available modules (sorted: builtins first, then custom) ──
  const availableModules = useMemo<Module[]>(() => {
    const moduleSet = new Set(visibleQuestions.map((q) => q.module))
    const builtins = (BUILTIN_MODULES as readonly string[]).filter((m) => moduleSet.has(m))
    const custom = [...moduleSet]
      .filter((m) => !(BUILTIN_MODULES as readonly string[]).includes(m))
      .sort((a, b) => a.localeCompare(b))
    return [...builtins, ...custom]
  }, [visibleQuestions])

  // ── Notes & flags maps ──
  const noteByQuestionId = useMemo(() => {
    const map = new Map<string, QuestionNote>()
    for (const note of questionNotes) {
      if (note.content.trim()) map.set(note.questionId, note)
    }
    return map
  }, [questionNotes])

  const noteIds = useMemo(() => new Set(noteByQuestionId.keys()), [noteByQuestionId])

  const starredIds = useMemo(
    () => new Set(questionFlags.filter((flag) => flag.starred).map((flag) => flag.questionId)),
    [questionFlags],
  )

  const starredCount = useMemo(
    () =>
      visibleQuestions.reduce(
        (count, question) => count + (starredIds.has(question.id) ? 1 : 0),
        0,
      ),
    [visibleQuestions, starredIds],
  )

  const noteCount = useMemo(
    () =>
      visibleQuestions.reduce(
        (count, question) => count + (noteIds.has(question.id) ? 1 : 0),
        0,
      ),
    [visibleQuestions, noteIds],
  )

  // ── Filtered questions (fully computed) ──
  const filteredResult = useMemo(() => {
    const structuralSort: SortKey = sort === 'note-updated' ? 'default' : (sort as SortKey)
    const structuralQuestions = applyFilters(
      visibleQuestions,
      {
        modules: selectedModules,
        difficulties: selectedDifficulties,
        statuses: selectedStatuses,
        search: '',
      },
      records,
      structuralSort,
    )

    const keyword = normalizeKeyword(debouncedKeyword)
    const noteSearchMatchedIds = new Set<string>()
    const noteSearchSnippets = new Map<string, string>()
    const searchedQuestions = keyword
      ? structuralQuestions.filter((q) => {
          const questionMatched = questionMatchesKeyword(q, keyword)
          const noteContent = noteByQuestionId.get(q.id)?.content
          const noteMatched = noteContent?.toLowerCase().includes(keyword)
          if (noteMatched && noteContent) {
            noteSearchMatchedIds.add(q.id)
            noteSearchSnippets.set(q.id, getNoteSearchSnippet(noteContent, keyword))
          }
          return questionMatched || noteMatched
        })
      : structuralQuestions

    const starredFiltered = starredOnly
      ? searchedQuestions.filter((q) => starredIds.has(q.id))
      : searchedQuestions
    const noteFiltered = notesOnly
      ? starredFiltered.filter((q) => noteIds.has(q.id))
      : starredFiltered
    const sortedQuestions =
      sort === 'note-updated'
        ? sortQuestionsByRecentNote(noteFiltered, noteByQuestionId)
        : noteFiltered

    return { questions: sortedQuestions, noteSearchMatchedIds, noteSearchSnippets }
  }, [
    visibleQuestions,
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    starredIds,
    notesOnly,
    noteIds,
    noteByQuestionId,
    debouncedKeyword,
    sort,
    records,
  ])

  return {
    hiddenModules,
    visibleQuestions,
    availableModules,
    noteByQuestionId,
    noteIds,
    starredIds,
    starredCount,
    noteCount,
    filteredQuestions: filteredResult.questions,
    noteSearchMatchedIds: filteredResult.noteSearchMatchedIds,
    noteSearchSnippets: filteredResult.noteSearchSnippets,
  }
}
