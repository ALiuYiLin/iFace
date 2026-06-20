import { useEffect, useMemo, useState } from 'react'

import { Link } from 'react-router-dom'
import { Button, EmptyState, SegmentedRing, Skeleton } from '@/components/ui'
import { StatCard } from '@/components/StatCard'
import { useQuestions } from '@/hooks/useQuestions'
import { getAllQuestionNotes, getCategoryMap } from '@/lib/db'
import type { CategoryMap } from '@/lib/db'
import { DEFAULT_CATEGORY_MAP } from '@/lib/db'
import { filterVisibleQuestions, getHiddenModules } from '@/lib/questionVisibility'
import { useStudyStore } from '@/store/useStudyStore'
import type { QuestionNote } from '@/types'
import { STATUS_LABELS } from '@/types'
import { useNameSpace } from '@/utils'

import {
  DashboardSkeleton,
  DailyQuestionCard,
  IconBook,
  IconCheck,
  IconClock,
  IconRefresh,
  ModuleProgressBar,
  RecentNotesCard,
  StreakBanner,
  StudyPlanCard,
} from '@/business/components/dashboard'

import styles from './Dashboard.module.css'

const ns = useNameSpace(styles)

export default function Dashboard() {
  const { allQuestions, loading, initializing, getDailyIds } = useQuestions()
  const { records, streak, dailyGoal, hiddenCategories } = useStudyStore()

  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })

  useEffect(() => {
    getCategoryMap().then(setCategoryMap)
  }, [])

  const hiddenModules = useMemo(
    () => getHiddenModules(categoryMap, hiddenCategories),
    [categoryMap, hiddenCategories],
  )
  const visibleQuestions = useMemo(
    () => filterVisibleQuestions(allQuestions, hiddenModules),
    [allQuestions, hiddenModules],
  )
  const visibleQuestionIds = useMemo(
    () => visibleQuestions.map((question) => question.id),
    [visibleQuestions],
  )

  const [questionNotes, setQuestionNotes] = useState<QuestionNote[]>([])
  const [dailyIds, setDailyIds] = useState<string[]>([])
  const [dailyLoading, setDailyLoading] = useState(true)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadQuestionNotes = async () => {
      try {
        const notes = await getAllQuestionNotes()
        if (!cancelled) setQuestionNotes(notes)
      } catch {
        if (!cancelled) setQuestionNotes([])
      }
    }

    loadQuestionNotes()
    window.addEventListener('focus', loadQuestionNotes)
    return () => {
      cancelled = true
      window.removeEventListener('focus', loadQuestionNotes)
    }
  }, [])

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 6) setGreeting('夜深了，注意休息')
    else if (h < 10) setGreeting('早上好，开始今天的备战')
    else if (h < 13) setGreeting('上午好，专注备战')
    else if (h < 17) setGreeting('下午好，继续加油')
    else if (h < 20) setGreeting('晚上好，刷题时间到')
    else setGreeting('晚上好，坚持就是胜利')
  }, [])

  useEffect(() => {
    if (visibleQuestionIds.length === 0) {
      setDailyIds([])
      setDailyLoading(false)
      return
    }
    setDailyLoading(true)
    getDailyIds(
      Object.fromEntries(
        Object.entries(records).map(([k, v]) => [
          k,
          { status: v.status, lastUpdated: v.lastUpdated },
        ]),
      ),
      dailyGoal,
      visibleQuestionIds,
    )
      .then(setDailyIds)
      .finally(() => setDailyLoading(false))
  }, [visibleQuestionIds, records, getDailyIds, dailyGoal])

  // Counts based on visible questions only
  const counts = useMemo(() => {
    const visibleIds = new Set(visibleQuestions.map((q) => q.id))
    let mastered = 0
    let review = 0
    for (const [id, r] of Object.entries(records)) {
      if (!visibleIds.has(id)) continue
      if (r.status === 'mastered') mastered++
      else if (r.status === 'review') review++
    }
    const tracked = mastered + review
    const unlearned = Math.max(0, visibleQuestions.length - tracked)
    return { mastered, review, unlearned }
  }, [records, visibleQuestions])

  const totalQuestions = visibleQuestions.length
  const masteredPercent =
    totalQuestions > 0 ? Math.round((counts.mastered / totalQuestions) * 100) : 0
  const remainingQuestions = Math.max(0, totalQuestions - counts.mastered)
  const estimatedDays =
    remainingQuestions === 0 ? 0 : Math.ceil(remainingQuestions / Math.max(1, dailyGoal))

  const recentNoteItems = useMemo(() => {
    const questionMap = new Map(visibleQuestions.map((q) => [q.id, q]))
    return questionNotes
      .filter((note) => note.content.trim().length > 0 && questionMap.has(note.questionId))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((note) => ({
        note,
        question: questionMap.get(note.questionId)!,
      }))
  }, [questionNotes, visibleQuestions])

  // Module progress: derive from visible questions grouped by module,
  // preserving the order defined in the category map, then appending any
  // modules not covered by any category.
  const moduleStats = useMemo(() => {
    // Ordered module names from visible categories
    const orderedModules: string[] = []
    const seen = new Set<string>()
    // Sort categories by their order field
    const sortedCategories = Object.entries(categoryMap).sort(([, a], [, b]) => {
      const aOrder = a.order ?? 99
      const bOrder = b.order ?? 99
      return aOrder - bOrder
    })
    for (const [catName, category] of sortedCategories) {
      if (hiddenCategories.has(catName)) continue
      for (const m of category.modules) {
        if (!seen.has(m)) {
          orderedModules.push(m)
          seen.add(m)
        }
      }
    }
    // Append any module present in visibleQuestions but not in any category
    for (const q of visibleQuestions) {
      if (!seen.has(q.module)) {
        orderedModules.push(q.module)
        seen.add(q.module)
      }
    }

    return orderedModules
      .map((mod) => ({
        module: mod,
        questions: visibleQuestions.filter((q) => q.module === mod),
      }))
      .filter((s) => s.questions.length > 0)
  }, [visibleQuestions, categoryMap, hiddenCategories])

  if (initializing) {
    return (
      <div className="page-container">
        <DashboardSkeleton />
      </div>
    )
  }

  const hasNoQuestions = allQuestions.length === 0 && !loading
  const allHidden = allQuestions.length > 0 && totalQuestions === 0

  return (
    <div className="page-container">
      {/* ── Streak Banner ── */}
      {!hasNoQuestions && <StreakBanner streak={streak} dailyGoal={dailyGoal} />}

      {/* ── Greeting ── */}
      <div className={ns('greeting', 'animate-fade-in')}>
        <h1 className={ns('greetingTitle')}>{greeting}</h1>
        <p className={ns('greetingSub')}>
          {hasNoQuestions
            ? '暂无题目，请先导入题库'
            : allHidden
              ? '所有题库已关闭展示，可在设置 → 刷题偏好中调整'
              : `共 ${totalQuestions} 道题，已掌握 ${counts.mastered} 道`}
        </p>
      </div>

      {hasNoQuestions ? (
        <div className={ns('emptyStateCard', 'card')}>
          <EmptyState
            title="题库为空"
            description="前往「导入题目」页面，导入内置题库或自定义 JSON 文件"
            action={
              <Link to="/import">
                <Button variant="primary">前往导入</Button>
              </Link>
            }
          />
        </div>
      ) : allHidden ? (
        <div className={ns('emptyStateCard', 'card')}>
          <EmptyState
            title="所有题库已关闭展示"
            description="在「设置 → 刷题偏好 → 题库展示」中启用至少一个题库"
          />
        </div>
      ) : (
        <>
          {/* ── Stats Row ── */}
          <div className={ns('statsRow')}>
            <StatCard
              label="题目总数"
              value={totalQuestions}
              accentColor="var(--surface-3)"
              delay={0}
              icon={<IconBook />}
            />
            <StatCard
              label="已掌握"
              value={counts.mastered}
              sub={`占比 ${masteredPercent}%`}
              accentColor="var(--success-light)"
              delay={0.05}
              icon={<IconCheck />}
            />
            <StatCard
              label="待复习"
              value={counts.review}
              accentColor="var(--warning-light)"
              delay={0.1}
              icon={<IconRefresh />}
            />
            <StatCard
              label="预计完成"
              value={estimatedDays === 0 ? '已完成' : `${estimatedDays} 天`}
              sub={estimatedDays > 0 ? `每天 ${dailyGoal} 题` : undefined}
              accentColor="var(--surface-3)"
              delay={0.15}
              icon={<IconClock />}
            />
          </div>

          {/* ── Main Grid ── */}
          <div className={ns('mainGrid')}>
            {/* Overall Progress */}
            <div className={ns('progressCard', 'card', 'animate-fade-in', 'stagger-2')}>
              <h2 className={ns('sectionTitle', 'progressTitle')}>总体进度</h2>

              <div className={ns('ringContainer')}>
                <SegmentedRing
                  mastered={counts.mastered}
                  review={counts.review}
                  total={totalQuestions}
                  size={130}
                  strokeWidth={10}
                  label={
                    <div style={{ textAlign: 'center' }}>
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: 'var(--text)',
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {masteredPercent}%
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                        已掌握
                      </p>
                    </div>
                  }
                />

                <div className={ns('ringLegend')}>
                  {(
                    [
                      {
                        key: 'mastered',
                        label: STATUS_LABELS.mastered,
                        dotClass: 'legendDotMastered',
                        count: counts.mastered,
                      },
                      {
                        key: 'review',
                        label: STATUS_LABELS.review,
                        dotClass: 'legendDotReview',
                        count: counts.review,
                      },
                      {
                        key: 'unlearned',
                        label: STATUS_LABELS.unlearned,
                        dotClass: 'legendDotUnlearned',
                        count: counts.unlearned,
                      },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className={ns('legendItem')}>
                      <span className={ns('legendDot', item.dotClass)} />
                      <span className={ns('legendLabel')}>{item.label}</span>
                      <span className={ns('legendCount')}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={ns('progressActions')}>
                <Link to="/questions" style={{ flex: 1 }}>
                  <Button variant="secondary" size="sm" fullWidth>
                    浏览题库
                  </Button>
                </Link>
                <Link to="/practice" style={{ flex: 1 }}>
                  <Button variant="primary" size="sm" fullWidth>
                    开始练习
                  </Button>
                </Link>
              </div>
            </div>

            {/* Module Progress */}
            <div className={ns('moduleProgressCard', 'card', 'animate-fade-in', 'stagger-3')}>
              <div className={ns('moduleProgressHeader')}>
                <h2 className={ns('sectionTitle')}>模块进度</h2>
                <Link to="/questions" className={ns('moduleProgressLink')}>
                  查看全部
                </Link>
              </div>

              <div className={ns('moduleProgressList', 'no-scrollbar')}>
                {moduleStats.map(({ module, questions: qs }) => (
                  <ModuleProgressBar
                    key={module}
                    module={module}
                    questions={qs}
                    records={records}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={ns('learningFocusGrid')}>
            <StudyPlanCard
              dailyIds={dailyIds}
              questions={visibleQuestions}
              records={records}
              moduleStats={moduleStats}
              counts={counts}
              dailyGoal={dailyGoal}
              streak={streak}
            />

            <RecentNotesCard notes={recentNoteItems.slice(0, 4)} total={recentNoteItems.length} />
          </div>

          {/* ── Today's Recommendations ── */}
          <div className={ns('recommendationCard', 'card', 'animate-fade-in', 'stagger-4')}>
            <div className={ns('recommendationHeader')}>
              <div>
                <h2 className={ns('recommendationTitle')}>今日推荐</h2>
                <p className={ns('recommendationSub')}>优先待复习，其次未学习高频题</p>
              </div>
              <div className={ns('recommendationStats')}>
                {dailyIds.length > 0 && (
                  <span className={ns('todayDoneText')}>
                    {dailyIds.filter((id) => records[id]?.status === 'mastered').length}/
                    {dailyIds.length} 完成
                  </span>
                )}
                {dailyIds.length > 0 && (
                  <Link to={`/practice?ids=${dailyIds.join(',')}`}>
                    <Button variant="primary" size="sm" className="px-2!">
                      连续刷题
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {dailyLoading ? (
              <div className={ns('dailyGrid')}>
                {['1', '2', '3', '4', '5', '6'].map((key) => (
                  <div key={key} className={ns('dailySkeletonCard')}>
                    <Skeleton width={22} height={22} rounded="sm" />
                    <div className={ns('dailySkeletonBody')}>
                      <Skeleton width="80%" height={12} />
                      <Skeleton width="45%" height={11} />
                    </div>
                  </div>
                ))}
              </div>
            ) : dailyIds.length === 0 ? (
              <EmptyState title="今日已全部完成" description="所有题目都已掌握，真棒！" />
            ) : (
              <div className={ns('dailyGrid')}>
                {dailyIds.map((id, i) => (
                  <DailyQuestionCard
                    key={id}
                    questionId={id}
                    index={i}
                    questions={visibleQuestions}
                    records={records}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
