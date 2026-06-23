import { useEffect } from 'react'
import {
  AI_PROVIDER_PRESETS,
  type AIProviderId,
  type AIProviderPreset,
  type AIModelPreset,
  getAIProviderPreset,
} from '@/store/useAIStore'
import type { AIConfig } from '@/store/useAIStore'

export interface SettingDrawerDerivedData {
  selectedProvider: AIProviderId
  selectedProviderPreset: AIProviderPreset
  modelOptions: AIModelPreset[]
  selectedModelPreset: AIModelPreset | undefined
  selectedModel: string
  isCustomProvider: boolean
}

export function useSettingDrawerDerived(
  localConfig: AIConfig,
  customModel: string,
  customBaseUrl: string,
  setCustomModel: (v: string) => void,
  setCustomBaseUrl: (v: string) => void,
): SettingDrawerDerivedData {
  const selectedProvider: AIProviderId = AI_PROVIDER_PRESETS.some(
    (provider) => provider.id === localConfig.provider,
  )
    ? (localConfig.provider as AIProviderId)
    : 'custom'
  const selectedProviderPreset = getAIProviderPreset(selectedProvider)
  const modelOptions = selectedProviderPreset.models
  const selectedModelPreset = modelOptions.find((model) => model.value === localConfig.model)
  const selectedModel = selectedModelPreset ? localConfig.model : 'custom'
  const isCustomProvider = selectedProvider === 'custom'

  useEffect(() => {
    if (selectedModel === 'custom' && localConfig.model && localConfig.model !== 'custom') {
      setCustomModel(localConfig.model)
    }
    if (isCustomProvider && localConfig.baseUrl && localConfig.baseUrl !== 'custom') {
      setCustomBaseUrl(localConfig.baseUrl)
    }
  }, [isCustomProvider, localConfig.baseUrl, localConfig.model, selectedModel, setCustomModel, setCustomBaseUrl])

  return {
    selectedProvider,
    selectedProviderPreset,
    modelOptions,
    selectedModelPreset,
    selectedModel,
    isCustomProvider,
  }
}
