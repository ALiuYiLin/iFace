import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  deleteQuestionAnswerAnnotation,
  deleteQuestionAnswerOverride,
  getQuestionAnswerAnnotations,
  getQuestionAnswerOverride,
  getQuestionFlag,
  getQuestionNote,
  putQuestionAnswerAnnotation,
  putQuestionAnswerOverride,
  setQuestionStarred,
} from '@/lib/db'
import { loadLearningChecksForQuestion, type LearningCheckQuestion } from '@/lib/learningCheck'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import { clearSessionReview, useStudyStore } from '@/store/useStudyStore'
import type { Question, QuestionAnswerAnnotation, QuestionAnswerOverride, StudyStatus } from '@/types'
import type { AnswerAnnotationColor, AnswerSelectionDraft, AnswerOverrideSaveStatus, AnswerPanelView } from '@/business/components/question-detail'
import {
  answerAnnotationRangesEqual,
  answerAnnotationRangesOverlap,
  applyAnswerAnnotationHighlights,
  createAnswerAnnotationId,
  getAnswerAnnotationHighlightColor,
  getNonOverlappingAnswerAnnotations,
  hasAnswerAnnotationNote,
  hashAnswerText,
} from './annotation-utils'
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

function getSelectionTextOffset(root: HTMLElement, node: Node, offset: number): number | null {
  const range = document.createRange()
  try {
    range.selectNodeContents(root)
    range.setEnd(node, offset)
    return range.toString().length
  } catch {
    return null
  } finally {
    range.detach()
  }
}

function getRangeBoundaryOffset(
  root: HTMLElement,
  range: Range,
  boundary: 'start' | 'end',
): number | null {
  return getSelectionTextOffset(
    root,
    boundary === 'start' ? range.startContainer : range.endContainer,
    boundary === 'start' ? range.startOffset : range.endOffset,
  )
}

function getRangeInsideRoot(root: HTMLElement, range: Range): Range | null {
  if (!range.intersectsNode(root)) return null
  const nextRange = range.cloneRange()
  try {
    if (!root.contains(nextRange.startContainer)) {
      nextRange.setStart(root, 0)
    }
    if (!root.contains(nextRange.endContainer)) {
      nextRange.setEnd(root, root.childNodes.length)
    }
    return nextRange
  } catch {
    nextRange.detach()
    return null
  }
}

function getSelectionToolbarRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 1 && rect.height > 1,
  )
  if (rects.length > 0) return rects[0]
  const rect = range.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1 ? rect : null
}

function shouldUseBottomAnswerAnnotationToolbar(): boolean {
  return window.innerWidth <= 640 || window.matchMedia?.('(pointer: coarse)').matches === true
}

