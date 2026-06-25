import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getQuestionFlag, getQuestionNote, setQuestionStarred } from '@/api/compat'
import { loadLearningChecksForQuestion, type LearningCheckQuestion } from '@/lib/learningCheck'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import type { Question, StudyStatus } from '@/types'
import { DIFFICULTY_STYLES } from '@/types'
import type { AnswerPanelView } from '@/business/components/question-detail'
import { hashAnswerText } from './annotation-utils'
import { useAnswerAnnotations } from './useAnswerAnnotations'
import { useAnswerOverride } from './useAnswerOverride'
import type { SessionStats, RelatedPracticeItem } from './useQuestionDetailDerived'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

function blurActiveControl() {
  const activeElement = document.activeElement
  if (
    activeElement instanceof HTMLElement &&
    activeElement.matches('button, a, [role="button"], [role="tab"]')
  ) {
    activeElement.blur()
  }
}

function withLearningCheckSearch(search: string): string {
  const params = new URLSearchParams(search)
  params.set('check', '1')
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

export function useQuestionDetailUI(params: {
  id: string | undefined
  question: Question | undefined
  isAiEnabled: boolean
  sessionSearch: string
  sessionIdentity: string
  isInSession: boolean
  studyMode: string
  answerNavigationMode: string
  checkSearchParam: string | null
  /** Derived values (from another hook) */
  prevId: string | null
  nextId: string | null
  sessionStats: SessionStats
  relatedPracticeItems: RelatedPracticeItem[]
  currentStatus: StudyStatus
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { setStatus, streak, incrementStreak, mobileQuestionNavEnabled } = useStudyStore()

  // ── UI state ──
  const [answerVisible, setAnswerVisible] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justMarked, setJustMarked] = useState<StudyStatus | null>(null)
  const [lastPressedKey, setLastPressedKey] = useState<'1' | '2' | '3' | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<{
    id: string; questionId: string; text: string
  } | null>(null)
  const [answerPanelView, setAnswerPanelView] = useState<AnswerPanelView>('answer')
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const [starred, setStarred] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [noteRefreshKey, setNoteRefreshKey] = useState(0)
  const [learningChecks, setLearningChecks] = useState<LearningCheckQuestion[]>([])

  // ── Composed hooks ──
  const {
    answerOverride,
    answerOverrideLoading,
    answerEditMode,
    answerDraft,
    answerSaveStatus,
    showOriginalAnswer,
    hasCustomAnswer,
    canSaveAnswerOverride,

    setAnswerEditMode,
    setAnswerDraft,
    handleStartAnswerEdit,
    handleCancelAnswerEdit,
    handleRestoreDefaultAnswer,
    handleSaveAnswerOverride,
    handleToggleOriginalAnswer,
  } = useAnswerOverride({ id: params.id, question: params.question })

  // Computed values from answer override
  const effectiveAnswerText = params.question
    ? hasCustomAnswer ? (answerOverride?.content ?? '') : params.question.answer
    : ''
  const displayedAnswerText =
    params.question && hasCustomAnswer && showOriginalAnswer ? params.question.answer : effectiveAnswerText
  const displayedAnswerHash = hashAnswerText(displayedAnswerText)

  const annotation = useAnswerAnnotations({
    id: params.id,
    questionId: params.id ?? '',
    answerVisible,
    answerPanelView,
    answerEditMode,
    answerOverrideLoading,
    displayedAnswerHash,
  })

  const answerRef = useRef<HTMLDivElement>(null)
  const markingRef = useRef(false)

  // ── Derived from state ──
  const shouldAutoRevealAnswer =
    params.studyMode === 'memory-only' || params.answerNavigationMode === 'check'

  const questionNavigationSearch =
    params.answerNavigationMode === 'check'
      ? withLearningCheckSearch(params.sessionSearch)
      : params.sessionSearch

  // ── Additional UI derivations ──
  const showMobileQuestionNav = mobileQuestionNavEnabled
  const diffStyle = params.question
    ? DIFFICULTY_STYLES[params.question.difficulty]
    : { color: 'var(--text-2)', background: 'var(--surface-3)', borderColor: 'var(--border-subtle)' }
  const answerHeading = hasCustomAnswer
    ? showOriginalAnswer ? '参考答案' : '自定义答案'
    : '参考答案'
  const showAnswerContent = answerPanelView === 'answer'
  const answerContextQuestion = useMemo(
    () => (params.question ? { ...params.question, answer: displayedAnswerText } : null),
    [params.question, displayedAnswerText],
  )
  const showAnswerInputAbove = params.studyMode === 'answer-first'
  const showAnswerInputInside = params.studyMode === 'answer-alongside'
  const hideAnswerInput = params.studyMode === 'memory-only'

  // ── Effects ──
  useEffect(() => {
    markingRef.current = false
    setMarking(false)
    setAnswerVisible(shouldAutoRevealAnswer || params.checkSearchParam === '1')
    setJustMarked(null)
    setLastPressedKey(null)
    setAiInitialPrompt(null)
    setAnswerPanelView('answer')
    setSessionFinished(false)
    setNoteDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    return () => { if (params.id) clearSessionReview(params.id) }
  }, [params.checkSearchParam, params.id, params.sessionIdentity, shouldAutoRevealAnswer])

  useEffect(() => {
    let cancelled = false
    setLearningChecks([])
    if (!params.question) return
    loadLearningChecksForQuestion(params.question)
      .then((checks) => { if (!cancelled) setLearningChecks(checks) })
      .catch(() => { if (!cancelled) setLearningChecks([]) })
    return () => { cancelled = true }
  }, [params.question])

  useEffect(() => {
    if (!params.id) return
    const forcedCheckView =
      learningChecks.length > 0 &&
      (params.answerNavigationMode === 'check' || params.checkSearchParam === '1')
    setAnswerPanelView(forcedCheckView ? 'check' : 'answer')
  }, [params.answerNavigationMode, params.checkSearchParam, learningChecks.length, params.id])

  useEffect(() => {
    if (learningChecks.length === 0 && answerPanelView === 'check') {
      setAnswerPanelView('answer')
    }
  }, [answerPanelView, learningChecks.length])

  useEffect(() => {
    if (searchParams.get('note') !== '1') return
    setNoteDrawerOpen(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('note')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    if (!params.id) { setHasNote(false); return }
    getQuestionNote(params.id)
      .then((note) => { if (!cancelled) setHasNote(Boolean(note?.content.trim())) })
      .catch(() => { if (!cancelled) setHasNote(false) })
    return () => { cancelled = true }
  }, [params.id])

  useEffect(() => {
    let cancelled = false
    if (!params.id) { setStarred(false); return }
    getQuestionFlag(params.id)
      .then((flag) => { if (!cancelled) setStarred(Boolean(flag?.starred)) })
      .catch(() => { if (!cancelled) setStarred(false) })
    return () => { cancelled = true }
  }, [params.id])

  // ── Handlers ──

  const openAIWithPreset = useCallback(
    (preset: 'question' | 'concept') => {
      if (!params.question) return
      const text =
        preset === 'question'
          ? '请围绕这道题做一次面试题讲解：先拆解题目在问什么，再指出考察点，最后给出适合口述的答题思路。'
          : '请讲解这道题背后的核心知识点：按知识框架、关键机制、常见误区和面试延展来组织。'
      setAiInitialPrompt({ id: `${preset}-${params.question.id}-${Date.now()}`, questionId: params.question.id, text })
      setAiDrawerOpen(true)
    },
    [params.question],
  )

  const handleAIInitialPromptConsumed = useCallback((promptId: string) => {
    setAiInitialPrompt((current) => (current?.id === promptId ? null : current))
  }, [])

  const handleSetStatus = useCallback(
    async (status: StudyStatus, key?: '1' | '2' | '3') => {
      if (!params.id || markingRef.current) return
      markingRef.current = true
      setMarking(true)
      setJustMarked(status)
      if (key) setLastPressedKey(key)
      try {
        await setStatus(params.id, status)
        incrementStreak()
        const newStreak = streak.currentStreak + 1
        const milestones = [3, 5, 10, 20, 50]
        if (milestones.includes(newStreak)) setCelebrationStreak(newStreak)
        if (params.isInSession && params.nextId) {
          setTimeout(() => navigate(`/questions/${params.nextId}${questionNavigationSearch}`), 600)
        } else if (params.isInSession) {
          setSessionFinished(true)
        }
      } finally {
        markingRef.current = false
        setMarking(false)
      }
    },
    [params.id, params.isInSession, params.nextId, setStatus, incrementStreak, streak.currentStreak, navigate, questionNavigationSearch],
  )

  const handleRevealAnswer = useCallback(() => {
    setAnswerVisible(true)
    setJustMarked(null)
    setLastPressedKey(null)
    if (learningChecks.length > 0 && params.answerNavigationMode === 'check') {
      setAnswerPanelView('check')
    }
  }, [params.answerNavigationMode, learningChecks.length])

  const navigateTo = useCallback(
    (targetId: string | null | undefined) => {
      if (!targetId) return
      navigate(`/questions/${targetId}${questionNavigationSearch}`)
    },
    [navigate, questionNavigationSearch],
  )

  const handleRetrySession = useCallback(() => {
    if (params.sessionStats.retryIds.length === 0) return
    for (const retryId of params.sessionStats.retryIds) clearSessionReview(retryId)
    markingRef.current = false
    setMarking(false)
    setAnswerVisible(shouldAutoRevealAnswer)
    setJustMarked(null)
    setLastPressedKey(null)
    setAiInitialPrompt(null)
    setSessionFinished(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
    navigate(createPracticeSessionPath(params.sessionStats.retryIds[0], params.sessionStats.retryIds))
  }, [navigate, params.sessionStats.retryIds, shouldAutoRevealAnswer])

  const handleStartRelatedPractice = useCallback(() => {
    if (params.relatedPracticeItems.length === 0) return
    const ids = params.relatedPracticeItems.map((item) => item.question.id)
    navigate(createPracticeSessionPath(ids[0], ids))
  }, [navigate, params.relatedPracticeItems])

  const handleNoteSaved = useCallback(() => {
    setHasNote(true)
    setNoteRefreshKey((v) => v + 1)
  }, [])

  const handleToggleStarred = useCallback(async () => {
    if (!params.id) return
    const next = !starred
    setStarred(next)
    try { await setQuestionStarred(params.id, next) }
    catch { setStarred(!next) }
  }, [params.id, starred])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (isEditableTarget(e.target)) return
      if (settingsOpen || aiDrawerOpen) return
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault(); setNoteDrawerOpen((open) => !open); return
      }
      if (!noteDrawerOpen && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault(); setAiDrawerOpen(true); return
      }
      if (noteDrawerOpen) return
      if (markingRef.current) return
      if (answerPanelView === 'check') {
        if (e.key === 'ArrowRight') { e.preventDefault(); blurActiveControl(); navigateTo(params.nextId) }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); blurActiveControl(); navigateTo(params.prevId) }
        return
      }
      switch (e.key) {
        case ' ': e.preventDefault(); if (!answerVisible) handleRevealAnswer(); break
        case '1': if (answerVisible) handleSetStatus('review', '1'); break
        case '2': if (answerVisible) handleSetStatus('review', '2'); break
        case '3': if (answerVisible) handleSetStatus('mastered', '3'); break
        case 'ArrowRight': e.preventDefault(); blurActiveControl(); navigateTo(params.nextId); break
        case 'ArrowLeft': e.preventDefault(); blurActiveControl(); navigateTo(params.prevId); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answerVisible, handleRevealAnswer, handleSetStatus, navigateTo, params.nextId, params.prevId, aiDrawerOpen, answerPanelView, noteDrawerOpen, settingsOpen])

  // Wire override toggle with panel view reset
  const handleToggleOriginalAnswerWrapper = useCallback(() => {
    setAnswerPanelView('answer')
    handleToggleOriginalAnswer()
  }, [handleToggleOriginalAnswer])

  const showSessionSummary =
    params.isInSession && !params.nextId && answerVisible && (sessionFinished || params.currentStatus !== 'unlearned')
  const showRelatedPractice =
    answerVisible && params.relatedPracticeItems.length > 0 && (!params.isInSession || showSessionSummary)

  return {
    // State
    answerVisible, marking, justMarked, lastPressedKey,
    aiDrawerOpen, aiInitialPrompt, answerPanelView,
    noteDrawerOpen, hasNote,
    starred, settingsOpen,
    celebrationStreak, sessionFinished, noteRefreshKey, learningChecks,

    // Answer override (from sub-hook)
    answerOverride, answerOverrideLoading,
    answerEditMode, answerDraft, answerSaveStatus, showOriginalAnswer,
    hasCustomAnswer, effectiveAnswerText, displayedAnswerText,
    displayedAnswerHash,

    // Answer annotations (from sub-hook)
    answerAnnotations: annotation.answerAnnotations,
    answerSelection: annotation.answerSelection,
    answerCommentOpen: annotation.answerCommentOpen,
    answerCommentDraft: annotation.answerCommentDraft,
    activeAnswerCommentId: annotation.activeAnswerCommentId,
    answerAnnotationSaving: annotation.answerAnnotationSaving,
    answerAnnotationsForDisplayedAnswer: annotation.answerAnnotationsForDisplayedAnswer,
    visibleAnswerAnnotations: annotation.visibleAnswerAnnotations,
    answerContentRef: annotation.answerContentRef,
    answerAnnotationToolbarRef: annotation.answerAnnotationToolbarRef,
    hasLearningCheck: learningChecks.length > 0,
    shouldAutoRevealAnswer,

    // Refs
    answerRef,

    // Annotation setters (wired from sub-hook)
    setAnswerSelection: annotation.setAnswerSelection,
    setAnswerCommentOpen: annotation.setAnswerCommentOpen,
    setAnswerCommentDraft: annotation.setAnswerCommentDraft,
    setActiveAnswerCommentId: annotation.setActiveAnswerCommentId,
    setAnswerEditMode,

    // Direct setters
    setAnswerVisible, setAiDrawerOpen, setAnswerPanelView,
    setNoteDrawerOpen, setHasNote, setAnswerDraft,
    setSettingsOpen, setCelebrationStreak, setSessionFinished,

    // Handlers
    openAIWithPreset, handleAIInitialPromptConsumed,
    handleSetStatus, handleRevealAnswer, navigateTo,
    handleRetrySession, handleStartRelatedPractice,
    handleNoteSaved, handleToggleStarred,

    // Annotation handlers
    handleCreateAnswerAnnotation: annotation.handleCreateAnswerAnnotation,
    handleSaveAnswerComment: annotation.handleSaveAnswerComment,
    handleClearAnswerHighlight: annotation.handleClearAnswerHighlight,
    handleCancelAnswerAnnotation: annotation.handleCancelAnswerAnnotation,
    handleDeleteAnswerAnnotation: annotation.handleDeleteAnswerAnnotation,
    handleDeleteAnswerComment: annotation.handleDeleteAnswerComment,

    // Answer override handlers
    handleStartAnswerEdit,
    handleCancelAnswerEdit,
    handleRestoreDefaultAnswer,
    handleSaveAnswerOverride,
    handleToggleOriginalAnswer: handleToggleOriginalAnswerWrapper,

    // Derived
    showSessionSummary, showRelatedPractice,
    showMobileQuestionNav, diffStyle, answerHeading,
    showAnswerContent, answerContextQuestion, canSaveAnswerOverride,
    showAnswerInputAbove, showAnswerInputInside, hideAnswerInput,
  }
}
