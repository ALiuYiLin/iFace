import api from '@/utils/request'
import type { ApiResponse, QuestionNote } from './types'

export async function getQuestionNotes(): Promise<QuestionNote[]> {
  const res = await api.get('/question-notes') as ApiResponse<QuestionNote[]>
  return res.data
}

export async function getQuestionNote(questionId: string): Promise<QuestionNote | null> {
  const res = await api.get(`/question-notes/${questionId}`) as ApiResponse<QuestionNote | null>
  return res.data
}

export async function putQuestionNote(questionId: string, data: { content: string; createdAt?: number }): Promise<QuestionNote | null> {
  const res = await api.put(`/question-notes/${questionId}`, data) as ApiResponse<QuestionNote | null>
  return res.data
}

export async function bulkPutQuestionNotes(notes: QuestionNote[]): Promise<{ count: number }> {
  const res = await api.post('/question-notes/bulk', { notes }) as ApiResponse<{ count: number }>
  return res.data
}

export async function appendQuestionNote(questionId: string, content: string): Promise<QuestionNote> {
  const res = await api.post(`/question-notes/${questionId}/append`, { content }) as ApiResponse<QuestionNote>
  return res.data
}

export async function deleteQuestionNote(questionId: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/question-notes/${questionId}`) as ApiResponse<{ deletedId: string }>
  return res.data
}