function getAnswerSelectionDraft(root: HTMLElement): AnswerSelectionDraft | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const sourceRange = selection.getRangeAt(0)
  const range = getRangeInsideRoot(root, sourceRange)
  if (!range) return null

  const rawStart = getRangeBoundaryOffset(root, range, 'start')
  const rawEnd = getRangeBoundaryOffset(root, range, 'end')
  if (rawStart === null || rawEnd === null || rawStart === rawEnd) return null

  const content = root.textContent ?? ''
  let start = Math.min(rawStart, rawEnd)
  let end = Math.max(rawStart, rawEnd)

  while (start < end && /\s/.test(content[start] ?? '')) start++
  while (end > start && /\s/.test(content[end - 1] ?? '')) end--

  const text = content.slice(start, end)
  if (!text.trim()) return null

  const rect = getSelectionToolbarRect(range)
  if (!rect) {
    range.detach()
    return null
  }

  const toolbarHalfWidth = Math.min(170, Math.max(96, window.innerWidth / 2 - 16))
  const left = Math.min(
    window.innerWidth - toolbarHalfWidth,
    Math.max(toolbarHalfWidth, rect.left + rect.width / 2),
  )
  const placement: AnswerSelectionDraft['placement'] = rect.top >= 64 ? 'top' : 'bottom'
  const top = placement === 'top' ? rect.top : rect.bottom
  const toolbar: AnswerSelectionDraft['toolbar'] = shouldUseBottomAnswerAnnotationToolbar()
    ? 'bottom'
    : 'floating'

  range.detach()
  return { start, end, text, top, left, placement, toolbar }
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
  const { setStatus, streak, incrementStreak } = useStudyStore()

  // ── UI state ──
  const [answerVisible, setAnswerVisible] = useState(false)
  const [marking, setMarking] = useState(false)
  const [justMarked, setJustMarked] = useState<StudyStatus | null>(null)
  const [lastPressedKey, setLastPressedKey] = useState<'1' | '2' | '3' | null>(null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<{
    id: string
    questionId: string
    text: string
  } | null>(null)
  const [answerPanelView, setAnswerPanelView] = useState<AnswerPanelView>('answer')
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const [answerOverride, setAnswerOverride] = useState<QuestionAnswerOverride | null>(null)
  const [answerOverrideLoading, setAnswerOverrideLoading] = useState(false)
  const [answerEditMode, setAnswerEditMode] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerSaveStatus, setAnswerSaveStatus] = useState<AnswerOverrideSaveStatus>('idle')
  const [showOriginalAnswer, setShowOriginalAnswer] = useState(false)
  const [answerAnnotations, setAnswerAnnotations] = useState<QuestionAnswerAnnotation[]>([])
  const [answerSelection, setAnswerSelection] = useState<AnswerSelectionDraft | null>(null)
  const [answerCommentOpen, setAnswerCommentOpen] = useState(false)
  const [answerCommentDraft, setAnswerCommentDraft] = useState('')
  const [activeAnswerCommentId, setActiveAnswerCommentId] = useState<string | null>(null)
  const [answerAnnotationSaving, setAnswerAnnotationSaving] = useState(false)
  const [starred, setStarred] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [noteRefreshKey, setNoteRefreshKey] = useState(0)
  const [learningChecks, setLearningChecks] = useState<LearningCheckQuestion[]>([])

  const answerRef = useRef<HTMLDivElement>(null)
  const answerContentRef = useRef<HTMLDivElement>(null)
  const answerAnnotationToolbarRef = useRef<HTMLDivElement>(null)
  const answerSelectionTimerRef = useRef<number | null>(null)
  const answerSelectingRef = useRef(false)
  const markingRef = useRef(false)

  // ── Derived from state ──
  const hasCustomAnswer = Boolean(params.question && answerOverride?.content.trim())
  const effectiveAnswerText = params.question
    ? hasCustomAnswer
      ? (answerOverride?.content ?? '')
      : params.question.answer
    : ''
  const displayedAnswerText =
    params.question && hasCustomAnswer && showOriginalAnswer ? params.question.answer : effectiveAnswerText
  const displayedAnswerHash = hashAnswerText(displayedAnswerText)

  const answerAnnotationsForDisplayedAnswer = useMemo(
    () => answerAnnotations.filter((annotation) => annotation.answerHash === displayedAnswerHash),
    [answerAnnotations, displayedAnswerHash],
  )
  const visibleAnswerAnnotations = useMemo(
    () => getNonOverlappingAnswerAnnotations(answerAnnotationsForDisplayedAnswer),
    [answerAnnotationsForDisplayedAnswer],
  )

  const shouldAutoRevealAnswer =
    params.studyMode === 'memory-only' || params.answerNavigationMode === 'check'

  const questionNavigationSearch =
    params.answerNavigationMode === 'check'
      ? withLearningCheckSearch(params.sessionSearch)
      : params.sessionSearch

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
    return () => {
      if (params.id) clearSessionReview(params.id)
    }
  }, [params.checkSearchParam, params.id, params.sessionIdentity, shouldAutoRevealAnswer])

  useEffect(() => {
    let cancelled = false
    setLearningChecks([])
    if (!params.question) return

    loadLearningChecksForQuestion(params.question)
      .then((checks) => {
        if (!cancelled) setLearningChecks(checks)
      })
      .catch(() => {
        if (!cancelled) setLearningChecks([])
      })

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
    if (!params.id) {
      setAnswerOverride(null); setAnswerOverrideLoading(false)
      setAnswerEditMode(false); setAnswerDraft('')
      setAnswerSaveStatus('idle'); setShowOriginalAnswer(false)
      return
    }
    setAnswerOverrideLoading(true); setAnswerEditMode(false)
    setAnswerSaveStatus('idle'); setShowOriginalAnswer(false)

    getQuestionAnswerOverride(params.id)
      .then((override) => {
        if (cancelled) return
        setAnswerOverride(override?.content.trim() ? override : null)
        setAnswerDraft(override?.content ?? params.question?.answer ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setAnswerOverride(null)
        setAnswerDraft(params.question?.answer ?? '')
      })
      .finally(() => { if (!cancelled) setAnswerOverrideLoading(false) })

    return () => { cancelled = true }
  }, [params.id, params.question?.answer])

  useEffect(() => {
    let cancelled = false
    if (!params.id) { setAnswerAnnotations([]); return }
    getQuestionAnswerAnnotations(params.id)
      .then((annotations) => { if (!cancelled) setAnswerAnnotations(annotations) })
      .catch(() => { if (!cancelled) setAnswerAnnotations([]) })
    return () => { cancelled = true }
  }, [params.id])

  useEffect(() => {
    setAnswerSelection(null); setAnswerCommentOpen(false)
    setAnswerCommentDraft(''); setActiveAnswerCommentId(null)
  }, [answerEditMode, answerPanelView, answerVisible, displayedAnswerHash])

  useEffect(() => {
    if (!activeAnswerCommentId) return
    const stillVisible = visibleAnswerAnnotations.some(
      (a) => a.id === activeAnswerCommentId && hasAnswerAnnotationNote(a),
    )
    if (!stillVisible) setActiveAnswerCommentId(null)
  }, [activeAnswerCommentId, visibleAnswerAnnotations])

  useEffect(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) return
    const root = answerContentRef.current
    if (!root) return
    let cleanup: (() => void) | null = null
    let frame: number | null = null
    const apply = () => { cleanup?.(); cleanup = applyAnswerAnnotationHighlights(root, visibleAnswerAnnotations) }
    const schedule = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => { frame = null; apply() })
    }
    schedule()
    const obs = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null
    obs?.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      obs?.disconnect()
      cleanup?.()
    }
  }, [answerEditMode, answerOverrideLoading, answerPanelView, answerVisible, visibleAnswerAnnotations])

  useEffect(() => {
    if (!answerSelection) return
    const handler = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (answerAnnotationToolbarRef.current?.contains(target)) return
      if (answerContentRef.current?.contains(target)) return
      setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [answerSelection])

  useEffect(() => {
    let cancelled = false
    if (!params.id) { setStarred(false); return }
    getQuestionFlag(params.id)
      .then((flag) => { if (!cancelled) setStarred(Boolean(flag?.starred)) })
      .catch(() => { if (!cancelled) setStarred(false) })
    return () => { cancelled = true }
  }, [params.id])

  const refreshAnswerSelection = useCallback(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) return
    if (answerCommentOpen || answerAnnotationSaving) return
    const root = answerContentRef.current
    if (!root) return
    const draft = getAnswerSelectionDraft(root)
    if (!draft) { setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft(''); return }
    setAnswerSelection(draft)
    setActiveAnswerCommentId(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
  }, [answerAnnotationSaving, answerCommentOpen, answerEditMode, answerOverrideLoading, answerPanelView, answerVisible])

  const scheduleAnswerSelectionRefresh = useCallback(
    (delay = 180) => {
      if (answerSelectionTimerRef.current !== null) window.clearTimeout(answerSelectionTimerRef.current)
      answerSelectionTimerRef.current = window.setTimeout(() => {
        answerSelectionTimerRef.current = null
        if (!answerSelectingRef.current) refreshAnswerSelection()
      }, delay)
    },
    [refreshAnswerSelection],
  )

  useEffect(() => {
    if (!answerVisible || answerPanelView !== 'answer' || answerEditMode || answerOverrideLoading) return
    const clearScheduled = () => {
      if (answerSelectionTimerRef.current === null) return
      window.clearTimeout(answerSelectionTimerRef.current)
      answerSelectionTimerRef.current = null
    }
    const handleStart = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && answerAnnotationToolbarRef.current?.contains(target)) return
      answerSelectingRef.current = true
      clearScheduled()
    }
    const handleEnd = () => { answerSelectingRef.current = false; scheduleAnswerSelectionRefresh(140) }
    const handleChange = () => { scheduleAnswerSelectionRefresh(220) }
    document.addEventListener('mousedown', handleStart)
    document.addEventListener('touchstart', handleStart)
    document.addEventListener('selectionchange', handleChange)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)
    document.addEventListener('keyup', handleEnd)
    return () => {
      clearScheduled()
      answerSelectingRef.current = false
      document.removeEventListener('mousedown', handleStart)
      document.removeEventListener('touchstart', handleStart)
      document.removeEventListener('selectionchange', handleChange)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
      document.removeEventListener('keyup', handleEnd)
    }
  }, [answerEditMode, answerOverrideLoading, answerPanelView, answerVisible, scheduleAnswerSelectionRefresh])

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

  const handleCreateAnswerAnnotation = useCallback(
    async (kind: QuestionAnswerAnnotation['kind'], color: AnswerAnnotationColor, note = '') => {
      if (!params.question || !answerSelection || answerAnnotationSaving) return
      setAnswerAnnotationSaving(true)
      try {
        const now = Date.now()
        const overlapping = answerAnnotationsForDisplayedAnswer.filter((a) => answerAnnotationRangesOverlap(a, answerSelection))
        const exact = overlapping.find((a) => answerAnnotationRangesEqual(a, answerSelection))
        const replaced = overlapping.filter((a) => a.id !== exact?.id)
        const replacedIds = new Set(replaced.map((a) => a.id))
        const nextNote = kind === 'comment' ? note.trim() : (exact?.note.trim() ?? '')
        const nextHC = kind === 'highlight' ? color : exact ? getAnswerAnnotationHighlightColor(exact) : null
        const annotation = await putQuestionAnswerAnnotation({
          id: exact?.id ?? createAnswerAnnotationId(),
          questionId: params.question.id,
          answerHash: displayedAnswerHash,
          kind: nextNote ? 'comment' : 'highlight',
          color: nextHC ?? color,
          highlightColor: nextHC,
          start: answerSelection.start,
          end: answerSelection.end,
          selectedText: answerSelection.text,
          note: nextNote,
          createdAt: exact?.createdAt ?? now,
          updatedAt: now,
        })
        if (replaced.length > 0) { await Promise.all(replaced.map((a) => deleteQuestionAnswerAnnotation(a.id))).catch(() => {}) }
        setAnswerAnnotations((current) => [annotation, ...current.filter((a) => a.id !== annotation.id && !replacedIds.has(a.id))])
        window.getSelection()?.removeAllRanges()
        setActiveAnswerCommentId(nextNote ? annotation.id : null)
        setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft('')
      } finally { setAnswerAnnotationSaving(false) }
    },
    [answerAnnotationSaving, answerAnnotationsForDisplayedAnswer, answerSelection, displayedAnswerHash, params.question],
  )

  const handleSaveAnswerComment = useCallback(() => {
    if (!answerCommentDraft.trim()) return
    handleCreateAnswerAnnotation('comment', 'blue', answerCommentDraft)
  }, [answerCommentDraft, handleCreateAnswerAnnotation])

  const handleClearAnswerHighlight = useCallback(async () => {
    if (!answerSelection || answerAnnotationSaving) return
    const highlighted = answerAnnotationsForDisplayedAnswer.filter(
      (a) => answerAnnotationRangesOverlap(a, answerSelection) && getAnswerAnnotationHighlightColor(a),
    )
    if (highlighted.length === 0) { setAnswerSelection(null); window.getSelection()?.removeAllRanges(); return }
    setAnswerAnnotationSaving(true)
    try {
      const now = Date.now()
      const deletedIds = new Set<string>()
      const updated: QuestionAnswerAnnotation[] = []
      for (const a of highlighted) {
        if (hasAnswerAnnotationNote(a)) {
          const saved = await putQuestionAnswerAnnotation({ ...a, kind: 'comment', highlightColor: null, updatedAt: now })
          updated.push(saved)
        } else {
          await deleteQuestionAnswerAnnotation(a.id)
          deletedIds.add(a.id)
        }
      }
      setAnswerAnnotations((current) => current.filter((a) => !deletedIds.has(a.id)).map((a) => updated.find((u) => u.id === a.id) ?? a))
      setActiveAnswerCommentId((current) => (current && deletedIds.has(current) ? null : current))
      setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft('')
      window.getSelection()?.removeAllRanges()
    } catch {
      getQuestionAnswerAnnotations(params.id ?? '').then(setAnswerAnnotations).catch(() => {})
    } finally { setAnswerAnnotationSaving(false) }
  }, [answerAnnotationSaving, answerAnnotationsForDisplayedAnswer, answerSelection, params.id])

  const handleCancelAnswerAnnotation = useCallback(() => {
    setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft('')
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleDeleteAnswerAnnotation = useCallback(
    async (annotationId: string) => {
      setActiveAnswerCommentId((current) => (current === annotationId ? null : current))
      setAnswerAnnotations((current) => current.filter((a) => a.id !== annotationId))
      try { await deleteQuestionAnswerAnnotation(annotationId) }
      catch { getQuestionAnswerAnnotations(params.id ?? '').then(setAnswerAnnotations).catch(() => {}) }
    },
    [params.id],
  )

  const handleDeleteAnswerComment = useCallback(
    async (annotationId: string) => {
      const annotation = answerAnnotations.find((a) => a.id === annotationId)
      if (!annotation) return
      const hc = getAnswerAnnotationHighlightColor(annotation)
      setActiveAnswerCommentId((current) => (current === annotationId ? null : current))
      if (!hc) { handleDeleteAnswerAnnotation(annotationId); return }
      const next: QuestionAnswerAnnotation = { ...annotation, kind: 'highlight', color: hc, highlightColor: hc, note: '', updatedAt: Date.now() }
      setAnswerAnnotations((current) => current.map((a) => (a.id === annotationId ? next : a)))
      try {
        const saved = await putQuestionAnswerAnnotation(next)
        setAnswerAnnotations((current) => current.map((a) => (a.id === annotationId ? saved : a)))
      } catch {
        getQuestionAnswerAnnotations(params.id ?? '').then(setAnswerAnnotations).catch(() => {})
      }
    },
    [answerAnnotations, handleDeleteAnswerAnnotation, params.id],
  )

  const handleStartAnswerEdit = useCallback(() => {
    if (!params.question) return
    setAnswerPanelView('answer')
    setAnswerDraft(answerOverride?.content ?? params.question.answer)
    setAnswerEditMode(true); setAnswerSaveStatus('idle'); setShowOriginalAnswer(false)
  }, [answerOverride, params.question])

  const handleCancelAnswerEdit = useCallback(() => {
    setAnswerDraft(answerOverride?.content ?? params.question?.answer ?? '')
    setAnswerEditMode(false); setAnswerSaveStatus('idle')
  }, [answerOverride, params.question?.answer])

  const handleRestoreDefaultAnswer = useCallback(async () => {
    if (!params.question || answerSaveStatus === 'saving') return
    if (answerOverride?.content.trim()) {
      const confirmed = window.confirm('确定恢复默认参考答案吗？当前自定义答案会被删除。')
      if (!confirmed) return
    }
    setAnswerSaveStatus('saving')
    try {
      await deleteQuestionAnswerOverride(params.question.id)
      setAnswerOverride(null); setAnswerDraft(params.question.answer)
      setShowOriginalAnswer(false); setAnswerEditMode(false); setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch { setAnswerSaveStatus('error') }
  }, [answerOverride?.content, answerSaveStatus, params.question])

  const handleSaveAnswerOverride = useCallback(async () => {
    if (!params.question || answerSaveStatus === 'saving') return
    const nextContent = answerDraft.trim()
    if (!nextContent) return
    setAnswerSaveStatus('saving')
    try {
      if (nextContent === params.question.answer.trim()) {
        await deleteQuestionAnswerOverride(params.question.id)
        setAnswerOverride(null); setAnswerDraft(params.question.answer)
      } else {
        const now = Date.now()
        const saved = await putQuestionAnswerOverride({ questionId: params.question.id, content: answerDraft, createdAt: answerOverride?.createdAt ?? now, updatedAt: now })
        setAnswerOverride(saved); setAnswerDraft(saved?.content ?? answerDraft)
      }
      setShowOriginalAnswer(false); setAnswerEditMode(false); setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch { setAnswerSaveStatus('error') }
  }, [answerDraft, answerOverride?.createdAt, answerSaveStatus, params.question])

  const handleToggleOriginalAnswer = useCallback(() => {
    setAnswerPanelView('answer')
    setShowOriginalAnswer((v) => !v)
  }, [])

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

  const showSessionSummary =
    params.isInSession && !params.nextId && answerVisible && (sessionFinished || params.currentStatus !== 'unlearned')
  const showRelatedPractice =
    answerVisible && params.relatedPracticeItems.length > 0 && (!params.isInSession || showSessionSummary)

  return {
    // State
    answerVisible, marking, justMarked, lastPressedKey,
    aiDrawerOpen, aiInitialPrompt, answerPanelView,
    noteDrawerOpen, hasNote, answerOverride, answerOverrideLoading,
    answerEditMode, answerDraft, answerSaveStatus, showOriginalAnswer,
    answerAnnotations, answerSelection, answerCommentOpen, answerCommentDraft,
    activeAnswerCommentId, answerAnnotationSaving, starred, settingsOpen,
    celebrationStreak, sessionFinished, noteRefreshKey, learningChecks,
    hasCustomAnswer, effectiveAnswerText, displayedAnswerText,
    displayedAnswerHash, answerAnnotationsForDisplayedAnswer,
    visibleAnswerAnnotations, hasLearningCheck: learningChecks.length > 0,
    shouldAutoRevealAnswer,

    // Refs
    answerRef, answerContentRef, answerAnnotationToolbarRef,

    // Setters
    setAnswerVisible, setAiDrawerOpen, setAnswerPanelView,
    setNoteDrawerOpen, setHasNote, setAnswerDraft, setAnswerSelection,
    setAnswerCommentOpen, setAnswerCommentDraft, setActiveAnswerCommentId,
    setAnswerEditMode, setSettingsOpen, setCelebrationStreak, setSessionFinished,

    // Handlers
    openAIWithPreset, handleAIInitialPromptConsumed,
    handleSetStatus, handleRevealAnswer, navigateTo,
    handleRetrySession, handleStartRelatedPractice,
    handleNoteSaved, handleToggleStarred,
    handleCreateAnswerAnnotation, handleSaveAnswerComment,
    handleClearAnswerHighlight, handleCancelAnswerAnnotation,
    handleDeleteAnswerAnnotation, handleDeleteAnswerComment,
    handleStartAnswerEdit, handleCancelAnswerEdit,
    handleRestoreDefaultAnswer, handleSaveAnswerOverride,
    handleToggleOriginalAnswer,

    // Derived
    showSessionSummary, showRelatedPractice,
  }
}
