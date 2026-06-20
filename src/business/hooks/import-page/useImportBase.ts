import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomSources } from '@/lib/db'

export function useImportBase() {
  const navigate = useNavigate()

  const loadCustomSources = useCallback(async (): Promise<string[]> => {
    return getCustomSources()
  }, [])

  return { navigate, getCustomSources, loadCustomSources }
}
