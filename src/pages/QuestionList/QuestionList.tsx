import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { DIFFICULTY_LABELS, DIFFICULTY_STYLES, STATUS_LABELS, STATUS_STYLES } from '@/types'
import { useNameSpace } from '@/utils'
import { useQuestionListBase, useQuestionListDerived, useQuestionListUI } from '@/business/hooks/question-list'
import { FilterPanel, QuestionCard, ListSkeleton } from '@/business/components/question-list'

import styles from './QuestionList.module.css'

const ns = useNameSpace(styles)

const PAGE_SIZE = 30

export default function QuestionList() {
  const base = useQuestionListBase()
  const ui = useQuestionListUI(base)
  const derived = useQuestionListDerived(base, ui)

  const { navigate, allQuestions, getStatus, initializing } = base
  const { filteredQuestions, visibleQuestions, availableModules, starredCount, noteCount, noteSearchMatchedIds, noteSearchSnippets, starredIds, noteIds } = derived
  const {
    keyword,
    setKeyword,
    debouncedKeyword,
    sort,
    handleSortChange,
    selectedModules,
    selectedDifficulties,
    selectedStatuses,
    starredOnly,
    notesOnly,
    toggleModule,
    toggleDifficulty,
    toggleStatus,
    toggleStarredOnly,
    toggleNotesOnly,
    clearFilters,
    startPracticeSession,
    mobileFilterOpen,
    setMobileFilterOpen,
    searchRef,
    mobileFilterButtonRef,
    mobileFilterPanelRef,
    validateModules,
  } = ui

  // ── Pagination ──
  const [page, setPage] = useState(1)

  const pagedQuestions = useMemo(
    () => filteredQuestions.slice(0, page * PAGE_SIZE),
    [filteredQuestions, page],
  )
  const hasMore = pagedQuestions.length < filteredQuestions.length

  const loaderRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setPage((p) => p + 1)
      },
      { threshold: 0.1 },
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [selectedModules, selectedDifficulties, selectedStatuses, starredOnly, notesOnly, debouncedKeyword, sort])

  // ── Validate selectedModules when availableModules changes ──
  useEffect(() => {
    validateModules(availableModules, allQuestions.length > 0)
  }, [allQuestions.length, availableModules, validateModules])

  // ── Practice session handler ──
  const currentSessionIds = useMemo(() => filteredQuestions.map((q) => q.id), [filteredQuestions])

  const handleStartFilteredSession = useCallback(() => {
    startPracticeSession(currentSessionIds)
  }, [currentSessionIds, startPracticeSession])

  // ── Empty state ──
  const hasFilters =
    selectedModules.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedStatuses.length > 0 ||
    starredOnly ||
    notesOnly ||
    debouncedKeyword.length > 0

  const allHidden = allQuestions.length > 0 && visibleQuestions.length === 0
  const emptyStateTitle = allHidden
    ? '所有题库已关闭展示'
    : !hasFilters
      ? '题库为空'
      : starredOnly && starredCount === 0
        ? '还没有重点题'
        : notesOnly && noteCount === 0
          ? '还没有题目笔记'
          : '没有匹配的题目'
  const emptyStateDescription = allHidden
    ? '在「设置 → 刷题偏好 → 题库展示」中启用题库后，这里会重新显示题目'
    : !hasFilters
      ? '请前往「导入题目」页面加载题库'
      : starredOnly && starredCount === 0
        ? '在题目详情中标记重点题后，可在这里集中复习'
        : notesOnly && noteCount === 0
          ? '打开任意题目的笔记入口，记录理解或把 AI 复盘保存为笔记'
          : starredOnly
            ? '当前筛选条件下没有重点题，可以清除部分条件再试'
            : notesOnly
              ? '当前筛选条件下没有带笔记的题目，可以清除部分条件再试'
              : '试试调整筛选条件，或搜索题目、标签、模块和笔记内容'

  return (
    <div className="page-container">
      {/* ── Page header ── */}
      <div className={ns('pageHeader', 'animate-fade-in')}>
        <div>
          <h1 className={ns('pageTitle')}>题库</h1>
          <p className={ns('pageSubtitle')}>
            {hasFilters
              ? `当前显示 ${filteredQuestions.length} / ${visibleQuestions.length} 道题`
              : `共 ${visibleQuestions.length} 道题`}
          </p>
        </div>
        <div className={ns('headerActions')}>
          {/* Mobile filter toggle */}
          <button
            type="button"
            ref={mobileFilterButtonRef}
            onClick={() => setMobileFilterOpen((v) => !v)}
            className={ns('mobileFilterBtn')}
          >
            <svg className={ns('mobileFilterBtnIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            <span>筛选</span>
            {hasFilters && <span className={ns('mobileFilterDot')} />}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className={ns('sortSelect')}
          >
            {['default', 'note-updated', 'difficulty-asc', 'difficulty-desc', 'module'].map((value) => {
              const labels: Record<string, string> = {
                default: '默认排序',
                'note-updated': '最近笔记',
                'difficulty-asc': '难度↑',
                'difficulty-desc': '难度↓',
                module: '按模块',
              }
              return (
                <option key={value} value={value}>
                  {labels[value]}
                </option>
              )
            })}
          </select>

          {currentSessionIds.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartFilteredSession}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              }
              className="question-list-start-btn"
            >
              练习当前
              <span className="question-list-start-count">{currentSessionIds.length}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className={ns('searchBar', 'animate-fade-in')}>
        <svg className={ns('searchIcon')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          type="search"
          placeholder="搜索题目、标签、模块或笔记…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={'input-base ' + ns('searchInput')}
        />
        <div className={ns('searchRight')}>
          {keyword ? (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className={ns('searchClearBtn')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <span className="kbd">/</span>
          )}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasFilters && (
        <div className={ns('filterChips', 'animate-fade-in')}>
          {starredOnly && (
            <button
              type="button"
              onClick={toggleStarredOnly}
              className={ns('chip', 'chipStarred')}
            >
              重点题
              <svg className={ns('chipClearIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {notesOnly && (
            <button
              type="button"
              onClick={toggleNotesOnly}
              className={ns('chip', 'chipNotes')}
            >
              有笔记
              <svg className={ns('chipClearIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {selectedModules.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => toggleModule(m)}
              className={ns('chip', 'chipModule')}
            >
              {m}
              <svg className={ns('chipClearIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          {selectedDifficulties.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDifficulty(d)}
              className={ns('chip', 'chipDifficulty')}
              style={{
                color: DIFFICULTY_STYLES[d].color,
                background: DIFFICULTY_STYLES[d].background,
                borderColor: DIFFICULTY_STYLES[d].borderColor,
              }}
            >
              {DIFFICULTY_LABELS[d]}
              <svg className={ns('chipClearIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          {selectedStatuses.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggleStatus(s)}
              className={ns('chip', 'chipStatus')}
              style={{
                color: STATUS_STYLES[s].color,
                background: STATUS_STYLES[s].background,
                borderColor: STATUS_STYLES[s].borderColor,
              }}
            >
              {STATUS_LABELS[s]}
              <svg className={ns('chipClearIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
          {debouncedKeyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className={ns('chip', 'chipSearch')}
            >
              &ldquo;{debouncedKeyword}&rdquo;
              <svg className={ns('chipClearIcon')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── Main layout ── */}
      <div className={ns('mainLayout')}>
        {/* ── Sidebar filter (desktop) ── */}
        <div className={ns('sidebar')}>
          <FilterPanel
            selectedModules={selectedModules}
            selectedDifficulties={selectedDifficulties}
            selectedStatuses={selectedStatuses}
            starredOnly={starredOnly}
            notesOnly={notesOnly}
            starredCount={starredCount}
            noteCount={noteCount}
            onModuleToggle={toggleModule}
            onDifficultyToggle={toggleDifficulty}
            onStatusToggle={toggleStatus}
            onStarredOnlyToggle={toggleStarredOnly}
            onNotesOnlyToggle={toggleNotesOnly}
            onClear={clearFilters}
            totalFiltered={filteredQuestions.length}
            totalAll={visibleQuestions.length}
            availableModules={availableModules}
          />
        </div>

        {/* ── Mobile filter drawer ── */}
        {mobileFilterOpen && (
          <>
            <button
              type="button"
              aria-label="关闭筛选面板"
              className={ns('mobileOverlay')}
              onClick={() => setMobileFilterOpen(false)}
            />
            <div
              ref={mobileFilterPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="题库筛选"
              tabIndex={-1}
              className={ns('mobilePanel')}
            >
              <div className={'glass ' + ns('mobilePanelContent', 'animate-slide-up')}>
                <div className={ns('mobilePanelHeader')}>
                  <span className={ns('mobilePanelTitle')}>筛选</span>
                  <Button size="sm" variant="ghost" onClick={() => setMobileFilterOpen(false)}>
                    完成
                  </Button>
                </div>
                <FilterPanel
                  selectedModules={selectedModules}
                  selectedDifficulties={selectedDifficulties}
                  selectedStatuses={selectedStatuses}
                  starredOnly={starredOnly}
                  notesOnly={notesOnly}
                  starredCount={starredCount}
                  noteCount={noteCount}
                  onModuleToggle={toggleModule}
                  onDifficultyToggle={toggleDifficulty}
                  onStatusToggle={toggleStatus}
                  onStarredOnlyToggle={toggleStarredOnly}
                  onNotesOnlyToggle={toggleNotesOnly}
                  onClear={clearFilters}
                  totalFiltered={filteredQuestions.length}
                  totalAll={visibleQuestions.length}
                  availableModules={availableModules}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Question list ── */}
        <div className={ns('questionListContainer')}>
          {initializing ? (
            <ListSkeleton />
          ) : filteredQuestions.length === 0 ? (
            <div className="card">
              <EmptyState
                title={emptyStateTitle}
                description={emptyStateDescription}
                action={
                  hasFilters ? (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      清除筛选
                    </Button>
                  ) : (
                    <Link to="/import">
                      <Button variant="primary" size="sm">
                        去导入
                      </Button>
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <div className={ns('questionList')}>
              {pagedQuestions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  status={getStatus(q.id)}
                  index={i}
                  starred={starredIds.has(q.id)}
                  hasNote={noteIds.has(q.id)}
                  noteSearchMatched={noteSearchMatchedIds.has(q.id)}
                  noteSnippet={noteSearchSnippets.get(q.id)}
                />
              ))}

              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={loaderRef} className={ns('loaderSentinel')}>
                  <div className={ns('loaderCards')}>
                    {[
                      'question-list-loader-skeleton-1',
                      'question-list-loader-skeleton-2',
                      'question-list-loader-skeleton-3',
                    ].map((key) => (
                      <div key={key} className={'card ' + ns('loaderCard')}>
                        <Skeleton width={3} height={48} rounded="sm" />
                        <div className={ns('loaderBody')}>
                          <Skeleton width="70%" height={13} />
                          <Skeleton width="40%" height={11} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasMore && filteredQuestions.length > PAGE_SIZE && (
                <p className={ns('allShown')}>
                  已显示全部 {filteredQuestions.length} 道题
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
