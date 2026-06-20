import api from '@/utils/request'
import type { ApiResponse, QuestionFlag } from './types'

export async function getQuestionFlags(): Promise<QuestionFlag[]> {
  const res = await api.get('/question-flags') as ApiResponse<QuestionFlag[]>
  return res.data
}

export async function getQuestionFlag(questionId: string): Promise<QuestionFlag | null> {
  const res = await api.get(`/question-flags/${questionId}`) as ApiResponse<QuestionFlag | null>
  return res.data
}

export async function setQuestionStarred(questionId: string, starred: boolean): Promise<QuestionFlag> {
  const res = await api.put(`/question-flags/${questionId}/star`, { starred }) as ApiResponse<QuestionFlag>
  return res.data
}

export async function bulkPutQuestionFlags(flags: QuestionFlag[]): Promise<{ count: number }> {
  const res = await api.post('/question-flags/bulk', { flags }) as ApiResponse<{ count: number }>
  return res.data
}
