import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { useBufferedText } from '@/hooks/useBufferedText'
import { type AIMessage, buildQuestionSystemSuffix, getAIQuickActions, useAIStore } from '@/store/useAIStore'
import type { Question } from '@/types'
import { useNameSpace } from '@/utils'
import styles from './AIPanel.module.css'

const ns = useNameSpace(styles)

// ─── Inline SVG Icons ──────────────────────────────────────────────────────────

function IconSend() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
}
function IconStop() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
}
function IconClear() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}
function IconBot() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" /><circle cx="7.5" cy="14.5" r="1.5" /><circle cx="16.5" cy="14.5" r="1.5" /></svg>
}
function IconUser() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
function IconChevronDown() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
}
function IconChevronUp() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
}
function IconCopy() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
}
function IconCheckSmall() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
}
function IconRetry() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isStreaming, streamingText, copied, retryDisabled, onCopy, onRetry }: {
  message: AIMessage; isStreaming?: boolean; streamingText?: string; copied?: boolean; retryDisabled?: boolean; onCopy?: () => void; onRetry?: () => void
}) {
  return (
    <div className={ns('bubble')} data-role={message.role}>
      <div className={ns('avatar')} data-role={message.role}>
        {message.role === 'assistant' ? <IconBot /> : <IconUser />}
      </div>
      <div className={ns('content')}>
        <div className={ns('msg')}>
          {message.role === 'assistant' ? (
            <MarkdownRenderer content={isStreaming ? (streamingText ?? message.content) : message.content} />
          ) : (
            message.content.split('\n').map((line, i) => <p key={i} style={{ margin: 0 }}>{line || ' '}</p>)
          )}
        </div>
        {message.role === 'assistant' && !isStreaming && (
          <div className={ns('msgActions')}>
            <button type="button" aria-label="复制" title="复制" disabled={retryDisabled}
              onClick={onCopy} className={ns('actionBtn')}>
              {copied ? <IconCheckSmall /> : <IconCopy />}
            </button>
            <button type="button" aria-label="重新生成" title="重新生成" disabled={retryDisabled}
              onClick={onRetry} className={ns('actionBtn')}>
              <IconRetry />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AIPanelProps {
  title?: string
  question?: Question
}

export function AIPanel({ title = 'AI 助手', question }: AIPanelProps) {
  const { config, sessions, upsertSessions, replaceSessionMessages } = useAIStore()
  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [collapsedQuickActions, setCollapsedQuickActions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const questionId = question?.id ?? '__global__'
  const session = sessions[questionId] ?? { id: questionId, questionId, messages: [], createdAt: Date.now(), updatedAt: Date.now() }
  const messages = session.messages
  const quickActions = question ? getAIQuickActions(!!question.answer) : []
  const bufferedTextMap: any = useBufferedText()

  const streamingText = streamingId ? (bufferedTextMap[streamingId] ?? '') : ''

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, streamingText])

  useEffect(() => {
    if (!question) return
    setInput('')
    setStreamingId(null)
  }, [question])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || !config.enabled) return

    const userMessage: AIMessage = { role: 'user', content: text }
    const sessionId = questionId
    const existingMessages = sessions[sessionId]?.messages ?? []
    replaceSessionMessages(sessionId, [...existingMessages, userMessage])
    setInput('')

    const systemSuffix = question ? buildQuestionSystemSuffix(question) : ''
    const systemPrompt = `${config.systemPrompt ?? ''}\n${systemSuffix}`.trim()

    const allMessages = [...(sessions[sessionId]?.messages ?? []), userMessage]

    const streamId = `${sessionId}_${Date.now()}`
    setStreamingId(streamId)

    try {
      const { requestChatCompletionStream } = await import('@/lib/aiClient')
      let fullText = ''
      await requestChatCompletionStream({
        config: {
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          provider: config.provider,
          // @ts-expect-error - systemPrompt not in ChatCompletionConfig type
          systemPrompt: systemPrompt,
        },
        messages: allMessages,
        onDelta: (chunk: string) => {
          fullText += chunk
          bufferedTextMap[streamId] = fullText
        },
        signal: new AbortController().signal,
      })
      delete bufferedTextMap[streamId]
      const assistantMessage: AIMessage = { role: 'assistant', content: fullText }
      const current = sessions[sessionId]?.messages ?? []
      replaceSessionMessages(sessionId, [...current, assistantMessage])
    } catch {
      delete bufferedTextMap[streamId]
      const errorMessage: AIMessage = { role: 'assistant', content: '请求失败，请检查网络或 API 配置后重试。' }
      const current = sessions[sessionId]?.messages ?? []
      replaceSessionMessages(sessionId, [...current, errorMessage])
    } finally {
      setStreamingId(null)
    }
  }, [input, config, question, questionId, sessions, upsertSessions])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  const handleCopy = useCallback(async (content: string, msgId: string) => {
    try { await navigator.clipboard.writeText(content) } catch { /* ignore */ }
    setCopiedId(msgId); setTimeout(() => setCopiedId(null), 1800)
  }, [])

  const handleRetry = useCallback(async (_msgIndex: number) => {
    // Removes the last assistant message so user can retry
    const msgs = sessions[questionId]?.messages ?? []
    if (msgs.length < 2) return
    const trimmed = msgs.slice(0, -1)
    upsertSessions([{ ...session, messages: trimmed }])
  }, [sessions, questionId, session, upsertSessions])

  const handleClear = useCallback(() => {
    upsertSessions([{ ...session, messages: [] }])
  }, [session, upsertSessions])

  if (!config.enabled) return null

  return (
    <div className={ns('panel')}>
      {/* Header */}
      <div className={ns('header')}>
        <div className={ns('headerLeft')}>
          <div className={ns('avatar')} data-role="assistant"><IconBot /></div>
          <span className={ns('headerTitle')}>{title}</span>
        </div>
        <div className={ns('headerActions')}>
          {messages.length > 0 && (
            <button type="button" aria-label="清除对话" title="清除对话" onClick={handleClear} className={ns('panelHeaderAction')}><IconClear /></button>
          )}
          {quickActions.length > 0 && (
            <button type="button" aria-label={collapsedQuickActions ? '展开快捷动作' : '收起快捷动作'} title={collapsedQuickActions ? '展开快捷动作' : '收起快捷动作'}
              onClick={() => setCollapsedQuickActions((v) => !v)} className={ns('panelHeaderAction')}>
              {collapsedQuickActions ? <IconChevronDown /> : <IconChevronUp />}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className={ns('messages')}>
        {messages.length === 0 && !streamingId ? (
          <div className={ns('emptyState')}>
            <div className={ns('emptyIcon')}><IconBot /></div>
            <p className={ns('emptyTitle')}>AI 面试助手</p>
            <p className={ns('emptyDesc')}>在下方输入框描述你的需求，或点击快捷动作快速提问。</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg}
                isStreaming={false} copied={copiedId === `${i}`}
                retryDisabled={!!streamingId}
                onCopy={() => handleCopy(msg.content, `${i}`)}
                onRetry={() => handleRetry(i)} />
            ))}
            {streamingId && (
              <MessageBubble message={{ role: 'assistant', content: '' }}
                isStreaming={true} streamingText={streamingText}
                copied={false} retryDisabled={true} />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Bottom */}
      <div className={ns('bottom')}>
        {!collapsedQuickActions && quickActions.length > 0 && (
          <div className={ns('quickActions')}>
            {quickActions.map((action) => (
              <button key={action.id} type="button" className={ns('quickBtn')}
                onClick={() => { setInput(action.prompt); inputRef.current?.focus() }}>
                {action.label}
              </button>
            ))}
          </div>
        )}
        <div className={ns('inputRow')}>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="输入问题…"
            className={`input-base ${ns('input')}`} rows={1} />
          <button type="button" aria-label="发送" disabled={!input.trim() || !config.enabled || !!streamingId}
            onClick={handleSend} className={ns('sendBtn')}>
            {streamingId ? <IconStop /> : <IconSend />}
          </button>
        </div>
      </div>
    </div>
  )
}
