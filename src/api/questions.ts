import api from '@/utils/request'
import type { ApiResponse, PaginatedData, Question } from './types'

export interface QuestionsQuery {
  module?: string
  difficulty?: 1 | 2 | 3
  source?: string
  search?: string
  page?: number
  pageSize?: number
}

export async function getQuestions(query?: QuestionsQuery): Promise<PaginatedData<Question>> {
  return api.get('/questions', { params: query })
}

export async function getQuestionCount(): Promise<number> {
  const res = await api.get('/questions/count') as ApiResponse<number>
  return res.data
}

export async function getStarredIds(): Promise<string[]> {
  const res = await api.get('/questions/starred-ids') as ApiResponse<string[]>
  return res.data
}

export async function getNoteIds(): Promise<string[]> {
  const res = await api.get('/questions/ids-with-content') as ApiResponse<string[]>
  return res.data
}

export async function getQuestionsByModule(module: string): Promise<Question[]> {
  const res = await api.get(`/questions/module/${encodeURIComponent(module)}`) as ApiResponse<Question[]>
  return res.data
}

export async function getBuiltinFiles(): Promise<string[]> {
  const res = await api.get('/questions/builtin-files') as ApiResponse<string[]>
  return res.data
}

export async function getQuestion(id: string): Promise<Question> {
  const res = await api.get(`/questions/${id}`) as ApiResponse<Question>
  return res.data
}

export async function bulkPutQuestions(questions: Question[]): Promise<{ count: number }> {
  const res = await api.post('/questions/bulk', { questions }) as ApiResponse<{ count: number }>
  return res.data
}

export async function deleteQuestion(id: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/questions/${id}`) as ApiResponse<{ deletedId: string }>
  return res.data
}

export async function deleteQuestionsBySource(source: string): Promise<{ deletedCount: number; removedSource: string }> {
  const res = await api.delete(`/questions/source/${encodeURIComponent(source)}`) as ApiResponse<{ deletedCount: number; removedSource: string }>
  return res.data
}
