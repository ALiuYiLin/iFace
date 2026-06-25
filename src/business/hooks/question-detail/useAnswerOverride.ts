import { useCallback, useEffect, useState } from 'react'
import {
  deleteQuestionAnswerOverride,
  getQuestionAnswerOverride,
  putQuestionAnswerOverride,
} from '@/api/compat'
import type { Question, QuestionAnswerOverride } from '@/types'
import type { AnswerOverrideSaveStatus } from '@/business/components/question-detail'

export interface UseAnswerOverrideParams {
  id: string | undefined
  question: Question | undefined
}

export function useAnswerOverride(params: UseAnswerOverrideParams) {
  const [answerOverride, setAnswerOverride] = useState<QuestionAnswerOverride | null>(null)
  const [answerOverrideLoading, setAnswerOverrideLoading] = useState(false)
  const [answerEditMode, setAnswerEditMode] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerSaveStatus, setAnswerSaveStatus] = useState<AnswerOverrideSaveStatus>('idle')
  const [showOriginalAnswer, setShowOriginalAnswer] = useState(false)

  const hasCustomAnswer = Boolean(params.question && answerOverride?.content.trim())

  // Load answer override
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

  const handleStartAnswerEdit = useCallback(() => {
    if (!params.question) return
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
        const saved = await putQuestionAnswerOverride({
          questionId: params.question.id,
          content: answerDraft,
          createdAt: answerOverride?.createdAt ?? now,
          updatedAt: now,
        })
        setAnswerOverride(saved); setAnswerDraft(saved?.content ?? answerDraft)
      }
      setShowOriginalAnswer(false); setAnswerEditMode(false); setAnswerSaveStatus('saved')
      window.setTimeout(() => setAnswerSaveStatus('idle'), 1400)
    } catch { setAnswerSaveStatus('error') }
  }, [answerDraft, answerOverride?.createdAt, answerSaveStatus, params.question])

  const handleToggleOriginalAnswer = useCallback(() => {
    setShowOriginalAnswer((v) => !v)
  }, [])

  return {
    answerOverride,
    answerOverrideLoading,
    answerEditMode,
    answerDraft,
    answerSaveStatus,
    showOriginalAnswer,
    hasCustomAnswer,

    canSaveAnswerOverride: answerDraft.trim().length > 0 && answerSaveStatus !== 'saving',

    setAnswerEditMode,
    setAnswerDraft,
    setAnswerSaveStatus,

    handleStartAnswerEdit,
    handleCancelAnswerEdit,
    handleRestoreDefaultAnswer,
    handleSaveAnswerOverride,
    handleToggleOriginalAnswer,
  }
}

export type AnswerOverrideAPI = ReturnType<typeof useAnswerOverride>
