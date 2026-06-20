import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Badge, Button, Kbd, Skeleton, Spinner } from '@/components/ui'
import { LearningCheckPanel } from '@/components/ui/LearningCheckPanel'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { DIFFICULTY_LABELS, DIFFICULTY_STYLES } from '@/types'
import {
  StatusButton,
  SessionProgress,
  ShortcutHints,
  StreakCelebration,
  SessionCompletionCard,
  RelatedPracticeCard,
  MyAnswerInput,
  NoteDrawer,
  AnswerOverrideEditor,
  AnswerOverrideHeaderMeta,
  AnswerPanelTabs,
  MobileQuestionNav,
  AnswerAIButton,
  AnswerAnnotationToolbar,
  AnswerCommentMarkers,
  AIDrawer,
} from '@/business/components/question-detail'
import { useQuestionDetailBase, useQuestionDetailDerived, useQuestionDetailUI } from '@/business/hooks/question-detail'
import { useNameSpace } from '@/utils'
import styles from './QuestionDetail.module.css'

const ns = useNameSpace(styles)

export default function QuestionDetail() {
  const navigate = useNavigate()

  // ── Base data ──
  const base = useQuestionDetailBase()

  // ── Derived data ──
  const derived = useQuestionDetailDerived({
    question: base.question,
    allQuestions: base.allQuestions,
    id: base.id,
    records: base.records,
    getStatus: base.getStatus,
    getRecord: base.getRecord,
    sessionIds: base.sessionIds,
    isInSession: base.isInSession,
    sessionIndex: base.sessionIndex,
    searchParams: base.searchParams,
  })

  // ── UI state and handlers ──
  const ui = useQuestionDetailUI({
    id: base.id,
    question: base.question,
    isAiEnabled: base.isAiEnabled,
    sessionSearch: base.sessionSearch,
    sessionIdentity: base.sessionIdentity,
    isInSession: base.isInSession,
    studyMode: base.studyMode,
    answerNavigationMode: base.answerNavigationMode,
    checkSearchParam: base.checkSearchParam,
    prevId: derived.prevId,
    nextId: derived.nextId,
    sessionStats: derived.sessionStats,
    relatedPracticeItems: derived.relatedPracticeItems,
    currentStatus: derived.currentStatus,
  })

  // ── Derived page values ──
  const showMobileQuestionNav = base.mobileQuestionNavEnabled

  const diffStyle = base.question ? DIFFICULTY_STYLES[base.question.difficulty] : { color: 'var(--text-2)', background: 'var(--surface-3)', borderColor: 'var(--border-subtle)' }
  const answerHeading = ui.hasCustomAnswer
    ? ui.showOriginalAnswer
      ? '参考答案'
      : '自定义答案'
    : '参考答案'
  const showAnswerContent = ui.answerPanelView === 'answer'
  const answerContextQuestion = useMemo(
    () => (base.question ? { ...base.question, answer: ui.displayedAnswerText } : null),
    [base.question, ui.displayedAnswerText],
  )
  const canSaveAnswerOverride = ui.answerDraft.trim().length > 0 && ui.answerSaveStatus !== 'saving'
  const showAnswerInputAbove = base.studyMode === 'answer-first'
  const showAnswerInputInside = base.studyMode === 'answer-alongside'
  const hideAnswerInput = base.studyMode === 'memory-only'

  // ── Loading ──
  if (base.loading) {
    return (
      <div className={`page-container animate-fade-in ${ns('loadingContainer')}`}>
        <Skeleton width={180} height={13} />
        <div className={`card ${ns('loadingCard')}`}>
          <div className={ns('loadingBadges')}>
            <Skeleton width={60} height={22} rounded="md" />
            <Skeleton width={48} height={22} rounded="md" />
          </div>
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={20} />
          <Skeleton width="70%" height={20} />
        </div>
      </div>
    )
  }

  if (!base.question) {
    return (
      <div className={`page-container ${ns('pageContainer')}`}>
        <div className={`card ${ns('notFound')}`}>
          <p className={ns('notFoundTitle')}>找不到该题目</p>
          <p className={ns('notFoundId')}>题目 ID: {base.id}</p>
          <Link to="/questions">
            <Button variant="primary" size="sm">
              返回题库
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`page-container question-detail-page ${ns('pageContainer')}${showMobileQuestionNav ? ` ${ns('hasMobileNav')}` : ''}`}
      >
        {/* Breadcrumb / Session progress */}
        <div className="animate-fade-in">
          {base.isInSession ? (
            <SessionProgress
              current={derived.sessionCurrent}
              total={derived.sessionTotal}
              onExit={() => navigate('/practice')}
            />
          ) : (
            <nav className={ns('breadcrumb')}>
              <Link to="/questions" className={ns('breadcrumbLink')}>
                题库
              </Link>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" className={ns('breadcrumbChevron')}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <Link
                to={`/questions?module=${encodeURIComponent(base.question.module)}`}
                className={ns('breadcrumbLink')}
              >
                {base.question.module}
              </Link>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" className={ns('breadcrumbChevron')}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className={ns('breadcrumbCurrent')}>
                {base.question.question.slice(0, 30)}…
              </span>
            </nav>
          )}
        </div>

        {/* Question Card */}
        <div className={`card animate-fade-in stagger-1 ${ns('questionCard')}`}>
          {/* Meta row */}
          <div className={ns('metaRow')}>
            <span className={ns('moduleBadge')}>{base.question.module}</span>
            <Badge size="sm" variant="ghost" style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: 6,
              border: '1px solid',
              color: diffStyle.color,
              background: diffStyle.background,
              borderColor: diffStyle.borderColor,
            }}>
              {DIFFICULTY_LABELS[base.question.difficulty]}
            </Badge>
            {derived.currentStatus !== 'unlearned' && (
              <Badge size="sm" variant="ghost" style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 5,
                background: derived.currentStatus === 'mastered' ? 'var(--success-light)' : 'var(--warning-light)',
                color: derived.currentStatus === 'mastered' ? 'var(--success)' : 'var(--warning)',
                border: `1px solid ${derived.currentStatus === 'mastered' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                {derived.currentStatus === 'mastered' ? '已掌握' : '待复习'}
              </Badge>
            )}
            <div className={ns('metaActions')}>
              <button
                type="button"
                onClick={ui.handleToggleStarred}
                aria-pressed={ui.starred}
                aria-label={ui.starred ? '取消重点题' : '标记为重点题'}
                title={ui.starred ? '取消重点题' : '标记为重点题'}
                className={`${ns('iconBtn')} ${ui.starred ? ns('iconBtnStarred') : ns('iconBtnUnstarred')}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={ui.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => ui.setNoteDrawerOpen(true)}
                aria-label={ui.hasNote ? '打开题目笔记' : '添加题目笔记'}
                title={`${ui.hasNote ? '打开题目笔记' : '添加题目笔记'}（N）`}
                className={`${ns('iconBtn')} ${ns('iconBtnNote')} ${ui.hasNote ? ns('iconBtnHasNote') : ns('iconBtnNoNote')}`}
              >
                <span className={ns('noteDot')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" />
                    <path d="M8 7h6" />
                    <path d="M8 11h8" />
                  </svg>
                  {ui.hasNote && <span className={ns('noteDot')} />}
                </span>
              </button>
            </div>
          </div>

          {/* Question text */}
          <h1 className={ns('questionTitle')}>{base.question.question}</h1>

          {/* Tags */}
          {(base.question.tags.length > 0 || derived.reviewCount > 0) && (
            <div className={ns('tagsRow')}>
              {base.question.tags.map((tag: string) => (
                <span key={tag} className={ns('tag')}>#{tag}</span>
              ))}
              {derived.reviewCount > 0 && (
                <span title={`已复习 ${derived.reviewCount} 次`} className={ns('reviewCount')}>
                  复习 {derived.reviewCount} 次
                </span>
              )}
            </div>
          )}

          {/* Reveal button */}
          {!ui.answerVisible && (
            <button type="button" onClick={ui.handleRevealAnswer} className={ns('revealBtn')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              查看参考答案
              <Kbd>Space</Kbd>
            </button>
          )}
        </div>

        {/* My Answer Input - above answer card */}
        {showAnswerInputAbove && !hideAnswerInput && (
          <div className="animate-fade-in stagger-1">
            <MyAnswerInput
              key={`answer-above-${base.id ?? ''}`}
              questionId={base.id ?? ''}
              questionText={base.question.question}
              answerText={ui.effectiveAnswerText}
              onOpenAIPanel={() => ui.setAiDrawerOpen(true)}
              onOpenNote={() => ui.setNoteDrawerOpen(true)}
              isAiEnabled={base.isAiEnabled}
              onNoteSaved={ui.handleNoteSaved}
              autoFocus={base.answerNavigationMode !== 'check'}
            />
          </div>
        )}

        {/* Answer Card */}
        {ui.answerVisible && (
          <div ref={ui.answerRef} className={`card animate-scale-in ${ns('answerCard')}`}>
            {/* Answer header */}
            <div className={ns('answerHeader')}>
              <div className={ns('answerHeaderLeft')}>
                <div className={ns('answerAccent')} />
                {ui.hasLearningCheck ? (
                  <AnswerPanelTabs
                    activeView={ui.answerPanelView}
                    answerLabel={answerHeading}
                    onChange={(view) => {
                      if (view === 'check') {
                        ui.setAnswerEditMode(false)
                        ui.setAnswerSelection(null)
                      }
                      ui.setAnswerPanelView(view)
                    }}
                  />
                ) : (
                  <h2 className={ns('answerHeading')}>{answerHeading}</h2>
                )}
                {ui.hasCustomAnswer && !ui.answerEditMode && (
                  <AnswerOverrideHeaderMeta
                    updatedAt={ui.answerOverride?.updatedAt ?? null}
                    showingOriginal={ui.showOriginalAnswer}
                    onToggleOriginal={ui.handleToggleOriginalAnswer}
                  />
                )}
              </div>

              <div className={ns('answerActions')}>
                <AnswerAIButton
                  title={ui.hasCustomAnswer ? '编辑自定义答案' : '编辑参考答案'}
                  active={ui.answerEditMode}
                  onClick={ui.handleStartAnswerEdit}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={base.isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
                  active={ui.aiDrawerOpen}
                  onClick={() => ui.setAiDrawerOpen(true)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={base.isAiEnabled ? '讲解题目' : '讲解题目（请先配置 AI）'}
                  onClick={() => ui.openAIWithPreset('question')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.1 9a3 3 0 1 1 4.9 2.3c-.9.6-1.4 1.2-1.4 2.4" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </AnswerAIButton>
                <AnswerAIButton
                  title={base.isAiEnabled ? '讲解知识点' : '讲解知识点（请先配置 AI）'}
                  onClick={() => ui.openAIWithPreset('concept')}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 4v2" />
                    <path d="M12 18v2" />
                    <path d="M4 12h2" />
                    <path d="M18 12h2" />
                    <path d="m6.3 6.3 1.4 1.4" />
                    <path d="m16.3 16.3 1.4 1.4" />
                    <path d="m17.7 6.3-1.4 1.4" />
                    <path d="m7.7 16.3-1.4 1.4" />
                  </svg>
                </AnswerAIButton>
              </div>
            </div>

            {/* Answer body */}
            {ui.answerPanelView === 'check' ? (
              <LearningCheckPanel key={`learning-check-${base.question.id}`} checks={ui.learningChecks} />
            ) : ui.answerEditMode ? (
              <AnswerOverrideEditor
                draft={ui.answerDraft}
                saveStatus={ui.answerSaveStatus}
                canSave={canSaveAnswerOverride}
                onDraftChange={ui.setAnswerDraft}
                onSave={ui.handleSaveAnswerOverride}
                onCancel={ui.handleCancelAnswerEdit}
                onRestoreDefault={ui.handleRestoreDefaultAnswer}
              />
            ) : ui.answerOverrideLoading ? (
              <Skeleton width="100%" height={96} />
            ) : (
              <section
                ref={ui.answerContentRef}
                className={`prose answer-annotation-content ${ns('answerContent')}`}
                aria-label="答案内容"
              >
                <MarkdownRenderer content={ui.displayedAnswerText} />
              </section>
            )}

            {showAnswerContent && ui.answerSelection && !ui.answerEditMode && !ui.answerOverrideLoading && (
              <AnswerAnnotationToolbar
                toolbarRef={ui.answerAnnotationToolbarRef}
                selection={ui.answerSelection}
                commentOpen={ui.answerCommentOpen}
                commentDraft={ui.answerCommentDraft}
                saving={ui.answerAnnotationSaving}
                onHighlight={(color) => ui.handleCreateAnswerAnnotation('highlight', color)}
                onClearHighlight={ui.handleClearAnswerHighlight}
                onOpenComment={() => ui.setAnswerCommentOpen(true)}
                onCommentDraftChange={ui.setAnswerCommentDraft}
                onSaveComment={ui.handleSaveAnswerComment}
                onCancel={ui.handleCancelAnswerAnnotation}
              />
            )}

            {showAnswerContent && !ui.answerEditMode && !ui.answerOverrideLoading && (
              <AnswerCommentMarkers
                rootRef={ui.answerContentRef}
                annotations={ui.visibleAnswerAnnotations}
                activeId={ui.activeAnswerCommentId}
                onActiveChange={ui.setActiveAnswerCommentId}
                onDelete={ui.handleDeleteAnswerComment}
              />
            )}

            {/* Status actions */}
            <div className={ns('statusSection')}>
              <p className={ns('statusLabel')}>你掌握了吗？</p>
              <div className={ns('statusActions')}>
                <StatusButton
                  onClick={() => ui.handleSetStatus('review', '1')}
                  label="没掌握"
                  sublabel="加入待复习"
                  variant="danger"
                  kbd="1"
                  active={
                    (ui.justMarked === 'review' && ui.lastPressedKey === '1') ||
                    (derived.currentStatus === 'review' &&
                      ui.lastPressedKey !== '2' &&
                      ui.justMarked !== 'review')
                  }
                  disabled={ui.marking}
                />
                <StatusButton
                  onClick={() => ui.handleSetStatus('review', '2')}
                  label="大概会"
                  sublabel="还需巩固"
                  variant="warning"
                  kbd="2"
                  active={ui.justMarked === 'review' && ui.lastPressedKey === '2'}
                  disabled={ui.marking}
                />
                <StatusButton
                  onClick={() => ui.handleSetStatus('mastered', '3')}
                  label="完全掌握"
                  sublabel="不再推荐"
                  variant="success"
                  kbd="3"
                  active={ui.justMarked === 'mastered' || derived.currentStatus === 'mastered'}
                  disabled={ui.marking}
                />
              </div>

              {ui.marking && (
                <div className={ns('markingOverlay')}>
                  <Spinner size="sm" />
                  <span>保存中…</span>
                </div>
              )}
            </div>

            {/* My Answer Input - inside answer card */}
            {showAnswerContent && showAnswerInputInside && !hideAnswerInput && (
              <MyAnswerInput
                key={`answer-inside-${base.id ?? ''}`}
                questionId={base.id ?? ''}
                questionText={base.question.question}
                answerText={ui.effectiveAnswerText}
                onOpenAIPanel={() => ui.setAiDrawerOpen(true)}
                onOpenNote={() => ui.setNoteDrawerOpen(true)}
                isAiEnabled={base.isAiEnabled}
                onNoteSaved={ui.handleNoteSaved}
                compact
              />
            )}
          </div>
        )}

        {/* Session summary */}
        {ui.showSessionSummary && (
          <SessionCompletionCard
            mastered={derived.sessionStats.mastered}
            review={derived.sessionStats.review}
            unlearned={derived.sessionStats.unlearned}
            total={derived.sessionStats.total}
            retryCount={derived.sessionStats.retryIds.length}
            onRetry={ui.handleRetrySession}
            onBackToPractice={() => navigate('/practice')}
            onDashboard={() => navigate('/')}
          />
        )}

        {/* Related practice */}
        {ui.showRelatedPractice && (
          <RelatedPracticeCard
            items={derived.relatedPracticeItems}
            onStartPractice={ui.handleStartRelatedPractice}
          />
        )}

        {/* Streak counter pill */}
        {base.streak.currentStreak >= 2 && (
          <div className={`animate-fade-in ${ns('streakPill')}`}>
            <span className={ns('streakEmoji')}>🔥</span>
            <span className={ns('streakCount')}>{base.streak.currentStreak}</span>
            <span>连击</span>
            {base.streak.bestStreak > base.streak.currentStreak && (
              <span className={ns('streakMeta')}>最高 {base.streak.bestStreak}</span>
            )}
            <span className={ns('streakMeta')}>· 今日 {base.streak.todayCount} 题</span>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="animate-fade-in stagger-3">
          <ShortcutHints answerVisible={ui.answerVisible} answerPanelView={ui.answerPanelView} />
        </div>

        {/* Navigation */}
        <div className={`animate-fade-in stagger-4 ${ns('navRow')}`}>
          <button
            type="button"
            onClick={() => { ui.navigateTo(derived.prevId) }}
            disabled={!derived.prevId}
            className={ns('navBtn')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            上一题
          </button>
          <Link to="/questions" className={ns('backLink')}>返回列表</Link>
          <button
            type="button"
            onClick={() => { ui.navigateTo(derived.nextId) }}
            disabled={!derived.nextId}
            className={ns('navBtn')}
          >
            下一题
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* AI Drawer */}
      {answerContextQuestion && (
        <AIDrawer
          open={ui.aiDrawerOpen}
          onClose={() => ui.setAiDrawerOpen(false)}
          question={answerContextQuestion}
          answerVisible={ui.answerVisible}
          initialPrompt={ui.aiInitialPrompt}
          onInitialPromptConsumed={ui.handleAIInitialPromptConsumed}
          onOpenSettings={() => { ui.setAiDrawerOpen(false); ui.setSettingsOpen(true) }}
        />
      )}

      {/* Note Drawer */}
      <NoteDrawer
        open={ui.noteDrawerOpen}
        onClose={() => ui.setNoteDrawerOpen(false)}
        question={base.question}
        refreshKey={ui.noteRefreshKey}
        onContentStateChange={ui.setHasNote}
      />

      {/* Settings Drawer */}
      <SettingsDrawer open={ui.settingsOpen} onClose={() => ui.setSettingsOpen(false)} />

      {/* Streak Celebration overlay */}
      {ui.celebrationStreak > 0 && (
        <StreakCelebration streak={ui.celebrationStreak} onDone={() => ui.setCelebrationStreak(0)} />
      )}

      {/* Mobile Question Nav */}
      {showMobileQuestionNav && (
        <MobileQuestionNav
          prevDisabled={!derived.prevId}
          nextDisabled={!derived.nextId}
          onPrev={() => {
            ui.navigateTo(derived.prevId)
          }}
          onNext={() => {
            ui.navigateTo(derived.nextId)
          }}
        />
      )}

      {/* Global styles */}
      <style>{`
        @keyframes ai-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
