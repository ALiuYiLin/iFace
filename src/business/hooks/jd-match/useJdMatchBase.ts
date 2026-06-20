import { useAIStore } from '@/store/useAIStore'

export interface JdMatchBaseData {
  config: ReturnType<typeof useAIStore>['config']
  aiReady: boolean
}

export function useJdMatchBase(): JdMatchBaseData {
  const { config } = useAIStore()
  const aiReady = config.enabled && config.apiKey.trim().length > 0

  return { config, aiReady }
}
