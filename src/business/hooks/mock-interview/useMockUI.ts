import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBufferedText } from '@/hooks/useBufferedText'
import {
  buildInterviewerMessages,
  buildPlanMessages,
  buildReviewMessages,
  createMockInterviewSession,
  createMockInterviewTurn,
  extractDimensionScores,
  extractOverallScore,
  type MockInterviewSetupInput,
  parseInterviewerReply,
  parsePlan,
  recommendPracticeQuestions,
} from '@/lib/mockInterview'
import { parseResumeFile } from '@/lib/resumeParser'
import type { MockInterviewLevel, MockInterviewSession, MockInterviewType, Question } from '@/types'
import { useMockBase } from './useMockBase'

type BusyState = 'idle' | 'planning' | 'interviewing' | 'reviewing'

interface SetupForm {
  roleTitle: string
  level: MockInterviewLevel
  interviewType: MockInterviewType
  durationMinutes: number
  targetQuestionCount: number
  jdText: string
  resumeText: string
  resumeFileName?: string
}

const DEFAULT_FORM: SetupForm = {
  roleTitle: '前端工程师',
  level: 'mid',
  interviewType: 'comprehensive',
  durationMinutes: 30,
  targetQuestionCount: 6,
  jdText: '',
  resumeText: '',
}

export const levelOptions: MockInterviewLevel[] = ['junior', 'mid', 'senior']
export const typeOptions: MockInterviewType[] = ['technical', 'project', 'comprehensive']

