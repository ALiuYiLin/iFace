import api from '@/utils/request'
import type {
  ApiResponse, ExportData, ImportPreviewResult, CustomImportResult,
  BuiltinLoadResult, BuiltinRefreshResult, MigrationResult,
} from './types'

export async function exportAllData(): Promise<ExportData> {
  const res = await api.get('/export') as ApiResponse<ExportData>
  return res.data
}

export async function importPreview(data: Record<string, unknown>): Promise<ImportPreviewResult> {
  const res = await api.post('/import/preview', data) as ApiResponse<ImportPreviewResult>
  return res.data
}

export async function importBackup(data: Record<string, unknown>): Promise<{ ok: boolean }> {
  const res = await api.post('/import', data) as ApiResponse<{ ok: boolean }>
  return res.data
}

export async function importCustomQuestions(
  data: unknown,
  sourceName: string,
  categoryName?: string,
): Promise<CustomImportResult> {
  const res = await api.post('/import/custom-questions', { data, sourceName, categoryName }) as ApiResponse<CustomImportResult>
  return res.data
}

export async function loadBuiltinModules(force?: boolean): Promise<BuiltinLoadResult[]> {
  const res = await api.post('/questions/builtin/load', { force }) as ApiResponse<BuiltinLoadResult[]>
  return res.data
}

export async function refreshBuiltinQuestions(): Promise<BuiltinRefreshResult> {
  const res = await api.post('/questions/builtin/refresh') as ApiResponse<BuiltinRefreshResult>
  return res.data
}

export async function migrateBuiltinQuestions(): Promise<MigrationResult> {
  const res = await api.post('/questions/builtin/migrate') as ApiResponse<MigrationResult>
  return res.data
}

export async function resetDatabase(): Promise<{ ok: boolean }> {
  const res = await api.post('/reset') as ApiResponse<{ ok: boolean }>
  return res.data
}
