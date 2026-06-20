import api from '@/utils/request'
import type { ApiResponse, CategoryMap } from './types'

export async function getCategories(): Promise<CategoryMap> {
  const res = await api.get('/categories') as ApiResponse<CategoryMap>
  return res.data
}

export async function saveCategories(map: CategoryMap): Promise<CategoryMap> {
  const res = await api.put('/categories', map) as ApiResponse<CategoryMap>
  return res.data
}

export async function registerModuleInCategory(categoryName: string, module: string): Promise<CategoryMap> {
  const res = await api.post(`/categories/${encodeURIComponent(categoryName)}/modules`, { module }) as ApiResponse<CategoryMap>
  return res.data
}

export async function registerModulesInCategory(categoryName: string, modules: string[]): Promise<CategoryMap> {
  const res = await api.post(`/categories/${encodeURIComponent(categoryName)}/modules/bulk`, { modules }) as ApiResponse<CategoryMap>
  return res.data
}

export async function unregisterModuleFromCategories(moduleName: string): Promise<CategoryMap> {
  const res = await api.delete(`/categories/modules/${encodeURIComponent(moduleName)}`) as ApiResponse<CategoryMap>
  return res.data
}

export async function deleteCategory(name: string): Promise<CategoryMap> {
  const res = await api.delete(`/categories/${encodeURIComponent(name)}`) as ApiResponse<CategoryMap>
  return res.data
}

export async function renameCategory(oldName: string, newName: string): Promise<CategoryMap> {
  const res = await api.put(`/categories/${encodeURIComponent(oldName)}/rename`, { newName }) as ApiResponse<CategoryMap>
  return res.data
}
