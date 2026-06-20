import api from '@/utils/request'
import type { ApiResponse, JdMatchReport } from './types'

export async function getJdMatchReports(): Promise<JdMatchReport[]> {
  const res = await api.get('/jd-match-reports') as ApiResponse<JdMatchReport[]>
  return res.data
}

export async function putJdMatchReport(id: string, report: Partial<JdMatchReport>): Promise<JdMatchReport> {
  const res = await api.put(`/jd-match-reports/${id}`, report) as ApiResponse<JdMatchReport>
  return res.data
}

export async function bulkPutJdMatchReports(reports: JdMatchReport[]): Promise<{ count: number }> {
  const res = await api.post('/jd-match-reports/bulk', { reports }) as ApiResponse<{ count: number }>
  return res.data
}

export async function deleteJdMatchReport(id: string): Promise<{ deletedId: string }> {
  const res = await api.delete(`/jd-match-reports/${id}`) as ApiResponse<{ deletedId: string }>
  return res.data
}

export async function clearJdMatchReports(): Promise<{ ok: boolean }> {
  const res = await api.delete('/jd-match-reports') as ApiResponse<{ ok: boolean }>
  return res.data
}
