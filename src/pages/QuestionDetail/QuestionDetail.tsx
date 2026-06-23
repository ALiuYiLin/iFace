import { Link, useNavigate } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingDrawer'
import { Badge, Button, Kbd, Skeleton, Spinner } from '@/components/ui'
import {
  IconStar, IconNote, IconVisible, IconEdit, IconAI,
  IconHelpCircle, IconCrosshair, IconArrowLeft, IconArrowRight, IconChevronRight,
} from '@/components/icon'
import { LearningCheckPanel } from '@/components/ui/LearningCheckPanel'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { DIFFICULTY_LABELS } from '@/types'
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

  // ── Loading ──
  if (base.loading) {
    return (
      <div className={ns('page-container', 'animate-fade-in', 'loadingContainer')}>
        <Skeleton width={180} height={13} />
        <div className={ns('card', 'loadingCard')}>
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
      <div className={ns('page-container', 'pageContainer')}>
        <div className={ns('card', 'notFound')}>
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
        className={ns('page-container', 'question-detail-page', 'pageContainer', ui.showMobileQuestionNav && 'hasMobileNav')}
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
              <IconChevronRight className={ns('breadcrumbChevron')} />
              <Link to={`/questions?module=${encodeURIComponent(base.question.module)}`} className={ns('breadcrumbLink')}>
                {base.question.module}
              </Link>
              <IconChevronRight className={ns('breadcrumbChevron')} />
              <span className={ns('breadcrumbCurrent')}>{base.question.question.slice(0, 30)}…</span>
            </nav>
          )}
        </div>

        {/* Question Card */}
        <div className={ns('card', 'animate-fade-in', 'stagger-1', 'questionCard')}>
          {/* Meta row */}
          <div className={ns('metaRow')}>
            <span className={ns('moduleBadge')}>{base.question.module}</span>
            <Badge size="sm" variant="ghost" className={ns('diffBadge')}
              style={{ color: ui.diffStyle.color, background: ui.diffStyle.background, borderColor: ui.diffStyle.borderColor }}>
              {DIFFICULTY_LABELS[base.question.difficulty]}
            </Badge>
            {derived.currentStatus !== 'unlearned' && (
              <Badge size="sm" variant="ghost" className={ns('statusBadge')} data-status={derived.currentStatus}>
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
                className={ns('iconBtn', ui.starred ? 'iconBtnStarred' : 'iconBtnUnstarred')}
              >
                <IconStar fill={ui.starred} />
              </button>
              <button
                type="button"
                onClick={() => ui.setNoteDrawerOpen(true)}
                aria-label={ui.hasNote ? '打开题目笔记' : '添加题目笔记'}
                title={`${ui.hasNote ? '打开题目笔记' : '添加题目笔记'}（N）`}
                className={ns('iconBtn', 'iconBtnNote', ui.hasNote ? 'iconBtnHasNote' : 'iconBtnNoNote')}
              >
                <span className={ns('noteWrap')}>
                  <IconNote />
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
              <IconVisible />
              查看参考答案
              <Kbd>Space</Kbd>
            </button>
          )}
        </div>

        {/* My Answer Input - above answer card */}
        {ui.showAnswerInputAbove && !ui.hideAnswerInput && (
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
          <div ref={ui.answerRef} className={ns('card', 'animate-scale-in', 'answerCard')}>
            {/* Answer header */}
            <div className={ns('answerHeader')}>
              <div className={ns('answerHeaderLeft')}>
                <div className={ns('answerAccent')} />
                {ui.hasLearningCheck ? (
                  <AnswerPanelTabs
                    activeView={ui.answerPanelView}
                    answerLabel={ui.answerHeading}
                    onChange={(view) => {
                      if (view === 'check') {
                        ui.setAnswerEditMode(false)
                        ui.setAnswerSelection(null)
                      }
                      ui.setAnswerPanelView(view)
                    }}
                  />
                ) : (
                  <h2 className={ns('ui.answerHeading')}>{ui.answerHeading}</h2>
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
                  <IconEdit />
                </AnswerAIButton>
                <AnswerAIButton
                  title={base.isAiEnabled ? '打开 AI 助手（A）' : 'AI 助手（请先配置，快捷键 A）'}
                  active={ui.aiDrawerOpen}
                  onClick={() => ui.setAiDrawerOpen(true)}
                >
                  <IconAI />
                </AnswerAIButton>
                <AnswerAIButton
                  title={base.isAiEnabled ? '讲解题目' : '讲解题目（请先配置 AI）'}
                  onClick={() => ui.openAIWithPreset('question')}
                >
                  <IconHelpCircle />
                </AnswerAIButton>
                <AnswerAIButton
                  title={base.isAiEnabled ? '讲解知识点' : '讲解知识点（请先配置 AI）'}
                  onClick={() => ui.openAIWithPreset('concept')}
                >
                  <IconCrosshair />
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
                canSave={ui.canSaveAnswerOverride}
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
                className={ns('prose', 'answer-annotation-content', 'answerContent')}
                aria-label="答案内容"
              >
                <MarkdownRenderer content={ui.displayedAnswerText} />
              </section>
            )}

            {ui.showAnswerContent && ui.answerSelection && !ui.answerEditMode && !ui.answerOverrideLoading && (
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

            {ui.showAnswerContent && !ui.answerEditMode && !ui.answerOverrideLoading && (
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
            {ui.showAnswerContent && ui.showAnswerInputInside && !ui.hideAnswerInput && (
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
          <div className={ns('animate-fade-in', 'streakPill')}>
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
        <div className={ns('animate-fade-in', 'stagger-4', 'navRow')}>
          <button type="button" onClick={() => { ui.navigateTo(derived.prevId) }} disabled={!derived.prevId} className={ns('navBtn')}>
            <IconArrowLeft />
            上一题
          </button>
          <Link to="/questions" className={ns('backLink')}>返回列表</Link>
          <button type="button" onClick={() => { ui.navigateTo(derived.nextId) }} disabled={!derived.nextId} className={ns('navBtn')}>
            下一题
            <IconArrowRight />
          </button>
        </div>
      </div>

      {/* AI Drawer */}
      {ui.answerContextQuestion && (
        <AIDrawer
          open={ui.aiDrawerOpen}
          onClose={() => ui.setAiDrawerOpen(false)}
          question={ui.answerContextQuestion}
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
      {ui.showMobileQuestionNav && (
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

    </>
  )
}
