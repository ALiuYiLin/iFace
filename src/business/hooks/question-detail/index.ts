export { useQuestionDetailBase } from './useQuestionDetailBase'
export { useQuestionDetailDerived } from './useQuestionDetailDerived'
export type { SessionStats, RelatedPracticeItem } from './useQuestionDetailDerived'
export { useQuestionDetailUI } from './useQuestionDetailUI'
export { useAnswerAnnotations } from './useAnswerAnnotations'
export type { AnswerAnnotationsAPI } from './useAnswerAnnotations'
export { useAnswerOverride } from './useAnswerOverride'
export type { AnswerOverrideAPI } from './useAnswerOverride'
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
