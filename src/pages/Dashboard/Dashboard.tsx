import { Link } from 'react-router-dom'
import { Button, EmptyState, SegmentedRing, Skeleton } from '@/components/ui'
import { StatCard } from '@/components/StatCard'
import { STATUS_LABELS } from '@/types'
import { useNameSpace } from '@/utils'
import { useDashBoardBase, useDashBoardDerived, useDashboardUI } from '@/business/hooks/dashboard'

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
  const base = useDashBoardBase()
  const derived = useDashBoardDerived(base)
  const { greeting } = useDashboardUI()

  const { records, dailyGoal, allQuestions, loading } = base
  const {
    dailyIds,
    dailyLoading,
    counts,
    totalQuestions,
    masteredPercent,
    estimatedDays,
    visibleQuestions,
    moduleStats,
    recentNoteItems,
  } = derived

  if (base.initializing) {
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
      {!hasNoQuestions && <StreakBanner />}

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
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={ns('learningFocusGrid')}>
            <StudyPlanCard
              dailyIds={dailyIds}
              questions={visibleQuestions}
              moduleStats={moduleStats}
              counts={counts}
            />

            <RecentNotesCard notes={recentNoteItems.slice(0, 4) as any} total={recentNoteItems.length} />
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
