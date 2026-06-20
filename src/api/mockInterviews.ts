import api from '@/utils/request'
import type { ApiResponse, MockInterviewSession } from './types'

export async function getMockInterviews(): Promise<MockInterviewSession[]> {
  const res = await api.get('/mock-interviews') as ApiResponse<MockInterviewSession[]>
  return res.data
}

export async function getMockInterview(id: string): Promise<MockInterviewSession> {
  const res = await api.get(`/mock-interviews/${id}`) as ApiResponse<MockInterviewSession>
  return res.data
}

export async function putMockInterview(id: string, session: Partial<MockInterviewSession>): Promise<MockInterviewSession> {
  const res = await api.put(`/mock-interviews/${id}`, session) as ApiResponse<MockInterviewSession>
  return res.data
}

export async function bulkPutMockInterviews(sessions: MockInterviewSession[]): Promise<{ count: number }> {
  const res = await api.post('/mock-interviews/bulk', { sessions }) as ApiResponse<{ count: number }>
  return res.data
}

export async function deleteMockInterview(id: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/mock-interviews/${id}`) as ApiResponse<{ deletedId: string }>
  return res.data
}

export async function clearMockInterviews(): Promise<{ ok: boolean }> {
  const res = await api.delete('/mock-interviews') as ApiResponse<{ ok: boolean }>
  return res.data
}
