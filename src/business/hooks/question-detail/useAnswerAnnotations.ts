import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteQuestionAnswerAnnotation,
  getQuestionAnswerAnnotations,
  putQuestionAnswerAnnotation,
} from '@/api/compat'
import type { QuestionAnswerAnnotation } from '@/types'
import type { AnswerAnnotationColor, AnswerSelectionDraft } from '@/business/components/question-detail'
import {
  answerAnnotationRangesEqual,
  answerAnnotationRangesOverlap,
  applyAnswerAnnotationHighlights,
  createAnswerAnnotationId,
  getAnswerAnnotationHighlightColor,
  getNonOverlappingAnswerAnnotations,
  hasAnswerAnnotationNote,
} from './annotation-utils'

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
    if (!root.contains(nextRange.startContainer)) nextRange.setStart(root, 0)
    if (!root.contains(nextRange.endContainer)) nextRange.setEnd(root, root.childNodes.length)
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
  if (!rect) { range.detach(); return null }
  const toolbarHalfWidth = Math.min(170, Math.max(96, window.innerWidth / 2 - 16))
  const left = Math.min(window.innerWidth - toolbarHalfWidth, Math.max(toolbarHalfWidth, rect.left + rect.width / 2))
  const placement: AnswerSelectionDraft['placement'] = rect.top >= 64 ? 'top' : 'bottom'
  const top = placement === 'top' ? rect.top : rect.bottom
  const toolbar: AnswerSelectionDraft['toolbar'] = shouldUseBottomAnswerAnnotationToolbar() ? 'bottom' : 'floating'
  range.detach()
  return { start, end, text, top, left, placement, toolbar }
}

