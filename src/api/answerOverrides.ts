import api from '@/utils/request'
import type { ApiResponse, QuestionAnswerOverride } from './types'

export async function getAnswerOverrides(): Promise<QuestionAnswerOverride[]> {
  const res = await api.get('/answer-overrides') as ApiResponse<QuestionAnswerOverride[]>
  return res.data
}

export async function getAnswerOverride(questionId: string): Promise<QuestionAnswerOverride | null> {
  const res = await api.get(`/answer-overrides/${questionId}`) as ApiResponse<QuestionAnswerOverride | null>
  return res.data
}

export async function putAnswerOverride(questionId: string, data: { content: string; createdAt?: number }): Promise<QuestionAnswerOverride | null> {
  const res = await api.put(`/answer-overrides/${questionId}`, data) as ApiResponse<QuestionAnswerOverride | null>
  return res.data
}

export async function bulkPutAnswerOverrides(overrides: QuestionAnswerOverride[]): Promise<{ count: number }> {
  const res = await api.post('/answer-overrides/bulk', { overrides }) as ApiResponse<{ count: number }>
  return res.data
}

export async function deleteAnswerOverride(questionId: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/answer-overrides/${questionId}`) as ApiResponse<{ deletedId: string }>
  return res.data
}
