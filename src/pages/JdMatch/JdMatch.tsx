import { SettingsDrawer } from '@/components/layout/SettingsDrawer'
import { Badge, Button, Spinner } from '@/components/ui'
import { MarkdownRenderer } from '@/components/ui/LazyMarkdownRenderer'
import { TextArea } from '@/business/components/jd-match'
import { useJdMatchBase, useJdMatchUI } from '@/business/hooks/jd-match'
import { useNameSpace } from '@/utils'
import styles from './JdMatch.module.css'

const ns = useNameSpace(styles)

export default function JdMatch() {
  const base = useJdMatchBase()
  const ui = useJdMatchUI(base)

  const { aiReady } = base
  const {
    fileRef,
    roleTitle,
    jdText,
    resumeText,
    resumeFileName,
    resumeMessage,
    savedReports,
    activeReportId,
    displayReport,
    error,
    settingsOpen,
    parsingResume,
    analyzing,
    setRoleTitle,
    setSettingsOpen,
    setError,
    handleResumeFile,
    handleAnalyze,
    handleSelectReport,
    handleDeleteReport,
    handleNewDiagnosis,
    handleCopyReport,
    setJdText,
    setResumeText,
    setResumeFileName,
    setResumeMessage,
  } = ui

  return (
    <>
      <div className={ns('page', 'page-container')}>
        <div className={ns('header', 'animate-fade-in')}>
          <h1 className={ns('title')}>简历 JD 诊断</h1>
          <p className={ns('subtitle')}>
            对照目标岗位，找出简历里的匹配点、风险点和可能追问
          </p>
        </div>

        {error && <div className={ns('alert')}>{error}</div>}

        <div className={ns('layout')}>
          <aside className={ns('sidebar')}>
            <section className={ns('panel')}>
              <div className={ns('panelHeader')}>
                <h2>诊断材料</h2>
                <Badge variant={aiReady ? 'success' : 'warning'}>
                  {aiReady ? base.config.model : 'AI 未配置'}
                </Badge>
              </div>

              <div className={ns('form')}>
                <label>
                  <span>目标岗位</span>
                  <input
                    value={roleTitle}
                    onChange={(event) => setRoleTitle(event.target.value)}
                    placeholder="例如：前端工程师"
                  />
                </label>

                <div className={ns('field')}>
                  <span>岗位 JD</span>
                  <TextArea
                    value={jdText}
                    onChange={setJdText}
                    placeholder="粘贴岗位职责、任职要求、技术栈关键词..."
                  />
                </div>

                <div>
                  <div className={ns('fileRow')}>
                    <span>简历</span>
                    <small>{resumeFileName ?? '支持 PDF、DOCX、TXT、MD'}</small>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) handleResumeFile(file)
                    }}
                  />
                  <div className={ns('actionsRow')}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={parsingResume}
                      onClick={() => fileRef.current?.click()}
                    >
                      上传解析
                    </Button>
                    {resumeText && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResumeText('')
                          setResumeFileName(null)
                          setResumeMessage(null)
                        }}
                      >
                        清空
                      </Button>
                    )}
                  </div>
                  {resumeMessage && <p className={ns('resumeMessage')}>{resumeMessage}</p>}
                  <TextArea
                    value={resumeText}
                    onChange={setResumeText}
                    placeholder="也可以直接粘贴简历文本..."
                  />
                </div>

                <div className={ns('submitRow')}>
                  <Button type="button" variant="ghost" onClick={handleNewDiagnosis}>
                    新诊断
                  </Button>
                  {!aiReady && (
                    <Button type="button" variant="secondary" onClick={() => setSettingsOpen(true)}>
                      配置 AI
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    loading={analyzing}
                    disabled={!jdText.trim() || !resumeText.trim()}
                    onClick={handleAnalyze}
                  >
                    生成诊断
                  </Button>
                </div>
              </div>
            </section>

            <section className={ns('panel')}>
              <div className={ns('panelHeader')}>
                <h2>历史记录</h2>
                <span>{savedReports.length}</span>
              </div>

              <div className={ns('historyList')}>
                {savedReports.length === 0 ? (
                  <p className={ns('historyEmpty')}>暂无诊断记录</p>
                ) : (
                  savedReports.map((item) => (
                    <div
                      key={item.id}
                      className={ns('historyItem')}
                      data-active={activeReportId === item.id}
                    >
                      <button
                        type="button"
                        disabled={analyzing}
                        onClick={() => handleSelectReport(item)}
                      >
                        <strong>{item.title}</strong>
                        <span suppressHydrationWarning>
                          {item.roleTitle} ·{' '}
                          {new Intl.DateTimeFormat('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(item.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`删除 ${item.title}`}
                        disabled={analyzing}
                        onClick={() => handleDeleteReport(item.id)}
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>

          <section className={`${ns('panel')} ${ns('reportPanel')}`}>
            <div className={ns('panelHeader')}>
              <h2>诊断结果</h2>
              {displayReport && (
                <Button type="button" variant="ghost" size="sm" onClick={handleCopyReport}>
                  复制
                </Button>
              )}
            </div>

            {analyzing && !ui.streamingText && (
              <output className={ns('busy')} aria-live="polite">
                <Spinner size="sm" />
                <span>正在分析简历与 JD...</span>
              </output>
            )}

            {displayReport ? (
              <MarkdownRenderer content={displayReport} className={ns('markdown')} />
            ) : (
              <div className={ns('empty')}>
                <h2>等待诊断</h2>
                <p>填入 JD 和简历后生成匹配报告。</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false)
          setError(null)
        }}
      />
    </>
  )
}
