/**
 * Compatibility bridge between old IndexedDB-style function signatures
 * and the new API-based functions.
 *
 * Components imported from `@/lib/db` can change to `@/api/compat`
 * without rewriting their internal logic.
 */
import {
  getQuestionNote as apiGetNote,
  putAnswerAnnotation as apiPutAnnotation,
  deleteAnswerAnnotation as apiDelAnnotation,
  getAnswerOverride as apiGetOverride,
  putAnswerOverride as apiPutOverride,
  deleteAnswerOverride as apiDelOverride,
  setQuestionStarred as apiSetStarred,
} from '@/api'

import type { QuestionAnswerAnnotation, AnswerAnnotationColor, AnswerAnnotationKind } from '@/types'

// ─── Question Answer Annotations ───────────────────

export async function getQuestionAnswerAnnotations(questionId: string): Promise<QuestionAnswerAnnotation[]> {
  const { getAnnotationsByQuestion } = await import('@/api/answerAnnotations')
  const res: any[] = await getAnnotationsByQuestion(questionId) as any
  return res.map((a) => ({
    id: a.id as string,
    questionId: a.question_id as string,
    answerHash: a.answer_hash as string,
    kind: a.kind as AnswerAnnotationKind,
    color: a.color as AnswerAnnotationColor,
    highlightColor: a.highlight_color as AnswerAnnotationColor | null | undefined,
    start: a.start_pos as number,
    end: a.end_pos as number,
    selectedText: a.selected_text as string,
    note: a.note as string,
    createdAt: a.created_at as number,
    updatedAt: a.updated_at as number,
  }))
}

export async function putQuestionAnswerAnnotation(annotation: {
  id: string
  questionId: string
  answerHash: string
  kind: AnswerAnnotationKind
  color: AnswerAnnotationColor
  highlightColor?: AnswerAnnotationColor | null
  start: number
  end: number
  selectedText: string
  note: string
  createdAt: number
  updatedAt: number
}) {
  const data: Record<string, unknown> = {
    questionId: annotation.questionId,
    answerHash: annotation.answerHash,
    kind: annotation.kind,
    color: annotation.color,
    highlightColor: annotation.highlightColor ?? null,
    start: annotation.start,
    end: annotation.end,
    selectedText: annotation.selectedText,
    note: annotation.note,
  }
  const res = await apiPutAnnotation(annotation.id, data)
  return res as unknown as typeof annotation
}

export async function deleteQuestionAnswerAnnotation(id: string) {
  return apiDelAnnotation(id)
}

// ─── Question Answer Overrides ─────────────────────

export async function getQuestionAnswerOverride(questionId: string) {
  const res = await apiGetOverride(questionId)
  if (!res) return null
  return { questionId: res.question_id, content: res.content, createdAt: res.created_at, updatedAt: res.updated_at }
}

export async function putQuestionAnswerOverride(data: { questionId: string; content: string; createdAt: number; updatedAt: number }) {
  const res = await apiPutOverride(data.questionId, { content: data.content, createdAt: data.createdAt })
  if (!res) return null
  return { questionId: res.question_id, content: res.content, createdAt: res.created_at, updatedAt: res.updated_at }
}

export async function deleteQuestionAnswerOverride(questionId: string) {
  return apiDelOverride(questionId)
}

// ─── Question Flags ─────────────────────────────────

export async function getQuestionFlag(questionId: string) {
  const { getQuestionFlag: apiGetFlag } = await import('@/api/questionFlags')
  const res = await apiGetFlag(questionId)
  if (!res) return null
  return { questionId: res.question_id, starred: !!res.starred, createdAt: res.created_at, updatedAt: res.updated_at }
}

export { apiSetStarred as setQuestionStarred }

// ─── Question Notes ─────────────────────────────────

export async function getQuestionNote(questionId: string) {
  const res = await apiGetNote(questionId)
  if (!res) return null
  return { questionId: res.question_id, content: res.content, createdAt: res.created_at, updatedAt: res.updated_at }
}

export { appendQuestionNote as appendQuestionNoteContent } from './questionNotes'

