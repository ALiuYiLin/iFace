import { useParams } from 'react-router-dom'
import { useAIStore } from '@/store/useAIStore'

export interface AIToolConfig {
  id: string
  title: string
  description: string
  actionLabel: string
  loadingText: string
  emptyTitle: string
  emptyDescription: string
  fields: {
    id: string
    label: string
    placeholder: string
    type: 'input' | 'textarea'
    required?: boolean
    rows?: number
  }[]
  outputGuide: string
}

export interface AIBaseData {
  tool: AIToolConfig | undefined
  config: ReturnType<typeof useAIStore>['config']
}

export function useAIBase(toolMap: Map<string, AIToolConfig>): AIBaseData {
  const { toolId } = useParams()
  const tool = toolId ? toolMap.get(toolId) : undefined
  const { config } = useAIStore()

  return { tool, config }
}
