import api from '@/utils/request'
import type { ApiResponse, QuestionAnswerAnnotation } from './types'

export async function getAnswerAnnotations(): Promise<QuestionAnswerAnnotation[]> {
  const res = await api.get('/answer-annotations') as ApiResponse<QuestionAnswerAnnotation[]>
  return res.data
}

export async function getAnnotationsByQuestion(questionId: string): Promise<QuestionAnswerAnnotation[]> {
  const res = await api.get(`/answer-annotations/question/${questionId}`) as ApiResponse<QuestionAnswerAnnotation[]>
  return res.data
}

export async function putAnswerAnnotation(id: string, data: Partial<QuestionAnswerAnnotation>): Promise<QuestionAnswerAnnotation> {
  const res = await api.put(`/answer-annotations/${id}`, data) as ApiResponse<QuestionAnswerAnnotation>
  return res.data
}

export async function bulkPutAnswerAnnotations(annotations: QuestionAnswerAnnotation[]): Promise<{ count: number }> {
  const res = await api.post('/answer-annotations/bulk', { annotations }) as ApiResponse<{ count: number }>
  return res.data
}

export async function deleteAnswerAnnotation(id: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/answer-annotations/${id}`) as ApiResponse<{ deletedId: string }>
  return res.data
}

export async function deleteAnnotationsByQuestion(questionId: string): Promise<{ deletedQuestionId: string }> {
  const res = await api.delete(`/answer-annotations/question/${questionId}`) as ApiResponse<{ deletedQuestionId: string }>
  return res.data
}
