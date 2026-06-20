import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { QuestionAnswerAnnotation } from '@/types'

export type AnswerAnnotationColor = 'yellow' | 'green' | 'blue' | 'pink'

export type AnswerSelectionDraft = {
  start: number
  end: number
  text: string
  top: number
  left: number
  placement: 'top' | 'bottom'
  toolbar: 'floating' | 'bottom'
}

const ANSWER_COMMENT_DESKTOP_CLOSE_DELAY = 20
const ANSWER_COMMENT_MOBILE_SCROLL_CLOSE_DISTANCE = 28

type AnswerCommentTargetRect = {
  left: number
  right: number
  top: number
  bottom: number
}

type AnswerCommentUnderlineRect = {
  left: number
  top: number
  width: number
}

type AnswerCommentTarget = {
  annotation: QuestionAnswerAnnotation
  rects: AnswerCommentTargetRect[]
  underlineRects: AnswerCommentUnderlineRect[]
  popoverLeft: number
  popoverTop: number
  popoverPlacement: 'top' | 'bottom'
}

function hasAnswerAnnotationNote(annotation: QuestionAnswerAnnotation): boolean {
  return annotation.note.trim().length > 0
}

function createTextRange(root: HTMLElement, start: number, end: number): Range | null {
  const range = document.createRange()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let startSet = false
  let current = walker.nextNode()

  while (current) {
    const textLength = current.textContent?.length ?? 0
    const nextOffset = offset + textLength

    if (!startSet && start >= offset && start <= nextOffset) {
      range.setStart(current, Math.max(0, start - offset))
      startSet = true
    }

    if (startSet && end >= offset && end <= nextOffset) {
      range.setEnd(current, Math.max(0, end - offset))
      return range
    }

    offset = nextOffset
    current = walker.nextNode()
  }

  range.detach()
  return null
}

function getAnswerCommentUnderlineRects(
  root: HTMLElement,
  annotation: QuestionAnswerAnnotation,
  rootRect: DOMRect,
): AnswerCommentUnderlineRect[] {
  const rects: AnswerCommentUnderlineRect[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let current = walker.nextNode()

  while (current) {
    const textLength = current.textContent?.length ?? 0
    const nextOffset = offset + textLength
    const start = Math.max(annotation.start, offset)
    const end = Math.min(annotation.end, nextOffset)

    if (start < end) {
      const range = document.createRange()
      try {
        range.setStart(current, start - offset)
        range.setEnd(current, end - offset)
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width <= 1 || rect.height <= 1) continue
          rects.push({
            left: rect.left - rootRect.left + root.scrollLeft,
            top: rect.bottom - rootRect.top + root.scrollTop + 1,
            width: Math.max(0, rect.width),
          })
        }
      } finally {
        range.detach()
      }
    }

    offset = nextOffset
    if (offset >= annotation.end) break
    current = walker.nextNode()
  }

  return rects
}

function getAnswerCommentTarget(
  root: HTMLElement,
  annotation: QuestionAnswerAnnotation,
): AnswerCommentTarget | null {
  const range = createTextRange(root, annotation.start, annotation.end)
  if (!range) return null

  try {
    const rootRect = root.getBoundingClientRect()
    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1,
    )
    const rect = rects.at(-1) ?? range.getBoundingClientRect()
    if (rect.width <= 1 || rect.height <= 1) return null
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      return null
    }

    const popoverHalfWidth = Math.min(132, Math.max(120, window.innerWidth / 2 - 16))
    const popoverLeft = Math.min(
      window.innerWidth - popoverHalfWidth - 12,
      Math.max(popoverHalfWidth + 12, rect.right),
    )
    const popoverPlacement: AnswerCommentTarget['popoverPlacement'] =
      rect.top >= 118 ? 'top' : 'bottom'

    return {
      annotation,
      rects: rects.map((item) => ({
        left: item.left,
        right: item.right,
        top: item.top,
        bottom: item.bottom,
      })),
      underlineRects: getAnswerCommentUnderlineRects(root, annotation, rootRect),
      popoverLeft,
      popoverTop: popoverPlacement === 'top' ? rect.top : rect.bottom,
      popoverPlacement,
    }
  } finally {
    range.detach()
  }
}

function findAnswerCommentTargetAtPoint(
  targets: AnswerCommentTarget[],
  x: number,
  y: number,
): AnswerCommentTarget | null {
  for (const target of targets) {
    const matched = target.rects.some(
      (rect) =>
        x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 4 && y <= rect.bottom + 4,
    )
    if (matched) return target
  }
  return null
}

function shouldUseBottomAnswerAnnotationToolbar(): boolean {
  return window.innerWidth <= 640 || window.matchMedia?.('(pointer: coarse)').matches === true
}

