import api from '@/utils/request'
import type { ApiResponse, UserStreak } from './types'

export async function getSetting(key: string): Promise<unknown> {
  const res = await api.get(`/settings/${key}`) as ApiResponse<unknown>
  return res.data
}

export async function setSetting(key: string, value: unknown): Promise<{ key: string; value: unknown }> {
  const res = await api.put(`/settings/${key}`, { value }) as ApiResponse<{ key: string; value: unknown }>
  return res.data
}

export async function getStreaks(): Promise<UserStreak[]> {
  const res = await api.get('/streaks') as ApiResponse<UserStreak[]>
  return res.data
}

export async function postStreak(data: { date: string; questionsDone?: number; currentStreak?: number; bestStreak?: number }): Promise<UserStreak> {
  const res = await api.post('/streaks', data) as ApiResponse<UserStreak>
  return res.data
}
