import api from '@/utils/request'
import type { ApiResponse, QuestionNoteImage } from './types'

export async function getQuestionNoteImages(questionId: string): Promise<QuestionNoteImage[]> {
  const res = await api.get(`/question-note-images/${questionId}`) as ApiResponse<QuestionNoteImage[]>
  return res.data
}

export async function uploadNoteImage(data: {
  questionId: string
  name: string
  mimeType?: string
  dataUrl: string
}): Promise<QuestionNoteImage> {
  const res = await api.post('/question-note-images', data) as ApiResponse<QuestionNoteImage>
  return res.data
}

export async function uploadNoteImageFile(questionId: string, file: File): Promise<QuestionNoteImage> {
  const form = new FormData()
  form.append('file', file)
  form.append('questionId', questionId)
  const res = await api.post('/question-note-images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as ApiResponse<QuestionNoteImage>
  return res.data
}

export async function cleanupNoteImages(questionId: string, keepIds: string[]): Promise<{ deletedCount: number }> {
  const res = await api.post(`/question-note-images/question/${questionId}/cleanup`, { keepIds }) as ApiResponse<{ deletedCount: number }>
  return res.data
}

export async function deleteQuestionNoteImages(questionId: string): Promise<{ deletedCount: number }> {
  const res = await api.delete(`/question-note-images/question/${questionId}`) as ApiResponse<{ deletedCount: number }>
  return res.data
}
