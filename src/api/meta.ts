import api from '@/utils/request'
import type { ApiResponse } from './types'

export async function getMeta(key: string): Promise<unknown> {
  const res = await api.get(`/meta/${key}`) as ApiResponse<unknown>
  return res.data
}

export async function setMeta(key: string, value: unknown): Promise<{ key: string; value: unknown }> {
  const res = await api.put(`/meta/${key}`, { value }) as ApiResponse<{ key: string; value: unknown }>
  return res.data
}

export async function deleteMeta(key: string): Promise<{ deletedKey: string }> {
  const res = await api.delete(`/meta/${key}`) as ApiResponse<{ deletedKey: string }>
  return res.data
}
