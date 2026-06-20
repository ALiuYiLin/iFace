import { useNameSpace } from '@/utils'
import styles from './FeedbackScorePanel.module.css'

const ns = useNameSpace(styles)

export interface FeedbackScoreDimension {
  label: string
  score: number
  max: number
}

export interface FeedbackScoreSummary {
  total: number
  dimensions: FeedbackScoreDimension[]
  note: string
}

function clampScore(score: number, max: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(max, Math.round(score)))
}

function parseScoreValue(section: string, labelPattern: string, max: number): number | null {
  const match = section.match(
    new RegExp(`${labelPattern}\\s*[：:]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:[/／]\\s*${max})?`, 'i'),
  )
  if (!match) return null
  return clampScore(Number.parseFloat(match[1]), max)
}

export function splitFeedbackScore(markdown: string): {
  content: string
  score: FeedbackScoreSummary | null
} {
  const match = markdown.match(/\n?#{3,5}\s*参考评分\s*\n([\s\S]*?)\s*$/)
  if (!match || match.index === undefined) return { content: markdown, score: null }

  const section = match[1]
  const total = parseScoreValue(section, '总分', 100)
  if (total === null) return { content: markdown, score: null }

  const dimensions = [
    { label: '覆盖度', score: parseScoreValue(section, '覆盖度', 40), max: 40 },
    { label: '准确性', score: parseScoreValue(section, '准确性', 40), max: 40 },
    { label: '表达', score: parseScoreValue(section, '表达(?:质量)?', 20), max: 20 },
  ].filter((item): item is FeedbackScoreDimension => item.score !== null)

  const noteMatch = section.match(/提示\s*[：:]\s*(.+)/)
  const note = noteMatch?.[1]?.trim() || '评分仅供自测参考，以具体改进建议优先。'

  return {
    content: markdown.slice(0, match.index).trimEnd(),
    score: { total, dimensions, note },
  }
}

export interface FeedbackScoreSummary {
  total: number
  dimensions: FeedbackScoreDimension[]
  note: string
}

export interface FeedbackScorePanelProps {
  score: FeedbackScoreSummary
}

export function FeedbackScorePanel({ score }: FeedbackScorePanelProps) {
  return (
    <div className={ns('container')}>
      <div className={ns('header')}>
        <div className={ns('headerLeft')}>
          <span className={ns('headerLabel')}>参考评分</span>
        </div>
        <span className={ns('headerScore')}>{score.total}/100</span>
      </div>

      {score.dimensions.length > 0 && (
        <div className={ns('dimensions')}>
          {score.dimensions.map((dimension) => {
            const percent = dimension.max > 0 ? (dimension.score / dimension.max) * 100 : 0

            return (
              <div key={dimension.label} className={ns('dimensionRow')}>
                <span className={ns('dimensionLabel')}>{dimension.label}</span>
                <span className={ns('barTrack')}>
                  <span className={ns('barFill')} style={{ width: `${percent}%` }} />
                </span>
                <span className={ns('dimensionScore')}>
                  {dimension.score}/{dimension.max}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p className={ns('note')}>{score.note}</p>
    </div>
  )
}
