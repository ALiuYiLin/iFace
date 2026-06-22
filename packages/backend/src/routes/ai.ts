import { Router, type Request, type Response } from 'express'

const router = Router()

interface AIChatConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  temperature?: number
  maxTokens?: number
  provider?: string
}

interface AIChatMessage {
  role: string
  content: string
}

// POST /api/ai/chat/completions — Proxy to OpenAI-compatible API
router.post('/chat/completions', async (req: Request, res: Response) => {
  const body = req.body as { config?: AIChatConfig; messages?: AIChatMessage[] }
  const aiConfig = body.config
  const messages = body.messages

  if (!aiConfig?.apiKey) {
    return res.status(400).json({ error: { code: 'INVALID_PARAM', message: '缺少 API Key' } })
  }

  const baseUrl = (aiConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const url = `${baseUrl}/chat/completions`

  const tokenLimitParameter =
    aiConfig.provider === 'openai' || url.includes('api.openai.com')
      ? 'max_completion_tokens'
      : 'max_tokens'

  const payloadBody: Record<string, unknown> = {
    model: aiConfig.model || 'gpt-4o-mini',
    messages,
    temperature: aiConfig.temperature ?? 0.7,
    [tokenLimitParameter]: aiConfig.maxTokens ?? 2000,
    stream: true,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify(payloadBody),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      let errMsg = `API 请求失败 (${response.status})`
      try {
        const errJson = JSON.parse(errText) as { error?: { message?: string } }
        errMsg = errJson?.error?.message ?? errMsg
      } catch { /* ignore */ }
      return res.status(response.status).json({ error: { code: 'AI_ERROR', message: errMsg } })
    }

    // Stream the response back
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    if (!response.body) {
      return res.status(502).json({ error: { code: 'PROXY_ERROR', message: '响应体为空' } })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      res.write(chunk)
    }
    res.end()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误'
    res.status(500).json({ error: { code: 'PROXY_ERROR', message } })
  }
})

export default router
