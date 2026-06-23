import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SettingsDrawer } from '@/components/layout/SettingDrawer'
import { Badge, Button, Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { SpeechInputButton } from '@/components/ui/SpeechInputButton'
import { MOCK_LEVEL_LABELS, MOCK_TYPE_LABELS } from '@/lib/mockInterview'
import { createPracticeSessionPath } from '@/lib/practiceSession'
import {
  FieldLabel,
  TextInput,
  SelectInput,
  TextArea,
  ScorePill,
} from '@/business/components/mock-interview'
import { useMockUI, levelOptions, typeOptions } from '@/business/hooks/mock-interview'
import styles from './MockInterview.module.css'

/* ─── Display helpers ──────────────────────────────────── */

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '未开始'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function cleanDimensionComment(comment: string): string {
  const cleaned = comment.replace(/[*_`]/g, '').trim()
  return cleaned.length > 0 ? cleaned : ''
}

/* ─── Page Component ────────────────────────────────────── */

export default function MockInterview() {
  const navigate = useNavigate()
  const {
    /* base data */
    config,
    aiReady,
    sessions,
    questions,
    speech,
    /* UI state */
    form,
    activeSession,
    draftAnswer,
    setDraftAnswer,
    busy,
    error,
    resumeMessage,
    settingsOpen,
    setSettingsOpen,
    parsingResume,
    setupCollapsed,
    setSetupCollapsed,
    streamingText,
    /* computed */
    isBusy,
    setupIsCollapsed,
    busyLabel,
    answerCount,
    interviewerQuestionCount,
    activeRecommendations,
    /* refs */
    fileRef,
    transcriptEndRef,
    reportRef,
    /* handlers */
    updateForm,
    handleResumeFile,
    handleStartInterview,
    handleSubmitAnswer,
    handleClarify,
    handleRepeatQuestion,
    handleFinishNow,
    handleDeleteSession,
    handleSelectSession,
    handleNewInterview,
  } = useMockUI()

  const handleStartPractice = useCallback(() => {
    const ids = activeRecommendations.map((q) => q.id)
    if (!ids.length) return
    navigate(createPracticeSessionPath(ids[0], ids))
  }, [activeRecommendations, navigate])

  return (
    <>
      <div
        className={`page-container ${styles.page} ${activeSession ? styles.hasActiveSession : ''}`}
      >
        {/* ── Header ── */}
        <div className={`${styles.headerRow} animate-fade-in`}>
          <div>
            <h1 className={styles.pageTitle}>模拟面试</h1>
            <p className={styles.pageSubtitle}>
              基于岗位 JD 和简历进行一问一答，结束后查看评分与改进建议
            </p>
          </div>
          {!aiReady && (
            <Button variant="primary" size="sm" onClick={() => setSettingsOpen(true)}>
              配置 AI
            </Button>
          )}
        </div>

        {/* ── Error ── */}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* ── Grid ── */}
        <div
          className={`${styles.grid} ${setupIsCollapsed ? styles.collapsed : ''} ${activeSession ? styles.hasActive : ''}`}
        >
          {/* ── Sidebar ── */}
          <aside className={styles.sidebar}>
            {/* ── Context / Setup Panel ── */}
            {setupIsCollapsed ? (
              <section className={`${styles.panel} ${styles.contextPanel}`}>
                <div className={styles.panelHeader}>
                  <h2>本场面试</h2>
                  <Badge variant="success">{config.model}</Badge>
                </div>
                <div className={styles.contextMeta}>
                  <span>岗位</span>
                  <strong>{activeSession?.roleTitle || form.roleTitle || '未指定'}</strong>
                  <span>模式</span>
                  <strong>
                    {activeSession
                      ? `${MOCK_TYPE_LABELS[activeSession.interviewType]} · ${MOCK_LEVEL_LABELS[activeSession.level]}`
                      : `${MOCK_TYPE_LABELS[form.interviewType]} · ${MOCK_LEVEL_LABELS[form.level]}`}
                  </strong>
                  <span>进度</span>
                  <strong>
                    {answerCount} 次作答 · {interviewerQuestionCount}/
                    {activeSession?.targetQuestionCount ?? form.targetQuestionCount} 问
                  </strong>
                </div>
                <div className={styles.contextActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => setSetupCollapsed(false)}
                  >
                    面试资料
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={handleNewInterview}
                  >
                    新面试
                  </Button>
                </div>
              </section>
            ) : (
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>{activeSession ? '面试资料' : '准备面试'}</h2>
                  <div className={styles.panelHeaderRight}>
                    <Badge variant={aiReady ? 'success' : 'warning'}>
                      {aiReady ? config.model : 'AI 未配置'}
                    </Badge>
                    {activeSession && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSetupCollapsed(true)}
                      >
                        收起
                      </Button>
                    )}
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div>
                    <FieldLabel label="目标岗位" />
                    <TextInput
                      value={form.roleTitle}
                      onChange={(value) => updateForm({ roleTitle: value })}
                      placeholder="例如：前端工程师"
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div>
                      <FieldLabel label="级别" />
                      <SelectInput
                        value={form.level}
                        options={levelOptions}
                        labels={MOCK_LEVEL_LABELS}
                        onChange={(value) => updateForm({ level: value })}
                      />
                    </div>
                    <div>
                      <FieldLabel label="面试类型" />
                      <SelectInput
                        value={form.interviewType}
                        options={typeOptions}
                        labels={MOCK_TYPE_LABELS}
                        onChange={(value) => updateForm({ interviewType: value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div>
                      <FieldLabel label="时长" />
                      <select
                        value={form.durationMinutes}
                        onChange={(event) =>
                          updateForm({ durationMinutes: Number(event.target.value) })
                        }
                        className={styles.nativeSelect}
                      >
                        {[15, 30, 45, 60].map((minute) => (
                          <option key={minute} value={minute}>
                            {minute} 分钟
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel label="题数" />
                      <select
                        value={form.targetQuestionCount}
                        onChange={(event) =>
                          updateForm({ targetQuestionCount: Number(event.target.value) })
                        }
                        className={styles.nativeSelect}
                      >
                        {[4, 6, 8, 10].map((count) => (
                          <option key={count} value={count}>
                            {count} 题
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="岗位 JD" />
                    <TextArea
                      value={form.jdText}
                      onChange={(value) => updateForm({ jdText: value })}
                      placeholder="粘贴岗位职责、任职要求、技术栈关键词..."
                    />
                  </div>

                  <div>
                    <FieldLabel
                      label="简历"
                      hint={form.resumeFileName ?? '支持 PDF、DOCX、TXT、MD'}
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf"
                      className={styles.hiddenInput}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleResumeFile(file)
                      }}
                    />
                    <div className={styles.fileRow}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={parsingResume}
                        onClick={() => fileRef.current?.click()}
                      >
                        上传解析
                      </Button>
                      {form.resumeText && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateForm({ resumeText: '', resumeFileName: undefined })}
                        >
                          清空
                        </Button>
                      )}
                    </div>
                    {resumeMessage && (
                      <p className={styles.resumeMessage}>{resumeMessage}</p>
                    )}
                    <TextArea
                      value={form.resumeText}
                      onChange={(value) => updateForm({ resumeText: value })}
                      placeholder="也可以直接粘贴简历文本..."
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    loading={busy === 'planning'}
                    onClick={handleStartInterview}
                  >
                    开始面试
                  </Button>
                </div>
              </section>
            )}

            {/* ── History Panel ── */}
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>历史记录</h2>
                <Badge variant="ghost">{sessions.length}</Badge>
              </div>
              <div className={styles.historyList}>
                {sessions.length === 0 ? (
                  <p className={styles.emptyText}>暂无记录</p>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session)}
                      className={styles.historyItem}
                      data-active={activeSession?.id === session.id ? true : undefined}
                    >
                      <span className={styles.historyMain}>
                        <strong>{session.title}</strong>
                        <span>{formatDateTime(session.updatedAt)}</span>
                      </span>
                      <span className={styles.historyScore}>
                        <ScorePill score={session.report?.overallScore ?? null} size="sm" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          </aside>

          {/* ── Interview Room ── */}
          <section className={styles.room}>
            {!activeSession ? (
              <div className={styles.empty}>
                <h2>面试室待开始</h2>
                <p>填入岗位资料后开始。</p>
              </div>
            ) : (
              <>
                {/* ── Room Header ── */}
                <div className={styles.roomHeader}>
                  <div>
                    <div className={styles.roomTitleRow}>
                      <h2>{activeSession.title}</h2>
                      <Badge
                        variant={activeSession.status === 'completed' ? 'success' : 'primary'}
                      >
                        {activeSession.status === 'completed' ? '已完成' : '进行中'}
                      </Badge>
                    </div>
                    <p>
                      {MOCK_TYPE_LABELS[activeSession.interviewType]} ·{' '}
                      {MOCK_LEVEL_LABELS[activeSession.level]} · {answerCount} 次作答 ·{' '}
                      {interviewerQuestionCount}/{activeSession.targetQuestionCount} 问
                    </p>
                  </div>
                  <div className={styles.roomActions}>
                    {activeSession.status !== 'completed' && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isBusy}
                        onClick={handleFinishNow}
                      >
                        结束并复盘
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDeleteSession(activeSession.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {/* ── Busy Banner ── */}
                {isBusy && busyLabel && (
                  <output className={styles.busyBanner} aria-live="polite">
                    <Spinner size="sm" />
                    <span>{busyLabel}...</span>
                  </output>
                )}

                {/* ── Plan ── */}
                {activeSession.plan && (
                  <div className={styles.plan}>
                    <div>
                      <strong>面试重点</strong>
                      <p>{activeSession.plan.summary}</p>
                    </div>
                    <div className={styles.focusList}>
                      {activeSession.plan.focusAreas.map((item) => (
                        <Badge key={item} variant="ghost">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Transcript ── */}
                <div className={styles.transcript}>
                  {activeSession.turns.map((turn) => (
                    <div key={turn.id} className={`${styles.turn} ${turn.role === 'interviewer' ? styles.turnInterviewer : styles.turnCandidate}`}>
                      <div className={styles.turnLabel}>
                        {turn.role === 'interviewer' ? '面试官' : '候选人'}
                        <span>{formatDateTime(turn.createdAt)}</span>
                      </div>
                      <p>{turn.content}</p>
                    </div>
                  ))}

                  {streamingText && (
                    <div className={`${styles.turn} ${styles.turnInterviewer}`}>
                      <div className={styles.turnLabel}>
                        {busy === 'reviewing'
                          ? '复盘生成中'
                          : busy === 'planning'
                            ? '计划生成中'
                            : '面试官'}
                      </div>
                      {busy === 'reviewing' ? (
                        <MarkdownRenderer content={streamingText} className={styles.markdown} />
                      ) : (
                        <p>{streamingText}</p>
                      )}
                    </div>
                  )}

                  {isBusy && !streamingText && (
                    <div className={`${styles.turn} ${styles.turnInterviewer} ${styles.turnPending}`}>
                      <div className={styles.turnLabel}>{busyLabel}</div>
                      <p>正在整理下一步内容，请稍等。</p>
                    </div>
                  )}

                  <div ref={transcriptEndRef} />
                </div>

                {/* ── Answer Box ── */}
                {activeSession.status === 'interviewing' && (
                  <div className={styles.answerBox}>
                    <textarea
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder="像真实面试一样作答，可以用语音输入。"
                      disabled={isBusy}
                    />
                    <div className={styles.answerActions}>
                      <div className={styles.answerActionsLeft}>
                        <SpeechInputButton
                          supported={speech.supported}
                          listening={speech.listening}
                          disabled={isBusy}
                          showLabel
                          onToggle={speech.toggle}
                        />
                        {speech.interimTranscript && (
                          <span className={styles.interim}>
                            正在识别：{speech.interimTranscript}
                          </span>
                        )}
                      </div>
                      <div className={styles.answerActionsRight}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={handleRepeatQuestion}
                        >
                          重复问题
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={handleClarify}
                        >
                          澄清题意
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={busy === 'interviewing'}
                          disabled={!draftAnswer.trim()}
                          onClick={handleSubmitAnswer}
                        >
                          提交回答
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Report ── */}
                {activeSession.report && (
                  <div className={styles.report} ref={reportRef}>
                    <div className={styles.reportHeader}>
                      <div>
                        <h2>复盘报告</h2>
                        <p>{formatDateTime(activeSession.report.createdAt)}</p>
                      </div>
                      <ScorePill score={activeSession.report.overallScore} />
                    </div>

                    {activeSession.report.dimensions.length > 0 && (
                      <div className={styles.dimensions}>
                        {activeSession.report.dimensions.map((dimension) => (
                          <div key={dimension.label}>
                            <strong>{dimension.label}</strong>
                            <span>{dimension.score}/100</span>
                            {cleanDimensionComment(dimension.comment) && (
                              <p>{cleanDimensionComment(dimension.comment)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <MarkdownRenderer
                      content={activeSession.report.markdown}
                      className={styles.markdown}
                    />

                    {activeRecommendations.length > 0 && (
                      <div className={styles.recommendations}>
                        <div className={styles.panelHeader}>
                          <h2>相关练习</h2>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleStartPractice}
                          >
                            开始练习
                          </Button>
                        </div>
                        <div className={styles.recommendationsGrid}>
                          {activeRecommendations.map((question) => (
                            <Link
                              key={question.id}
                              to={`/questions/${question.id}`}
                              className={styles.questionLink}
                            >
                              <span>{question.question}</span>
                              <Badge variant="ghost">{question.module}</Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
