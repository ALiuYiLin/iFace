import type { AnswerAnnotationColor, QuestionAnswerAnnotation } from '@/types'

export function hashAnswerText(text: string): string {
  let hash = 5381
  for (let index = 0; index < text.length; index++) {
    hash = (hash * 33) ^ text.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}

export function getAnswerAnnotationHighlightColor(
  annotation: QuestionAnswerAnnotation,
): AnswerAnnotationColor | null {
  if ('highlightColor' in annotation) return annotation.highlightColor ?? null
  return annotation.kind === 'highlight' ? annotation.color : null
}

export function hasAnswerAnnotationNote(annotation: QuestionAnswerAnnotation): boolean {
  return annotation.note.trim().length > 0
}

export function answerAnnotationRangesOverlap(
  left: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
  right: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
): boolean {
  return left.start < right.end && right.start < left.end
}

export function answerAnnotationRangesEqual(
  left: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
  right: Pick<QuestionAnswerAnnotation, 'start' | 'end'>,
): boolean {
  return left.start === right.start && left.end === right.end
}

export function getNonOverlappingAnswerAnnotations(
  annotations: QuestionAnswerAnnotation[],
): QuestionAnswerAnnotation[] {
  const picked: QuestionAnswerAnnotation[] = []
  const newestFirst = [...annotations].sort(
    (left, right) =>
      right.updatedAt - left.updatedAt ||
      right.createdAt - left.createdAt ||
      right.id.localeCompare(left.id),
  )

  for (const annotation of newestFirst) {
    if (picked.some((item) => answerAnnotationRangesOverlap(item, annotation))) continue
    picked.push(annotation)
  }

  return picked.sort((left, right) => left.start - right.start || left.createdAt - right.createdAt)
}

export function createAnswerAnnotationId(): string {
  const cryptoId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `answer-annotation-${Date.now()}-${cryptoId}`
}

export function applyAnswerAnnotationHighlights(
  root: HTMLElement,
  annotations: QuestionAnswerAnnotation[],
): () => void {
  const cssGlobal =
    'CSS' in window ? (CSS as unknown as { highlights?: HighlightRegistryLike }) : null
  const HighlightConstructor = (
    window as Window & {
      Highlight?: new (...ranges: Range[]) => unknown
    }
  ).Highlight

  if (!cssGlobal?.highlights || !HighlightConstructor) return () => {}

  const registry = cssGlobal.highlights
  for (const name of Object.values(ANSWER_ANNOTATION_HIGHLIGHT_NAMES)) {
    registry.delete(name)
  }

  const grouped = new Map<AnswerAnnotationColor, Range[]>()
  for (const annotation of annotations) {
    const range = createTextRange(root, annotation.start, annotation.end)
    if (!range) continue

    const highlightColor = getAnswerAnnotationHighlightColor(annotation)
    if (highlightColor) {
      const ranges = grouped.get(highlightColor) ?? []
      ranges.push(range.cloneRange())
      grouped.set(highlightColor, ranges)
    }

    range.detach()
  }

  for (const [color, ranges] of grouped.entries()) {
    if (ranges.length === 0) continue
    registry.set(ANSWER_ANNOTATION_HIGHLIGHT_NAMES[color], new HighlightConstructor(...ranges))
  }

  return () => {
    for (const name of Object.values(ANSWER_ANNOTATION_HIGHLIGHT_NAMES)) {
      registry.delete(name)
    }
  }
}

interface HighlightRegistryLike {
  set: (name: string, highlight: unknown) => void
  delete: (name: string) => void
}

const ANSWER_ANNOTATION_HIGHLIGHT_NAMES: Record<AnswerAnnotationColor, string> = {
  yellow: 'iface-answer-annotation-yellow',
  green: 'iface-answer-annotation-green',
  blue: 'iface-answer-annotation-blue',
  pink: 'iface-answer-annotation-pink',
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
