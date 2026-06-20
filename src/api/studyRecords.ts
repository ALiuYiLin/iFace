import api from '@/utils/request'
import type { ApiResponse, StudyRecord } from './types'

export async function getStudyRecords(): Promise<StudyRecord[]> {
  const res = await api.get('/study-records') as ApiResponse<StudyRecord[]>
  return res.data
}

export async function getStudyRecord(questionId: string): Promise<StudyRecord | null> {
  const res = await api.get(`/study-records/${questionId}`) as ApiResponse<StudyRecord | null>
  return res.data
}

export async function putStudyRecord(questionId: string, data: { status: string; reviewCount?: number; lastUpdated?: number }): Promise<StudyRecord> {
  const res = await api.put(`/study-records/${questionId}`, data) as ApiResponse<StudyRecord>
  return res.data
}

export async function bulkPutStudyRecords(records: StudyRecord[]): Promise<{ count: number }> {
  const res = await api.post('/study-records/bulk', { records }) as ApiResponse<{ count: number }>
  return res.data
}

export async function deleteStudyRecord(questionId: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/study-records/${questionId}`) as ApiResponse<{ deletedId: string }>
  return res.data
}

export async function clearStudyRecords(): Promise<{ ok: boolean }> {
  const res = await api.delete('/study-records') as ApiResponse<{ ok: boolean }>
  return res.data
}
