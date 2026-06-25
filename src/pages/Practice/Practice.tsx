import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { useNameSpace } from '@/utils'
import { ModuleCard, DifficultyChip, StatusChip, SessionPreview } from '@/business/components/practice'
import { usePracticeBase, usePracticeDerived, usePracticeUI } from '@/business/hooks/practice'
import type { Difficulty, Module } from '@/types'
import styles from './Practice.module.css'

const ns = useNameSpace(styles)

export default function Practice() {
  const navigate = useNavigate()
  const base = usePracticeBase()
  const ui = usePracticeUI(base)
  const derived = usePracticeDerived(base, ui.selectedModules, ui.selectedDifficulty, ui.selectedStatus)
  const { visibleQuestions, moduleStats, categoriesWithModules, difficultyStats, filteredQuestions, statusCounts } = derived

  const handleStart = useCallback(() => {
    const ids = filteredQuestions.map((q) => q.id)
    ui.handleStart(ids)
  }, [filteredQuestions, ui])

  if (base.initializing) {
    return (
      <div className="page-container">
        <Skeleton width={160} height={26} rounded="lg" style={{ marginBottom: 24 }} />
        <div className={ns('skeleton')}>
          {['1', '2', '3', '4', '5', '6', '7', '8'].map((key) => (
            <div key={key} className={`${ns('skeletonCard')} card`}>
              <Skeleton width="65%" height={13} />
              <Skeleton width="45%" height={11} />
              <Skeleton width="100%" height={3} rounded="full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const noQuestions = base.allQuestions.length === 0
  const allHidden = base.allQuestions.length > 0 && visibleQuestions.length === 0

  return (
    <div className="page-container">
      <div className={`${ns('header')} animate-fade-in`}>
        <h1 className={ns('title')}>专项练习</h1>
        <p className={ns('subtitle')}>自由组合模块、难度和状态，开启专注刷题模式</p>
      </div>

      {noQuestions ? (
        <div className={`${ns('emptyCard')} card`}>
          <EmptyState
            title="题库为空"
            description="请先前往「导入题目」页面加载题库"
            action={<Button variant="primary" onClick={() => navigate('/import')}>前往导入</Button>}
          />
        </div>
      ) : allHidden ? (
        <div className={`${ns('emptyCard')} card`}>
          <EmptyState title="所有题库已关闭展示" description="在「设置 → 刷题偏好 → 题库展示」中启用题库后，可重新选择模块练习" />
        </div>
      ) : (
        <div className={ns('grid')}>
          <div className={ns('left')}>
            {/* Difficulty */}
            <div className="animate-fade-in">
              <p className={ns('sectionLabel')}>难度</p>
              <div className={ns('chipRow')} style={{ marginTop: 10 }}>
                <DifficultyChip difficulty="all" selected={ui.selectedDifficulty === 'all'}
                  count={ui.selectedModules.length > 0 ? visibleQuestions.filter((q) => ui.selectedModules.includes(q.module)).length : visibleQuestions.length}
                  onClick={() => ui.setSelectedDifficulty('all')} />
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <DifficultyChip key={d} difficulty={d} selected={ui.selectedDifficulty === d}
                    count={difficultyStats[d]} onClick={() => ui.setSelectedDifficulty(d)} />
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="animate-fade-in stagger-1">
              <p className={ns('sectionLabel')}>学习状态</p>
              <div className={ns('chipRow')} style={{ marginTop: 10 }}>
                {(['all', 'unlearned', 'review', 'mastered'] as const).map((s) => (
                  <StatusChip key={s} status={s} selected={ui.selectedStatus === s}
                    count={statusCounts[s]} onClick={() => ui.setSelectedStatus(s)} />
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="animate-fade-in stagger-2">
              <div className={ns('sectionHeader')}>
                <p className={ns('sectionLabel')}>选择模块</p>
                {ui.selectedModules.length > 0 && (
                  <button type="button" onClick={() => ui.setSelectedModules([])} className={ns('clearBtn')}>
                    清除选择
                  </button>
                )}
              </div>

              <div className={ns('moduleSections')}>
                {categoriesWithModules.map((cat) => {
                  const catMods = cat.modules as Module[]
                  const allCatSelected = catMods.length > 0 && catMods.every((m) => ui.selectedModules.includes(m))
                  const someCatSelected = catMods.some((m) => ui.selectedModules.includes(m))
                  return (
                    <div key={cat.name}>
                      <div className={ns('categoryHeader')}>
                        <button type="button" onClick={() => ui.toggleCategory(catMods)} className={ns('categoryBtn')}
                          title={allCatSelected ? '取消全选此分类' : '全选此分类'}>
                          <span className={ns('checkbox')}
                            style={{
                              border: allCatSelected ? '1.5px solid var(--primary)' : someCatSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                              background: allCatSelected ? 'var(--primary)' : someCatSelected ? 'var(--primary-light)' : 'transparent',
                            }}>
                            {allCatSelected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            {someCatSelected && !allCatSelected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                          </span>
                          <span className={ns('categoryName')}
                            style={{ color: allCatSelected || someCatSelected ? 'var(--primary)' : 'var(--text-2)' }}>
                            {cat.name}
                          </span>
                        </button>
                        {!cat.builtin && <span className={ns('customBadge')}>自定义</span>}
                        <span className={ns('categoryMeta')}>
                          {catMods.length} 个模块 ·{' '}
                          {catMods.reduce((sum, m) => sum + (moduleStats.find((s) => s.module === m)?.total ?? 0), 0)} 道题
                        </span>
                      </div>

                      <div className={ns('modulesGrid')}>
                        {catMods.map((mod) => {
                          const stat = moduleStats.find((s) => s.module === mod)
                          return (
                            <ModuleCard key={mod} module={mod}
                              selected={ui.selectedModules.includes(mod)}
                              questionCount={stat?.total ?? 0} masteredCount={stat?.mastered ?? 0}
                              onClick={() => ui.toggleModule(mod)} />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className={ns('sessionPreview')}>
            <SessionPreview count={filteredQuestions.length} modules={ui.selectedModules}
              difficulty={ui.selectedDifficulty} statusFilter={ui.selectedStatus}
              onStart={handleStart} onShuffle={() => ui.setIsShuffled(!ui.isShuffled)} isShuffled={ui.isShuffled} />

            {filteredQuestions.length > 0 && (
              <div className={ns('previewList')}>
                <p className={ns('previewLabel')}>前 5 题预览</p>
                <div className={ns('previewItems')}>
                  {filteredQuestions.slice(0, 5).map((q, i) => {
                    const status = base.records[q.id]?.status ?? 'unlearned'
                    const dotColor = status === 'mastered' ? 'var(--success)' : status === 'review' ? 'var(--warning)' : 'var(--border)'
                    return (
                      <div key={q.id} className={`${ns('previewItem')} animate-fade-in`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <span className={ns('previewDot')} style={{ background: dotColor }} />
                        <span className={ns('previewText')}>{q.question}</span>
                      </div>
                    )
                  })}
                  {filteredQuestions.length > 5 && (
                    <p className={ns('previewMore')}>还有 {filteredQuestions.length - 5} 道</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredQuestions.length > 0 && (
        <button type="button" onClick={handleStart} className={ns('fab')}
          aria-label={`开始练习 ${filteredQuestions.length} 道题`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        </button>
      )}
    </div>
  )
}