export async function putQuestionNote(questionId: string, data: { content: string; createdAt?: number }) {
  const { putQuestionNote: apiPutNote } = await import('@/api/questionNotes')
  const res = await apiPutNote(questionId, data)
  if (!res) return null
  return { questionId: res.question_id, content: res.content, createdAt: res.created_at, updatedAt: res.updated_at }
}

export async function getQuestionNoteImages(questionId: string) {
  const { getQuestionNoteImages: apiGetImages } = await import('@/api/noteImages')
  const res = await apiGetImages(questionId)
  return res.map((img: { id: string; question_id: string; name: string; mime_type: string; size: number; file_path: string; created_at: number; updated_at: number }) => ({
    id: img.id,
    questionId: img.question_id,
    name: img.name,
    mimeType: img.mime_type,
    size: img.size,
    filePath: img.file_path,
    createdAt: img.created_at,
    updatedAt: img.updated_at,
  }))
}

export async function putQuestionNoteImage(image: {
  id: string
  questionId: string
  name: string
  mimeType: string
  size: number
  dataUrl: string
}) {
  const { uploadNoteImage } = await import('@/api/noteImages')
  const res = await uploadNoteImage({
    questionId: image.questionId,
    name: image.name,
    mimeType: image.mimeType,
    dataUrl: image.dataUrl,
  })
  return {
    id: res.id,
    questionId: res.question_id,
    name: res.name,
    mimeType: res.mime_type,
    size: res.size,
    filePath: res.file_path,
    createdAt: res.created_at,
    updatedAt: res.updated_at,
    dataUrl: image.dataUrl,
  }
}

export async function deleteUnusedQuestionNoteImages(questionId: string, keepIds: string[]) {
  const { cleanupNoteImages } = await import('@/api/noteImages')
  return cleanupNoteImages(questionId, keepIds)
}

export async function getAllQuestions() {
  const { getQuestions } = await import('@/api/questions')
  const res = await getQuestions({ pageSize: 1000 })
  return res.data.map((q: { id: string; module: string; difficulty: number; question: string; answer: string; tags: string[]; source?: string | null }) => ({
    id: q.id,
    module: q.module,
    difficulty: q.difficulty,
    question: q.question,
    answer: q.answer,
    tags: q.tags ?? [],
    source: q.source ?? undefined,
  }))
}

export async function getCategoryMap() {
  const { getCategories } = await import('@/api/categories')
  return getCategories()
}

export async function saveCategoryMap(map: Record<string, unknown>) {
  const { saveCategories } = await import('@/api/categories')
  return saveCategories(map as import('./types').CategoryMap)
}

export async function exportAllData() {
  const { exportAllData: doExport } = await import('@/api/importExport')
  return doExport()
}

export async function resetDatabase() {
  const { resetDatabase: doReset } = await import('@/api/importExport')
  return doReset()
}

export async function getAllStudyRecords() {
  const { getStudyRecords } = await import('@/api/studyRecords')
  const res = await getStudyRecords()
  return res.map((r: { question_id: string; status: string; last_updated: number; review_count: number }) => ({
    questionId: r.question_id,
    status: r.status,
    lastUpdated: r.last_updated,
    reviewCount: r.review_count,
  }))
}

export async function getAllQuestionNotes() {
  const { getQuestionNotes } = await import('@/api/questionNotes')
  const res = await getQuestionNotes()
  return res.map((n: { question_id: string; content: string; created_at: number; updated_at: number }) => ({
    questionId: n.question_id,
    content: n.content,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }))
}

export async function getAllQuestionAnswerAnnotations() {
  const { getAnswerAnnotations } = await import('@/api/answerAnnotations')
  const res = await getAnswerAnnotations()
  return res.map((a: { id: string; question_id: string; answer_hash: string; kind: string; color: string; start_pos: number; end_pos: number; selected_text: string; note: string; created_at: number; updated_at: number }) => ({
    id: a.id,
    questionId: a.question_id,
    answerHash: a.answer_hash,
    kind: a.kind,
    color: a.color,
    start: a.start_pos,
    end: a.end_pos,
    selectedText: a.selected_text,
    note: a.note,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }))
}