export interface AnswerCommentMarkersProps {
  rootRef: React.RefObject<HTMLDivElement | null>
  annotations: QuestionAnswerAnnotation[]
  activeId: string | null
  onActiveChange: (id: string | null) => void
  onDelete: (id: string) => void
}

export function AnswerCommentMarkers({
  rootRef,
  annotations,
  activeId,
  onActiveChange,
  onDelete,
}: AnswerCommentMarkersProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [targets, setTargets] = useState<AnswerCommentTarget[]>([])

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const scheduleClose = useCallback(
    (delay = ANSWER_COMMENT_DESKTOP_CLOSE_DELAY) => {
      cancelClose()
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null
        onActiveChange(null)
      }, delay)
    },
    [cancelClose, onActiveChange],
  )

  const updateMarkers = useCallback(() => {
    const root = rootRef.current
    if (!root) {
      setTargets([])
      return
    }

    setTargets(
      annotations
        .filter(hasAnswerAnnotationNote)
        .map((annotation) => getAnswerCommentTarget(root, annotation))
        .filter((target): target is AnswerCommentTarget => Boolean(target)),
    )
  }, [annotations, rootRef])

  useLayoutEffect(() => {
    updateMarkers()

    let frame: number | null = null
    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        updateMarkers()
      })
    }

    const root = rootRef.current
    const observer =
      root && typeof MutationObserver !== 'undefined' ? new MutationObserver(scheduleUpdate) : null
    observer?.observe(root as HTMLElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [rootRef, updateMarkers])

  useEffect(() => {
    if (targets.length === 0) return

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) {
        cancelClose()
        return
      }
      if (window.matchMedia?.('(pointer: coarse)').matches === true) return

      const matchedTarget = findAnswerCommentTargetAtPoint(targets, event.clientX, event.clientY)
      if (matchedTarget) {
        cancelClose()
        onActiveChange(matchedTarget.annotation.id)
      } else if (activeId) {
        scheduleClose()
      }
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Node && layerRef.current?.contains(target)) return

      const matchedTarget = findAnswerCommentTargetAtPoint(targets, event.clientX, event.clientY)
      if (matchedTarget) {
        event.preventDefault()
        cancelClose()
        onActiveChange(
          activeId === matchedTarget.annotation.id ? null : matchedTarget.annotation.id,
        )
        return
      }

      if (activeId) onActiveChange(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    return () => {
      cancelClose()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
    }
  }, [activeId, cancelClose, onActiveChange, scheduleClose, targets])

  useEffect(() => {
    if (!activeId || !shouldUseBottomAnswerAnnotationToolbar()) return

    const startY = window.scrollY
    const handleScroll = () => {
      if (Math.abs(window.scrollY - startY) < ANSWER_COMMENT_MOBILE_SCROLL_CLOSE_DISTANCE) return
      onActiveChange(null)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeId, onActiveChange])

  const activeTarget = targets.find((target) => target.annotation.id === activeId)
  const root = rootRef.current
  if (typeof document === 'undefined' || !root || targets.length === 0) return null

  return (
    <>
      {createPortal(
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          {targets.flatMap((target) =>
            target.underlineRects.map((rect, index) => (
              <span
                key={`${target.annotation.id}-${index}`}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: 0,
                  borderBottom: '1.5px dotted rgba(37, 99, 235, 0.82)',
                  pointerEvents: 'none',
                }}
              />
            )),
          )}
        </span>,
        root,
      )}

      {activeTarget &&
        createPortal(
          <div
            ref={layerRef}
            onMouseEnter={cancelClose}
            onMouseLeave={() => scheduleClose()}
            style={{
              position: 'fixed',
              left: activeTarget.popoverLeft,
              top: activeTarget.popoverTop,
              transform:
                activeTarget.popoverPlacement === 'top'
                  ? 'translate(-50%, calc(-100% - 10px))'
                  : 'translate(-50%, 10px)',
              zIndex: 155,
              width: 'min(264px, calc(100vw - 24px))',
              padding: 10,
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface)',
              boxShadow: '0 10px 28px rgba(15,23,42,0.12)',
            }}
            role="dialog"
            aria-label="答案批注"
          >
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--text)',
                wordBreak: 'break-word',
              }}
            >
              {activeTarget.annotation.note}
            </p>
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 6,
              }}
            >
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onDelete(activeTarget.annotation.id)}
                style={{
                  height: 24,
                  padding: '0 8px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                删除批注
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onActiveChange(null)}
                style={{
                  height: 24,
                  padding: '0 8px',
                  borderRadius: 7,
                  border: 'none',
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                收起
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
