import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { useNameSpace } from '@/utils'
import {
  WeakQuestionRow,
  ModuleBreakdown,
  WeakStats,
  WeakSkeleton,
} from '@/business/components/weak-points'
import { useWeakPointsBase, useWeakPointsDerived, useWeakPointsUI, SORT_OPTIONS } from '@/business/hooks/weak-points'
import type { SortMode } from '@/business/hooks/weak-points'
import styles from './WeakPoints.module.css'

const ns = useNameSpace(styles)

export default function WeakPoints() {
  const base = useWeakPointsBase()
  const ui = useWeakPointsUI()
  const derived = useWeakPointsDerived(base, ui.selectedModule, ui.sortMode)

  const { stats, weakItems, displayItems, weakByModule, sessionIds } = derived

  const handleStartSession = useCallback(() => {
    ui.handleStartSession(sessionIds)
  }, [ui, sessionIds])

  const handleMarkAllMastered = useCallback(() => {
    ui.handleMarkAllMastered(displayItems, base.setStatus)
  }, [ui, displayItems, base])

  if (base.initializing) {
    return (
      <div className="page-container" style={{ maxWidth: 760 }}>
        <WeakSkeleton />
      </div>
    )
  }

  return (
    <div className={`${ns('page')} page-container`}>
      {/* ── Header ── */}
      <div className={`${ns('header')} animate-fade-in`}>
        <div>
          <h1 className={ns('title')}>我的薄弱点</h1>
          <p className={ns('subtitle')}>
            标记为「待复习」的题目，优先复习最久未练的
          </p>
        </div>

        {weakItems.length > 0 && sessionIds.length > 0 && (
          <div className={ns('headerAction')}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartSession}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              }
              className="px-2!"
            >
              集中攻克
            </Button>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {weakItems.length === 0 ? (
        <div className={`${ns('emptyCard')} card animate-fade-in`}>
          <EmptyState
            title="暂无待复习题目"
            description="做得很好！所有题目都已掌握，或者还没有开始刷题"
            action={
              <Link to="/questions">
                <Button variant="primary" size="sm">去刷题</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="animate-fade-in stagger-1">
            <WeakStats total={stats.total} avgReviewCount={stats.avgReviewCount} oldest={stats.oldest} />
          </div>

          <div className="animate-fade-in stagger-2">
            <ModuleBreakdown weakByModule={weakByModule} selectedModule={ui.selectedModule} onSelect={ui.setSelectedModule} />
          </div>

          <div className={`${ns('controls')} animate-fade-in stagger-3`}>
            <div className={ns('controlsLeft')}>
              <select value={ui.sortMode} onChange={(e) => ui.setSortMode(e.target.value as SortMode)} className={ns('select')}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className={ns('count')}>{displayItems.length} 道题</span>
            </div>
            <Button
              variant="ghost" size="sm" loading={ui.clearing === 'all'} onClick={handleMarkAllMastered}
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
            >
              全部标为已掌握
            </Button>
          </div>

          <div className={ns('list')}>
            {displayItems.map(({ question: q, record: r }, i) => (
              <WeakQuestionRow key={q.id} question={q} lastUpdated={r.lastUpdated} reviewCount={r.reviewCount} index={i} sessionIds={sessionIds} />
            ))}
          </div>

          {displayItems.length >= 10 && (
            <div className="animate-fade-in">
              <div className={`${ns('tip')} card`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ns('tipIcon')}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className={ns('tipTitle')}>建议每天专项复习</p>
                  <p className={ns('tipText')}>
                    你有 {displayItems.length} 道薄弱题，点击「集中攻克」进入连续刷题模式，每天坚持{' '}
                    {Math.min(10, displayItems.length)} 道，{Math.ceil(displayItems.length / 10)} 天内可全部突破。
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
