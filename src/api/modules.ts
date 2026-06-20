import api from '@/utils/request'
import type { ApiResponse } from './types'

export async function getLoadedModules(): Promise<string[]> {
  const res = await api.get('/modules/loaded') as ApiResponse<string[]>
  return res.data
}

export async function markModuleLoaded(file: string): Promise<{ file: string }> {
  const res = await api.post('/modules/loaded', { file }) as ApiResponse<{ file: string }>
  return res.data
}

export async function getActiveModules(): Promise<string[]> {
  const res = await api.get('/modules/active') as ApiResponse<string[]>
  return res.data
}

export async function getCustomSources(): Promise<string[]> {
  const res = await api.get('/sources/custom') as ApiResponse<string[]>
  return res.data
}

export async function addCustomSource(source: string): Promise<{ source: string }> {
  const res = await api.post('/sources/custom', { source }) as ApiResponse<{ source: string }>
  return res.data
}

export async function removeCustomSource(source: string): Promise<{ deletedSource: string }> {
  const res = await api.delete(`/sources/custom/${encodeURIComponent(source)}`) as ApiResponse<{ deletedSource: string }>
  return res.data
}
