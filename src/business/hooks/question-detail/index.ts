export { useQuestionDetailBase } from './useQuestionDetailBase'
export { useQuestionDetailDerived } from './useQuestionDetailDerived'
export type { SessionStats, RelatedPracticeItem } from './useQuestionDetailDerived'
export { useQuestionDetailUI } from './useQuestionDetailUI'
export {
  hashAnswerText,
  getAnswerAnnotationHighlightColor,
  hasAnswerAnnotationNote,
  answerAnnotationRangesOverlap,
  answerAnnotationRangesEqual,
  getNonOverlappingAnswerAnnotations,
  createAnswerAnnotationId,
  applyAnswerAnnotationHighlights,
} from './annotation-utils'