export function useAnswerAnnotations(params: {
  id: string | undefined
  questionId: string
  answerVisible: boolean
  answerPanelView: string
  answerEditMode: boolean
  answerOverrideLoading: boolean
  displayedAnswerHash: string
}) {
  const [answerAnnotations, setAnswerAnnotations] = useState<QuestionAnswerAnnotation[]>([])
  const [answerSelection, setAnswerSelection] = useState<AnswerSelectionDraft | null>(null)
  const [answerCommentOpen, setAnswerCommentOpen] = useState(false)
  const [answerCommentDraft, setAnswerCommentDraft] = useState('')
  const [activeAnswerCommentId, setActiveAnswerCommentId] = useState<string | null>(null)
  const [answerAnnotationSaving, setAnswerAnnotationSaving] = useState(false)

  const answerContentRef = useRef<HTMLDivElement>(null)
  const answerAnnotationToolbarRef = useRef<HTMLDivElement>(null)
  const answerSelectionTimerRef = useRef<number | null>(null)
  const answerSelectingRef = useRef(false)

  // Computed
  const answerAnnotationsForDisplayedAnswer = useMemo(
    () => answerAnnotations.filter((annotation) => annotation.answerHash === params.displayedAnswerHash),
    [answerAnnotations, params.displayedAnswerHash],
  )
  const visibleAnswerAnnotations = useMemo(
    () => getNonOverlappingAnswerAnnotations(answerAnnotationsForDisplayedAnswer),
    [answerAnnotationsForDisplayedAnswer],
  )

  // Load annotations
  useEffect(() => {
    let cancelled = false
    if (!params.id) { setAnswerAnnotations([]); return }
    getQuestionAnswerAnnotations(params.id)
      .then((annotations) => { if (!cancelled) setAnswerAnnotations(annotations) })
      .catch(() => { if (!cancelled) setAnswerAnnotations([]) })
    return () => { cancelled = true }
  }, [params.id])

  // Clear selection when view changes
  useEffect(() => {
    setAnswerSelection(null); setAnswerCommentOpen(false)
    setAnswerCommentDraft(''); setActiveAnswerCommentId(null)
  }, [params.answerEditMode, params.answerPanelView, params.answerVisible, params.displayedAnswerHash])

  // Sync active comment with visible annotations
  useEffect(() => {
    if (!activeAnswerCommentId) return
    const stillVisible = visibleAnswerAnnotations.some((a) => a.id === activeAnswerCommentId && hasAnswerAnnotationNote(a))
    if (!stillVisible) setActiveAnswerCommentId(null)
  }, [activeAnswerCommentId, visibleAnswerAnnotations])

  // Apply highlights to the rendered answer
  useEffect(() => {
    if (!params.answerVisible || params.answerPanelView !== 'answer' || params.answerEditMode || params.answerOverrideLoading) return
    const root = answerContentRef.current
    if (!root) return
    let cleanup: (() => void) | null = null
    let frame: number | null = null
    const apply = () => { cleanup?.(); cleanup = applyAnswerAnnotationHighlights(root, visibleAnswerAnnotations) }
    const schedule = () => { if (frame !== null) return; frame = window.requestAnimationFrame(() => { frame = null; apply() }) }
    schedule()
    const obs = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null
    obs?.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      obs?.disconnect()
      cleanup?.()
    }
  }, [params.answerEditMode, params.answerOverrideLoading, params.answerPanelView, params.answerVisible, visibleAnswerAnnotations])

  // Close selection on outside click
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

  const refreshAnswerSelection = useCallback(() => {
    if (!params.answerVisible || params.answerPanelView !== 'answer' || params.answerEditMode || params.answerOverrideLoading) return
    if (answerCommentOpen || answerAnnotationSaving) return
    const root = answerContentRef.current
    if (!root) return
    const draft = getAnswerSelectionDraft(root)
    if (!draft) { setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft(''); return }
    setAnswerSelection(draft)
    setActiveAnswerCommentId(null)
    setAnswerCommentOpen(false)
    setAnswerCommentDraft('')
  }, [params.answerVisible, params.answerPanelView, params.answerEditMode, params.answerOverrideLoading, answerCommentOpen, answerAnnotationSaving])

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

  // Track text selection events
  useEffect(() => {
    if (!params.answerVisible || params.answerPanelView !== 'answer' || params.answerEditMode || params.answerOverrideLoading) return
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
  }, [params.answerEditMode, params.answerOverrideLoading, params.answerPanelView, params.answerVisible, scheduleAnswerSelectionRefresh])

  // ── Handlers ──

  const handleCreateAnswerAnnotation = useCallback(
    async (kind: QuestionAnswerAnnotation['kind'], color: AnswerAnnotationColor, note = '') => {
      if (!params.questionId || !answerSelection || answerAnnotationSaving) return
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
          questionId: params.questionId,
          answerHash: params.displayedAnswerHash,
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
        if (replaced.length > 0) {
          await Promise.all(replaced.map((a) => deleteQuestionAnswerAnnotation(a.id))).catch(() => {})
        }
        setAnswerAnnotations((current) => [annotation, ...current.filter((a) => a.id !== annotation.id && !replacedIds.has(a.id))])
        window.getSelection()?.removeAllRanges()
        setActiveAnswerCommentId(nextNote ? annotation.id : null)
        setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft('')
      } finally {
        setAnswerAnnotationSaving(false)
      }
    },
    [params.questionId, params.displayedAnswerHash, answerAnnotationSaving, answerAnnotationsForDisplayedAnswer, answerSelection],
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
      setAnswerAnnotations((current) =>
        current.filter((a) => !deletedIds.has(a.id)).map((a) => updated.find((u) => u.id === a.id) ?? a),
      )
      setActiveAnswerCommentId((current) => (current && deletedIds.has(current) ? null : current))
      setAnswerSelection(null); setAnswerCommentOpen(false); setAnswerCommentDraft('')
      window.getSelection()?.removeAllRanges()
    } catch {
      if (params.id) getQuestionAnswerAnnotations(params.id).then(setAnswerAnnotations).catch(() => {})
    } finally {
      setAnswerAnnotationSaving(false)
    }
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
      catch { if (params.id) getQuestionAnswerAnnotations(params.id).then(setAnswerAnnotations).catch(() => {}) }
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
      const next: QuestionAnswerAnnotation = {
        ...annotation, kind: 'highlight', color: hc, highlightColor: hc, note: '', updatedAt: Date.now(),
      }
      setAnswerAnnotations((current) => current.map((a) => (a.id === annotationId ? next : a)))
      try {
        const saved = await putQuestionAnswerAnnotation(next)
        setAnswerAnnotations((current) => current.map((a) => (a.id === annotationId ? saved : a)))
      } catch {
        if (params.id) getQuestionAnswerAnnotations(params.id).then(setAnswerAnnotations).catch(() => {})
      }
    },
    [answerAnnotations, handleDeleteAnswerAnnotation, params.id],
  )

  return {
    answerAnnotations,
    answerSelection,
    answerCommentOpen,
    answerCommentDraft,
    activeAnswerCommentId,
    answerAnnotationSaving,
    answerAnnotationsForDisplayedAnswer,
    visibleAnswerAnnotations,
    answerContentRef,
    answerAnnotationToolbarRef,

    setAnswerSelection,
    setAnswerCommentOpen,
    setAnswerCommentDraft,
    setActiveAnswerCommentId,

    handleCreateAnswerAnnotation,
    handleSaveAnswerComment,
    handleClearAnswerHighlight,
    handleCancelAnswerAnnotation,
    handleDeleteAnswerAnnotation,
    handleDeleteAnswerComment,
  }
}

export type AnswerAnnotationsAPI = ReturnType<typeof useAnswerAnnotations>
