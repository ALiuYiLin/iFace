import { useState } from 'react'

export interface PromptUIState {
  selectedPreset: string
  setSelectedPreset: (id: string) => void
  customPrompt: string | null
  setCustomPrompt: (prompt: string | null) => void
  activeTab: 'presets' | 'custom'
  setActiveTab: (tab: 'presets' | 'custom') => void
  rightTab: 'preview' | 'converter'
  setRightTab: (tab: 'preview' | 'converter') => void
}

export function usePromptUI(): PromptUIState {
  const [selectedPreset, setSelectedPreset] = useState<string>('full')
  const [customPrompt, setCustomPrompt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  const [rightTab, setRightTab] = useState<'preview' | 'converter'>('preview')

  return {
    selectedPreset,
    setSelectedPreset,
    customPrompt,
    setCustomPrompt,
    activeTab,
    setActiveTab,
    rightTab,
    setRightTab,
  }
}