export function useMockUI() {
  const [draftAnswer, setDraftAnswer] = useState('')

  const base = useMockBase({
    onFinalTranscript: useCallback(
      (text: string) => {
        setDraftAnswer((prev) => `${prev}${prev.trim() ? '\n' : ''}${text}`)
      },
      [],
    ),
  })

  const {
    config,
    aiReady,
    saveSession,
    requestAI,
    speech,
    questions,
    sessions,
    loadSessions,
    deleteSession,
  } = base

  const {
    text: streamingText,
    appendText: appendStreamingText,
    resetText: setStreamingText,
  } = useBufferedText()

  const fileRef = useRef<HTMLInputElement>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<SetupForm>(DEFAULT_FORM)
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null)
  const [busy, setBusy] = useState<BusyState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resumeMessage, setResumeMessage] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [parsingResume, setParsingResume] = useState(false)
  const [setupCollapsed, setSetupCollapsed] = useState(false)
  const [scrollToReportOnReady, setScrollToReportOnReady] = useState(false)

  const isBusy = busy !== 'idle'
  const setupIsCollapsed = Boolean(activeSession) && setupCollapsed
  const transcriptScrollKey = `${activeSession?.id ?? ''}:${activeSession?.turns.length ?? 0}:${streamingText.length}`
  const reportReadyKey = activeSession?.report?.createdAt ?? 0
  const busyLabel =
    busy === 'planning'
      ? '正在生成面试计划'
      : busy === 'reviewing'
        ? '正在生成复盘报告'
        : busy === 'interviewing'
          ? '面试官正在思考'
          : ''
  const answerCount = activeSession
    ? activeSession.turns.filter((turn) => turn.role === 'candidate').length
    : 0
  const interviewerQuestionCount = activeSession
    ? activeSession.turns.filter(
        (turn) =>
          turn.role === 'interviewer' && (turn.kind === 'question' || turn.kind === 'follow_up'),
      ).length
    : 0

  const activeRecommendations = useMemo(() => {
    const ids = activeSession?.report?.recommendedQuestionIds ?? []
    if (!ids.length) return []
    const byId = new Map(questions.map((q) => [q.id, q]))
    return ids.map((id) => byId.get(id)).filter((item): item is Question => Boolean(item))
  }, [activeSession?.report?.recommendedQuestionIds, questions])

  /* --- Scrolling effects --- */

  useEffect(() => {
    if (!transcriptScrollKey) return
    const frame = window.requestAnimationFrame(() => {
      transcriptEndRef.current?.scrollIntoView({
        behavior: isBusy ? 'auto' : 'smooth',
        block: 'end',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isBusy, transcriptScrollKey])

  useEffect(() => {
    if (!reportReadyKey || !scrollToReportOnReady) return
    window.requestAnimationFrame(() => {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setScrollToReportOnReady(false)
    })
  }, [reportReadyKey, scrollToReportOnReady])

  /* --- Form helpers --- */

  const updateForm = useCallback((patch: Partial<SetupForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleResumeFile = useCallback(
    async (file: File) => {
      setParsingResume(true)
      setResumeMessage(null)
      setError(null)
      try {
        const parsed = await parseResumeFile(file)
        updateForm({
          resumeText: parsed.text,
          resumeFileName: parsed.fileName,
        })
        setResumeMessage(parsed.warning ?? `已解析 ${parsed.fileName}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : '简历解析失败')
      } finally {
        setParsingResume(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    },
    [updateForm],
  )

  /* --- Core AI handlers --- */

  const finishSession = useCallback(
    async (session: MockInterviewSession) => {
      setBusy('reviewing')
      setStreamingText('')
      setError(null)

      try {
        const rawReport = await requestAI(buildReviewMessages(session), appendStreamingText, 2600)
        const report = {
          markdown: rawReport,
          overallScore: extractOverallScore(rawReport),
          dimensions: extractDimensionScores(rawReport),
          recommendedQuestionIds: [],
          createdAt: Date.now(),
        }
        const sessionWithReport: MockInterviewSession = {
          ...session,
          status: 'completed',
          completedAt: Date.now(),
          report,
        }
        const recommended = recommendPracticeQuestions(sessionWithReport, questions)
        await saveSession({
          ...sessionWithReport,
          report: {
            ...report,
            recommendedQuestionIds: recommended.map((q) => q.id),
          },
        })
        setScrollToReportOnReady(true)
        setStreamingText('')
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成复盘失败')
      } finally {
        setBusy('idle')
      }
    },
    [appendStreamingText, questions, requestAI, saveSession, setStreamingText],
  )

  const handleStartInterview = useCallback(async () => {
    if (!aiReady) {
      setError('请先在设置中启用 AI 并配置 API Key')
      return
    }

    if (!form.roleTitle.trim()) {
      setError('请填写目标岗位')
      return
    }

    if (!form.jdText.trim() && !form.resumeText.trim()) {
      setError('请至少提供 JD 或简历文本')
      return
    }

    setBusy('planning')
    setStreamingText('')
    setError(null)

    const input: MockInterviewSetupInput = { ...form, model: config.model }
    const draftSession = createMockInterviewSession(input)
    setActiveSession(draftSession)

    try {
      const rawPlan = await requestAI(buildPlanMessages(input), appendStreamingText, 1400)
      const fallbackQuestion = `我们先从你的经历开始。请结合简历，介绍一个和 ${form.roleTitle} 最相关的项目。`
      const plan = parsePlan(rawPlan, fallbackQuestion)
      const next: MockInterviewSession = {
        ...draftSession,
        status: 'interviewing',
        plan,
        questionIndex: 1,
        startedAt: Date.now(),
        turns: [createMockInterviewTurn('interviewer', 'question', plan.openingQuestion)],
      }
      await saveSession(next)
      setSetupCollapsed(true)
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成面试计划失败')
      setActiveSession(null)
    } finally {
      setBusy('idle')
    }
  }, [aiReady, config.model, form, requestAI, appendStreamingText, saveSession, setStreamingText])

  const handleSubmitAnswer = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'interviewing' || isBusy) return
    const answer = draftAnswer.trim()
    if (!answer) return

    speech.stop()
    setDraftAnswer('')
    setBusy('interviewing')
    setStreamingText('')
    setError(null)

    const answeredSession = await saveSession({
      ...activeSession,
      turns: [...activeSession.turns, createMockInterviewTurn('candidate', 'answer', answer)],
    })

    try {
      const rawReply = await requestAI(
        buildInterviewerMessages(answeredSession, answer, 'answer'),
        appendStreamingText,
        900,
      )
      const reply = parseInterviewerReply(rawReply)
      const kind =
        reply.action === 'complete'
          ? 'closing'
          : reply.action === 'next_question'
            ? 'question'
            : 'follow_up'
      const nextSession: MockInterviewSession = {
        ...answeredSession,
        turns: [
          ...answeredSession.turns,
          createMockInterviewTurn('interviewer', kind, reply.question),
        ],
        questionIndex:
          reply.action === 'next_question'
            ? Math.min(answeredSession.targetQuestionCount, answeredSession.questionIndex + 1)
            : answeredSession.questionIndex,
        followUpDepth: reply.action === 'follow_up' ? answeredSession.followUpDepth + 1 : 0,
      }
      const saved = await saveSession(nextSession)
      setStreamingText('')

      if (reply.action === 'complete') {
        await finishSession(saved)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '面试官响应失败')
    } finally {
      setBusy('idle')
    }
  }, [
    activeSession,
    appendStreamingText,
    draftAnswer,
    finishSession,
    isBusy,
    requestAI,
    saveSession,
    setStreamingText,
    speech,
  ])

  /* --- Interview control handlers --- */

  const handleClarify = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'interviewing' || isBusy) return

    setBusy('interviewing')
    setStreamingText('')
    setError(null)

    const clarifyText = '请你澄清一下当前问题。'
    const clarifiedSession = await saveSession({
      ...activeSession,
      turns: [...activeSession.turns, createMockInterviewTurn('candidate', 'answer', clarifyText)],
    })

    try {
      const rawReply = await requestAI(
        buildInterviewerMessages(clarifiedSession, clarifyText, 'clarify'),
        appendStreamingText,
        600,
      )
      const reply = parseInterviewerReply(rawReply)
      await saveSession({
        ...clarifiedSession,
        turns: [
          ...clarifiedSession.turns,
          createMockInterviewTurn('interviewer', 'clarification', reply.question),
        ],
      })
      setStreamingText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '澄清问题失败')
    } finally {
      setBusy('idle')
    }
  }, [activeSession, appendStreamingText, isBusy, requestAI, saveSession, setStreamingText])

  const handleRepeatQuestion = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'interviewing' || isBusy) return
    const lastQuestion = [...activeSession.turns]
      .reverse()
      .find((turn) => turn.role === 'interviewer' && turn.kind !== 'closing')
    if (!lastQuestion) return

    await saveSession({
      ...activeSession,
      turns: [
        ...activeSession.turns,
        createMockInterviewTurn(
          'interviewer',
          'clarification',
          `我重复一下：${lastQuestion.content}`,
        ),
      ],
    })
  }, [activeSession, isBusy, saveSession])

  const handleFinishNow = useCallback(async () => {
    if (!activeSession || activeSession.status === 'completed' || isBusy) return
    speech.stop()
    const closing = createMockInterviewTurn(
      'interviewer',
      'closing',
      '好的，本次模拟面试到这里。接下来我会基于刚才的表现做复盘。',
    )
    const next = await saveSession({
      ...activeSession,
      turns: [...activeSession.turns, closing],
    })
    await finishSession(next)
  }, [activeSession, finishSession, isBusy, saveSession, speech])

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId)
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setSetupCollapsed(false)
      }
    },
    [activeSession?.id, deleteSession],
  )

  /* --- Navigation handlers --- */

  const handleSelectSession = useCallback(
    (session: MockInterviewSession) => {
      setActiveSession(session)
      setForm({
        roleTitle: session.roleTitle,
        level: session.level,
        interviewType: session.interviewType,
        durationMinutes: session.durationMinutes,
        targetQuestionCount: session.targetQuestionCount,
        jdText: session.jdText,
        resumeText: session.resumeText,
        resumeFileName: session.resumeFileName,
      })
      setDraftAnswer('')
      setStreamingText('')
      setError(null)
      setSetupCollapsed(true)
    },
    [setStreamingText],
  )

  const handleNewInterview = useCallback(() => {
    speech.stop()
    setActiveSession(null)
    setDraftAnswer('')
    setStreamingText('')
    setError(null)
    setSetupCollapsed(false)
  }, [setStreamingText, speech.stop])

  return {
    // Base data
    config,
    aiReady,
    sessions,
    loadSessions,
    questions,
    saveSession,
    requestAI,
    deleteSession,
    speech,
    // UI state
    form,
    activeSession,
    draftAnswer,
    setDraftAnswer,
    busy,
    error,
    resumeMessage,
    settingsOpen,
    setSettingsOpen,
    parsingResume,
    setupCollapsed,
    setSetupCollapsed,
    streamingText,
    // Computed
    isBusy,
    setupIsCollapsed,
    busyLabel,
    answerCount,
    interviewerQuestionCount,
    activeRecommendations,
    // Refs
    fileRef,
    transcriptEndRef,
    reportRef,
    // Handlers
    updateForm,
    handleResumeFile,
    handleStartInterview,
    handleSubmitAnswer,
    handleClarify,
    handleRepeatQuestion,
    handleFinishNow,
    handleDeleteSession,
    handleSelectSession,
    handleNewInterview,
    finishSession,
  }
}
