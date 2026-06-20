import type { AIChatConfig, AIChatMessage } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * Call AI chat completions via backend proxy (SSE stream).
 * Returns the full response text.
 */
export async function requestChatCompletion(
  config: AIChatConfig,
  messages: AIChatMessage[],
  onDelta?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/ai/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, messages }),
    signal,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }))
    throw new Error(err.error?.message ?? 'AI 请求失败')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    fullText += chunk
    onDelta?.(chunk)
  }

  return fullText
}
