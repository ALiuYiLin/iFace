import { useEffect, useMemo, useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { isLearningCheckAnswerCorrect, type LearningCheckQuestion } from '@/lib/learningCheck'
import { useNameSpace } from '@/utils'
import styles from './LearningCheckPanel.module.css'

const ns = useNameSpace(styles)

interface LearningCheckPanelProps { checks: LearningCheckQuestion[] }

type LearningCheckResponses = Record<string, string[]>

function getAnswerText(check: LearningCheckQuestion): string {
  return check.options.filter((o) => check.answerIds.includes(o.id)).map((o) => o.text).join('；')
}

function LearningCheckMarkdown({ content }: { content: string }) {
  return <span className={ns('markdown')}><MarkdownRenderer content={content} /></span>
}

function LearningCheckSummary({ checks, responses, onRestart }: {
  checks: LearningCheckQuestion[]; responses: LearningCheckResponses; onRestart: () => void
}) {
  const correctCount = checks.filter((c) => isLearningCheckAnswerCorrect(c, responses[c.id] ?? [])).length
  const percent = checks.length > 0 ? Math.round((correctCount / checks.length) * 100) : 0
  const passed = correctCount === checks.length

  return (
    <div className={ns('summary')}>
      <div className={ns('summaryCard')} data-passed={passed}>
        <div className={ns('summaryCardBody')}>
          <p className={ns('summaryLabel')}>检验结果</p>
          <h3 className={ns('summaryTitle')}>{passed ? '这组检验全部通过' : '还有几个点值得回看'}</h3>
          <p className={ns('summaryDesc')}>
            {passed ? '说明你已经抓住这道题的核心主线，可以继续下一题。' : '先看错题解释，再回参考答案补一下薄弱处。'}
          </p>
        </div>
        <div className={ns('scoreCard')}>
          <span className={ns('scoreVal')}>{percent}%</span>
          <span className={ns('scoreFraction')}>{correctCount}/{checks.length}</span>
        </div>
      </div>
      <div className={ns('summaryItems')}>
        {checks.map((check, index) => {
          const selectedIds = responses[check.id] ?? []
          const correct = isLearningCheckAnswerCorrect(check, selectedIds)
          return (
            <div key={check.id} className={ns('summaryItem')}>
              <div className={ns('summaryItemHeader')}>
                <span className={ns('summaryIcon')} data-kind={correct ? 'correct' : 'wrong'}>{correct ? '✓' : '×'}</span>
                <p className={ns('summaryQuestion')}>{index + 1}. {check.prompt}</p>
              </div>
              {!correct && <p className={ns('summaryAnswer')}>正确答案：{getAnswerText(check)}</p>}
              <div className={ns('summaryExplanation')}><LearningCheckMarkdown content={check.explanation} /></div>
            </div>
          )
        })}
      </div>
      <div className={ns('navBtns')}>
        <button type="button" onClick={onRestart} className={ns('restartBtn')}>再测一次</button>
      </div>
    </div>
  )
}

export function LearningCheckPanel({ checks }: LearningCheckPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftSelection, setDraftSelection] = useState<string[]>([])
  const [responses, setResponses] = useState<LearningCheckResponses>({})
  const [summaryVisible, setSummaryVisible] = useState(false)

  const currentCheck = checks[currentIndex]
  const submittedSelection = currentCheck ? responses[currentCheck.id] : undefined
  const submitted = Boolean(submittedSelection)
  const selectedIds = submittedSelection ?? draftSelection
  const allAnswered = checks.length > 0 && checks.every((c) => responses[c.id])

  const currentCorrect = useMemo(() => {
    if (!currentCheck || !submittedSelection) return false
    return isLearningCheckAnswerCorrect(currentCheck, submittedSelection)
  }, [currentCheck, submittedSelection])

  useEffect(() => {
    if (!currentCheck) return
    setDraftSelection(responses[currentCheck.id] ?? [])
  }, [currentCheck, responses])

  const submitResponse = (selection: string[]) => {
    if (!currentCheck || selection.length === 0 || submitted) return
    setResponses((cur) => ({ ...cur, [currentCheck.id]: selection }))
  }

  const handleOptionClick = (optionId: string) => {
    if (!currentCheck || submitted) return
    if (currentCheck.kind === 'single') { submitResponse([optionId]); return }
    setDraftSelection((cur) => cur.includes(optionId) ? cur.filter((id) => id !== optionId) : [...cur, optionId])
  }

  const handleNext = () => {
    if (currentIndex < checks.length - 1) { setCurrentIndex((i) => i + 1); return }
    if (allAnswered) setSummaryVisible(true)
  }

  const handleRestart = () => {
    setCurrentIndex(0); setDraftSelection([]); setResponses({}); setSummaryVisible(false)
  }

  if (checks.length === 0) return <div className={ns('empty')}>这道题暂时还没有检验题。</div>
  if (summaryVisible) return <LearningCheckSummary checks={checks} responses={responses} onRestart={handleRestart} />
  if (!currentCheck) return null

  return (
    <div className={ns('root')}>
      <div className={ns('header')}>
        <div style={{ minWidth: 0 }}>
          <h3 className={ns('headerTitle')}>第 {currentIndex + 1} 题 / 共 {checks.length} 题</h3>
        </div>
        <div className={ns('progressDots')}>
          {checks.map((c, i) => (
            <span key={c.id} className={ns('dot')}
              data-active={i === currentIndex} data-answered={Boolean(responses[c.id])} />
          ))}
        </div>
      </div>

      <div className={ns('prompt')}>
        <div className={ns('questionMeta')}>
          <span className={ns('kindBadge')} data-kind={currentCheck.kind}>
            {currentCheck.kind === 'multiple' ? '多选' : '单选'}
          </span>
          <span className={ns('focus')}>{currentCheck.focus}</span>
        </div>
        <LearningCheckMarkdown content={currentCheck.prompt} />
      </div>

      <div className={ns('options')}>
        {currentCheck.options.map((option) => {
          const selected = selectedIds.includes(option.id)
          const isCorrect = currentCheck.answerIds.includes(option.id)
          const isWrong = selected && !isCorrect

          return (
            <button key={option.id} type="button" disabled={submitted}
              data-selected={selected} data-submitted={submitted}
              data-correct={submitted && isCorrect} data-wrong={submitted && isWrong}
              data-multi={currentCheck.kind === 'multiple'}
              onClick={() => handleOptionClick(option.id)} className={ns('optionBtn')}>
              <span className={ns('optionCircle')}>{option.id.toUpperCase()}</span>
              <div className={ns('optionBody')}><LearningCheckMarkdown content={option.text} /></div>
              {submitted && (isCorrect || selected) && (
                <span className={ns('optionResult')} data-kind={isCorrect ? 'correct' : 'wrong'}>
                  {isCorrect ? '正确' : '误选'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {currentCheck.kind === 'multiple' && !submitted && (
        <button type="button" data-valid={draftSelection.length > 0}
          disabled={draftSelection.length === 0}
          onClick={() => submitResponse(draftSelection)} className={ns('submitBtn')}>
          提交选择
        </button>
      )}

      {submitted && (
        <div className={ns('feedback')} data-ok={currentCorrect}>
          <p className={ns('feedbackTitle')}>{currentCorrect ? '答对了' : '答案解析'}</p>
          {!currentCorrect && <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 6 }}>正确答案：{getAnswerText(currentCheck)}</p>}
          <div className={ns('feedbackBody')}><LearningCheckMarkdown content={currentCheck.explanation} /></div>
        </div>
      )}

      <div className={ns('navBtns')}>
        {submitted && (
          <button type="button" disabled={!submitted || (currentIndex === checks.length - 1 && !allAnswered)}
            onClick={handleNext} className={ns('nextBtn')}>
            {currentIndex < checks.length - 1 ? '下一题' : '查看结果'}
          </button>
        )}
      </div>
    </div>
  )
}
