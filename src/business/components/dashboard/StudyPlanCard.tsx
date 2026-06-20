import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import type { Module, StudyStatus } from '@/types'
import { DIFFICULTY_LABELS } from '@/types'
import type { StreakData } from '@/store/useStudyStore'

export function StudyPlanCard({
  dailyIds,
  questions,
  records,
  moduleStats,
  counts,
  dailyGoal,
  streak,
}: {
  dailyIds: string[]
  questions: {
    id: string
    question: string
    module: Module
    difficulty: number
  }[]
  records: Record<string, { status: StudyStatus; lastUpdated?: number }>
  moduleStats: { module: Module; questions: { id: string }[] }[]
  counts: { mastered: number; review: number; unlearned: number }
  dailyGoal: number
  streak: StreakData
}) {
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const dailyQuestions = useMemo(
    () =>
      dailyIds.flatMap((id) => {
        const q = questionMap.get(id)
        return q ? [q] : []
      }),
    [dailyIds, questionMap],
  )
  const nextDailyQuestion = useMemo(
    () => dailyQuestions.find((q) => records[q.id]?.status !== 'mastered'),
    [dailyQuestions, records],
  )
  const oldestReview = useMemo(() => {
    let oldest:
      | {
          id: string
          question: string
          module: Module
          difficulty: number
        }
      | undefined
    let oldestUpdated = Number.POSITIVE_INFINITY

    for (const question of questions) {
      const record = records[question.id]
      if (record?.status !== 'review') continue
      const updated = record.lastUpdated ?? 0
      if (updated < oldestUpdated) {
        oldest = question
        oldestUpdated = updated
      }
    }

    return oldest
  }, [questions, records])

  const moduleFocus = useMemo(() => {
    let best:
      | {
          module: Module
          total: number
          mastered: number
          review: number
          unlearned: number
          percent: number
          score: number
        }
      | undefined

    for (const { module, questions: qs } of moduleStats) {
      const total = qs.length
      let mastered = 0
      let review = 0

      for (const question of qs) {
        const status = records[question.id]?.status
        if (status === 'mastered') mastered++
        if (status === 'review') review++
      }

      const unlearned = total - mastered - review
      const percent = total > 0 ? Math.round((mastered / total) * 100) : 0
      const score = review * 4 + unlearned + (100 - percent) / 20
      const item = {
        module,
        total,
        mastered,
        review,
        unlearned,
        percent,
        score,
      }

      if (item.total > 0 && item.percent < 100 && (!best || item.score > best.score)) {
        best = item
      }
    }

    return best
  }, [moduleStats, records])

  const todayDone = streak.todayCount
  const remainingToday = Math.max(0, dailyGoal - todayDone)
  const todayPercent = Math.min(100, Math.round((todayDone / dailyGoal) * 100))
  const dailyPracticePath =
    dailyIds.length > 0 ? `/practice?ids=${dailyIds.join(',')}` : '/practice'

  const headline =
    remainingToday === 0
      ? '今日目标已完成，可以继续挑战'
      : counts.review > 0
        ? '先处理待复习题目'
        : '补齐今日练习目标'

  const subline =
    counts.review > 0
      ? `${counts.review} 道题正在等待复习，优先清理能更快稳住记忆。`
      : remainingToday > 0
        ? `还差 ${remainingToday} 题完成今日目标，推荐从今日题单继续。`
        : '今天已经完成目标，可以按薄弱模块继续加练。'

  return (
    <div className="card animate-fade-in stagger-1" style={{ padding: 20 }}>
      <div
        className="study-plan-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 18,
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              下一步建议
            </p>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text)',
                lineHeight: 1.35,
                letterSpacing: '-0.01em',
              }}
            >
              {headline}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.65 }}>
              {subline}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 99,
                background: 'var(--surface-3)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${todayPercent}%`,
                  borderRadius: 99,
                  background: remainingToday === 0 ? 'var(--success)' : 'var(--primary)',
                  transition: 'width 0.5s var(--ease-out)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {todayDone}/{dailyGoal} 今日
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={dailyPracticePath} style={{ textDecoration: 'none' }}>
              <Button
                variant="primary"
                size="sm"
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                }
              >
                {dailyIds.length > 0 ? `开始今日 ${dailyIds.length} 题` : '开始练习'}
              </Button>
            </Link>
            {counts.review > 0 ? (
              <Link to="/weak" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm">
                  查看薄弱点
                </Button>
              </Link>
            ) : (
              moduleFocus && (
                <Link
                  to={`/questions?module=${encodeURIComponent(moduleFocus.module)}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="secondary" size="sm">
                    练 {moduleFocus.module}
                  </Button>
                </Link>
              )
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            minWidth: 0,
          }}
          className="study-plan-signals"
        >
          {[
            {
              label: '待复习',
              value: `${counts.review} 道`,
              detail: oldestReview ? oldestReview.module : '暂无堆积',
              color: 'var(--warning)',
              bg: 'var(--warning-light)',
            },
            {
              label: '未学习',
              value: `${counts.unlearned} 道`,
              detail: moduleFocus ? `${moduleFocus.module} 优先` : '题库已覆盖',
              color: 'var(--primary)',
              bg: 'var(--primary-light)',
            },
            {
              label: '薄弱模块',
              value: moduleFocus ? `${moduleFocus.percent}%` : '完成',
              detail: moduleFocus
                ? `${moduleFocus.mastered}/${moduleFocus.total} 已掌握`
                : '没有明显短板',
              color: moduleFocus ? 'var(--danger)' : 'var(--success)',
              bg: moduleFocus ? 'var(--danger-light)' : 'var(--success-light)',
            },
            {
              label: '下一题',
              value: nextDailyQuestion
                ? DIFFICULTY_LABELS[nextDailyQuestion.difficulty as 1 | 2 | 3]
                : '无',
              detail: nextDailyQuestion ? nextDailyQuestion.module : '今日题单已清空',
              color: 'var(--text)',
              bg: 'var(--surface-3)',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-2)',
                padding: '11px 12px',
                minWidth: 0,
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{item.label}</p>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: item.color,
                  lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.value}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  marginTop: 5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.detail}
              </p>
              <div
                style={{
                  width: 22,
                  height: 3,
                  borderRadius: 99,
                  background: item.bg,
                  marginTop: 8,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