export async function getAllQuestionAnswerOverrides() {
  const { getAnswerOverrides } = await import('@/api/answerOverrides')
  const res = await getAnswerOverrides()
  return res.map((o: { question_id: string; content: string; created_at: number; updated_at: number }) => ({
    questionId: o.question_id,
    content: o.content,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  }))
}

export async function getAllQuestionFlags() {
  const { getQuestionFlags } = await import('@/api/questionFlags')
  const res = await getQuestionFlags()
  return res.map((f: { question_id: string; starred: number; created_at: number; updated_at: number }) => ({
    questionId: f.question_id,
    starred: !!f.starred,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  }))
}

export async function getAllMockInterviews() {
  const { getMockInterviews } = await import('@/api/mockInterviews')
  return getMockInterviews()
}

export async function getAllJdMatchReports() {
  const { getJdMatchReports } = await import('@/api/jdMatchReports')
  return getJdMatchReports()
}

export { bulkPutQuestions as bulkPutQuestionsCompat }

export async function bulkPutStudyRecords(records: { questionId: string; status: string; lastUpdated: number; reviewCount: number }[]) {
  const { bulkPutStudyRecords: fn } = await import('@/api/studyRecords')
  return fn(records.map(r => ({ question_id: r.questionId, status: r.status, last_updated: r.lastUpdated, review_count: r.reviewCount, created_at: r.lastUpdated })) as any)
}

export async function bulkPutJdMatchReports(reports: unknown[]) {
  const { bulkPutJdMatchReports: fn } = await import('@/api/jdMatchReports')
  return fn(reports as import('./types').JdMatchReport[])
}

export async function bulkPutMockInterviews(sessions: unknown[]) {
  const { bulkPutMockInterviews: fn } = await import('@/api/mockInterviews')
  return fn(sessions as import('./types').MockInterviewSession[])
}

export async function bulkPutQuestionAnswerAnnotations(annotations: unknown[]) {
  const { bulkPutAnswerAnnotations: fn } = await import('@/api/answerAnnotations')
  return fn(annotations as import('./types').QuestionAnswerAnnotation[])
}

export async function bulkPutQuestionAnswerOverrides(overrides: unknown[]) {
  const { bulkPutAnswerOverrides: fn } = await import('@/api/answerOverrides')
  return fn(overrides as import('./types').QuestionAnswerOverride[])
}

export async function bulkPutQuestionFlags(flags: unknown[]) {
  const { bulkPutQuestionFlags: fn } = await import('@/api/questionFlags')
  return fn(flags as import('./types').QuestionFlag[])
}

export async function bulkPutQuestionNotes(notes: unknown[]) {
  const { bulkPutQuestionNotes: fn } = await import('@/api/questionNotes')
  return fn(notes as import('./types').QuestionNote[])
}

export async function bulkPutQuestions(questions: unknown[]) {
  const { bulkPutQuestions: fn } = await import('@/api/questions')
  return fn(questions as import('./types').Question[])
}

// ─── Constants ─────────────────────────────────

export const DEFAULT_CATEGORY_MAP: import('./types').CategoryMap = {}
export const META_KEYS = {
  LOADED_MODULES: 'loaded_modules',
  CUSTOM_SOURCES: 'custom_sources',
  DAILY_RECS: 'daily_recommendations',
  SCHEMA_VERSION: 'schema_version',
  BUILTIN_QUESTIONS_VERSION: 'builtin_questions_version',
  BUILTIN_REPLACEMENT_MIGRATION: 'builtin_replacement_migration',
  CATEGORY_MAP: 'category_map',
} as const

export type { CategoryMap } from './types'

export async function setMeta(key: string, value: unknown) {
  const { setMeta: apiSetMeta } = await import('@/api/meta')
  return apiSetMeta(key, value)
}

export async function getCustomSources() {
  const { getCustomSources: apiGet } = await import('@/api/modules')
  return apiGet()
}
