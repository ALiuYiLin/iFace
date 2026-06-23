import { type ReactNode } from 'react'
import { useNameSpace } from '@/utils'
import { invalidateQuestionsCache } from '@/hooks/useQuestions'
import { pushToGist, pullFromGist, deleteBackupGist } from '@/lib/gistSync'
import type { CategoryEntry } from '@/api/types'
import { BUILTIN_CATEGORIES } from '@/lib/fileUtils'
import {
  AI_PROVIDER_PRESETS,
  type AIProviderId,
  type AIConfig,
  type AIModelPreset,
  DEFAULT_AI_CONFIG,
  DEFAULT_SYSTEM_PROMPT,
  getAIProviderPreset,
  useAIStore,
} from '@/store/useAIStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { AnswerNavigationMode, StudyMode } from '@/store/useStudyStore'
import {
  DAILY_GOAL_DEFAULT,
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  useStudyStore,
} from '@/store/useStudyStore'
import {
  IconAI, IconData, IconGitHub, IconClose, IconCheck,
  IconDownload, IconUpload, IconTrash,
  IconBook, IconSync, IconCog, IconMonitor, IconVisible,
  IconChevronRight, IconSpinner, IconCloseSmall,
} from '@/components/icon'
import { useSettingDrawerBase, useSettingDrawerDerived } from './hooks'
import { SectionHeader } from './SectionHeader'
import { Toggle } from './Toggle'
import { Field } from './Field'
import { ApiKeyInput } from './ApiKeyInput'
import { Toast } from './Toast'
import type { ToastState } from './hooks/useSettingDrawerBase'
import styles from './SettingDrawer.module.css'

const ns = useNameSpace(styles)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBackupTime(value?: string): string {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知'
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface SettingsDrawerProps { open: boolean; onClose: () => void }

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const base = useSettingDrawerBase(open, onClose)
  const derived = useSettingDrawerDerived(
    base.localConfig, base.customModel, base.customBaseUrl,
    base.setCustomModel, base.setCustomBaseUrl,
  )
  const { sessions, clearAllSessions, upsertSessions } = useAIStore()
  const {
    studyMode, setStudyMode, answerNavigationMode, setAnswerNavigationMode,
    mobileQuestionNavEnabled, setMobileQuestionNavEnabled,
    aiFabVisible, setAiFabVisible, streak, resetStreak,
    dailyGoal, setDailyGoal, hiddenCategories, toggleCategoryVisibility,
  } = useStudyStore()
  const { token, user, isLoggedIn, loading: authLoading, login, logout } = useAuthStore()

  if (!open) return null

  return (
    <>
      <button type="button" aria-label="关闭设置面板" onClick={onClose} className={ns('backdrop')} />
      <div ref={base.drawerRef} role="dialog" aria-modal="true" aria-label="设置" tabIndex={-1} className={ns('drawer')}>

        {/* ── Header ── */}
        <div className={ns('header')}>
          <div className={ns('headerLeft')}>
            <div className={ns('headerIcon')}><IconCog /></div>
            <span className={ns('headerTitle')}>设置</span>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置面板" className={ns('closeBtn')}><IconClose /></button>
        </div>

        {/* ── Tabs ── */}
        <div role="tablist" aria-label="设置分类" className={ns('tabBar')}>
          {(['ai', 'study', 'data', 'sync'] as const).map((t) => {
            const labels: Record<string, string> = { ai: 'AI 助手', study: '刷题偏好', data: '数据管理', sync: '云同步' }
            const icons: Record<string, ReactNode> = { ai: <IconAI />, study: <IconBook />, data: <IconData />, sync: <IconSync /> }
            const active = base.tab === t
            return (
              <button key={t} type="button" role="tab" aria-selected={active}
                onClick={() => base.setTab(t)} title={labels[t]}
                className={ns('tab', active ? 'tabActive' : 'tabInactive')}>
                <span className={ns('tabIcon')}>{icons[t]}</span>
                <span className="settings-tab-label">{labels[t]}</span>
                {t === 'sync' && isLoggedIn && !active && <span className={ns('loginDot')} />}
              </button>
            )
          })}
        </div>
        <style>{`@media(max-width:400px){.settings-tab-label{display:none!important}}`}</style>

        {/* ── Body ── */}
        <div className={ns('body')}>

          {/* ════════════ Study Tab ════════════ */}
          {base.tab === 'study' && (
            <>
              <SectionHeader icon={<IconBook />} title="刷题偏好" />

              {/* Daily Goal */}
              <div className={ns('column')}>
                <div className={ns('rowBetween')}>
                  <div className={ns('labelSmall')}>每日目标题数</div>
                  <span className={ns('valuePrimary')}>{dailyGoal} 题 / 天</span>
                </div>
                <input type="range" min={DAILY_GOAL_MIN} max={DAILY_GOAL_MAX} step={5} value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value, 10))} className={ns('rangeSlider')} />
                <div className={ns('rowEnd')}>
                  <span className={ns('textMuted')}>{DAILY_GOAL_MIN} 题（轻松）</span>
                  <span className={ns('textMuted')}>{DAILY_GOAL_DEFAULT} 题（推荐）</span>
                  <span className={ns('textMuted')}>{DAILY_GOAL_MAX} 题（高强度）</span>
                </div>
                {dailyGoal !== DAILY_GOAL_DEFAULT && (
                  <button type="button" onClick={() => setDailyGoal(DAILY_GOAL_DEFAULT)} className={ns('resetBtn')}>
                    恢复默认（{DAILY_GOAL_DEFAULT} 题）
                  </button>
                )}
              </div>

              {/* Study Mode */}
              <div className={ns('column')}>
                <div className={ns('labelSmall')}>答题模式</div>
                <div className={ns('studyModeBtns')}>
                  {([
                    { value: 'answer-first' as StudyMode, label: '先答后看', emoji: '✍️', description: '先在作答区写下你的理解，再展开参考答案——最有助于记忆' },
                    { value: 'answer-alongside' as StudyMode, label: '边看边记', emoji: '📖', description: '查看答案的同时写笔记，作答区显示在答案卡片内' },
                    { value: 'memory-only' as StudyMode, label: '纯记忆', emoji: '🧠', description: '不显示作答区，直接翻答案，快速过一遍知识点' },
                  ]).map((opt) => {
                    const active = studyMode === opt.value
                    return (
                      <button key={opt.value} type="button" data-active={active}
                        onClick={() => { setStudyMode(opt.value); base.showToast(`已切换至「${opt.label}」模式`) }}
                        className={ns('studyBtn')}>
                        <span className={ns('studyBtnEmoji')}>{opt.emoji}</span>
                        <div className={ns('studyBtnBody')}>
                          <div className={ns('studyBtnTitleRow')}>
                            <span className={ns('studyBtnTitle')} data-active={active}>{opt.label}</span>
                            {active && <span className={ns('pill')}>当前</span>}
                          </div>
                          <p className={ns('studyBtnDesc')}>{opt.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Answer Navigation */}
              <div className={ns('rowBetween')}>
                <div className={ns('labelSmall')}>切题后默认进入</div>
                <div className={ns('answerNavBtns')}>
                  {([{ value: 'answer' as AnswerNavigationMode, label: '参考答案' }, { value: 'check' as AnswerNavigationMode, label: '测试一下' }]).map((opt) => {
                    const active = answerNavigationMode === opt.value
                    return (
                      <button key={opt.value} type="button" data-active={active}
                        onClick={() => { setAnswerNavigationMode(opt.value); base.showToast(`切题后默认进入「${opt.label}」`) }}
                        className={ns('answerNavBtn')}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Streak */}
              <div className={ns('card')}>
                <div className={ns('rowBetween')}>
                  <p className={ns('cardTitle')}>🔥 连刷记录</p>
                  <button type="button" onClick={() => { resetStreak(); base.showToast('连刷记录已重置') }} className={ns('streakResetBtn')}>重置</button>
                </div>
                <div className={ns('grid3')}>
                  {[{ label: '今日作答', value: streak.todayCount, suffix: '题', color: 'var(--primary)' },
                    { label: '当前连击', value: streak.currentStreak, suffix: '连', color: '#f59e0b' },
                    { label: '历史最高', value: streak.bestStreak, suffix: '连', color: 'var(--success)' },
                  ].map((s) => (
                    <div key={s.label} className={ns('streakItem')}>
                      <p className={ns('streakVal')} style={{ color: s.color }}>
                        {s.value}<span className={ns('textMuted')}>{s.suffix}</span>
                      </p>
                      <p className={ns('streakLabel')}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestone */}
              <div className={ns('milestoneCard')}>
                <p className={ns('milestoneTitle')}>🎯 成就里程碑</p>
                {[{ n: 3, emoji: '🔥', text: '3 连击 — 良好开始！' }, { n: 5, emoji: '⚡', text: '5 连击 — 状态上来了！' }, { n: 10, emoji: '🚀', text: '10 连击 — 专注模式！' }, { n: 20, emoji: '👑', text: '20 连击 — 王者风范！' }, { n: 50, emoji: '🏆', text: '50 连击 — 传说级别！' }].map((m) => (
                  <div key={m.n} className={ns('milestoneRow')}>
                    <span>{m.emoji}</span>
                    <span className={ns('milestoneText')} data-achieved={streak.bestStreak >= m.n}>
                      {m.text}{streak.bestStreak >= m.n && <span className={ns('milestoneCheck')}>✓ 已达成</span>}
                    </span>
                  </div>
                ))}
              </div>

              {/* Category Visibility */}
              <div className={ns('column')}>
                <div className={ns('flexRow')}>
                  <IconVisible />
                  <span className={ns('labelSmall')}>题库展示</span>
                </div>
                <p className={ns('textDescSmall')}>关闭的题库会从首页、题库和练习中隐藏，学习记录仍会保留。</p>
                <div className={ns('flexCol')}>
                  {(() => {
                    const allCats = (Object.entries(base.categoryMap) as [string, CategoryEntry][]).sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99))
                    if (allCats.length === 0) return <p className={ns('catEmpty')}>暂无题库</p>
                    return allCats.map(([key, cat]) => {
                      const isHidden = hiddenCategories.has(key)
                      const builtinCat = BUILTIN_CATEGORIES.find((c) => c.category === key)
                      const fileCount = builtinCat ? builtinCat.files.length : 0
                      return (
                        <button key={key} type="button" data-hidden={isHidden}
                          onClick={() => { toggleCategoryVisibility(key); base.showToast(isHidden ? `已显示「${cat.name}」题库` : `已隐藏「${cat.name}」题库`) }}
                          className={ns('catBtn')}>
                          <div className={ns('catToggleOuter')}><div className={ns('catToggleInner')} /></div>
                          <div className={ns('catInfo')}>
                            <div className={ns('catNameRow')}>
                              <span className={ns('catName')}>{cat.name}</span>
                              {cat.builtin && <span className={ns('badge')}>内置</span>}
                            </div>
                            <p className={ns('catModules')}>{cat.modules.length} 个模块{fileCount > 0 && ` · ${fileCount} 个文件`}</p>
                          </div>
                          <span className={ns('catStatus')}>{isHidden ? '已隐藏' : '显示中'}</span>
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Display Toggles */}
              <div className={ns('column')}>
                <div className={ns('flexRow')}><IconMonitor /><span className={ns('labelSmall')}>题目页显示</span></div>
                <div className={ns('displayToggles')}>
                  <Toggle checked={mobileQuestionNavEnabled} onChange={(enabled) => { setMobileQuestionNavEnabled(enabled); base.showToast(enabled ? '已显示移动端底部切题按钮' : '已隐藏移动端底部切题按钮') }} label="移动端底部切题" description="在题目详情页底部显示上一题、下一题按钮" />
                  <Toggle checked={aiFabVisible} onChange={(visible) => { setAiFabVisible(visible); base.showToast(visible ? '已显示移动端 AI 助手按钮' : '已隐藏移动端 AI 助手按钮') }} label="移动端 AI 助手按钮" description="在题目详情页右下角显示 AI 助手入口" />
                </div>
              </div>
            </>
          )}

          {/* ════════════ AI Tab ════════════ */}
          {base.tab === 'ai' && (
            <>
              <SectionHeader icon={<IconAI />} title="AI 助手配置" />
              <Toggle checked={base.localConfig.enabled} onChange={(v) => base.patch({ enabled: v })} label="启用 AI 助手" description="在题目详情页启用 AI 辅助分析和面试指导" />
              <Field label="服务商" hint={derived.selectedProviderPreset.note}>
                <select value={derived.selectedProvider} className="input-base"
                  onChange={(e) => { const p = e.target.value as AIProviderId; const provider = getAIProviderPreset(p); base.setTestResult(null); if (p === 'custom') { const nextBaseUrl = base.customBaseUrl || base.localConfig.baseUrl; const nextModel = base.customModel || base.localConfig.model; base.setCustomBaseUrl(nextBaseUrl); base.setCustomModel(nextModel === 'custom' ? '' : nextModel); base.patch({ provider: p, baseUrl: nextBaseUrl, model: nextModel || 'custom' }) } else { base.patch({ provider: p, baseUrl: provider.baseUrl, model: provider.defaultModel }) } }}>
                  {AI_PROVIDER_PRESETS.map((provider) => (<option key={provider.id} value={provider.id}>{provider.label}</option>))}
                </select>
              </Field>
              <Field label="API Key" hint="密钥仅存储在本地，不会上传到任何服务器">
                <ApiKeyInput value={base.localConfig.apiKey} onChange={(v) => base.patch({ apiKey: v })} placeholder={derived.selectedProviderPreset.apiKeyPlaceholder} />
              </Field>
              <Field label="模型">
                <select value={derived.selectedModel} className="input-base"
                  onChange={(e) => { const v = e.target.value; base.setTestResult(null); if (v === 'custom') base.patch({ model: base.customModel || 'custom' }); else base.patch({ model: v }) }}>
                  {derived.modelOptions.map((model) => (<option key={model.value} value={model.value}>{model.label}{model.recommended ? '（推荐）' : ''}</option>))}
                  <option value="custom">自定义模型</option>
                </select>
                {derived.selectedModelPreset?.description && <p className={ns('textMuted', 'modelDesc')}>{derived.selectedModelPreset.description}</p>}
                {derived.selectedModel === 'custom' && (
                  <input type="text" value={base.customModel} className="input-base"
                    onChange={(e) => { base.setCustomModel(e.target.value); base.patch({ model: e.target.value }) }}
                    placeholder={derived.isCustomProvider ? '模型名称，如 llama-3.3-70b' : `自定义 ${derived.selectedProviderPreset.shortLabel} 模型 ID`} />
                )}
              </Field>
              <Field label="API Base URL" hint={derived.isCustomProvider ? '必须是 OpenAI Chat Completions 兼容接口地址' : '由服务商自动填写；如需代理网关，请选择自定义兼容接口'}>
                {derived.isCustomProvider ? (
                  <input type="text" value={base.customBaseUrl} className="input-base"
                    onChange={(e) => { base.setCustomBaseUrl(e.target.value); base.patch({ baseUrl: e.target.value }) }} placeholder="https://your-api.com/v1" />
                ) : (
                  <input type="text" value={base.localConfig.baseUrl} readOnly className={`input-base ${ns('readonlyInput')}`} />
                )}
              </Field>
              <details className={ns('detailsWrap')}>
                <summary className={ns('advSummary')}><IconChevronRight />高级参数</summary>
                <div className={ns('advBody')}>
                  <Field label={`Temperature：${base.localConfig.temperature}`} hint="越高越有创意，越低越保守">
                    <input type="range" min="0" max="2" step="0.1" value={base.localConfig.temperature}
                      onChange={(e) => base.patch({ temperature: parseFloat(e.target.value) })} className={ns('rangeAccent')} />
                  </Field>
                  <Field label="最大 Token 数" hint="控制单次回复的最大长度">
                    <input type="number" value={base.localConfig.maxTokens} className="input-base"
                      onChange={(e) => base.patch({ maxTokens: parseInt(e.target.value, 10) || 2000 })} min={100} max={8000} step={100} />
                  </Field>
                </div>
              </details>
              <Field label="System Prompt" hint="控制 AI 的回答风格、格式和行为，修改后点击保存生效">
                <div className={ns('textareaWrap')}>
                  <textarea value={base.localConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT} className={`input-base ${ns('textareaField')}`}
                    onChange={(e) => base.patch({ systemPrompt: e.target.value })} rows={8}
                    placeholder="输入自定义 System Prompt..." />
                  <div className={ns('textareaCharArea')}>
                    <span className={ns('charCount')}>{(base.localConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT).length} 字</span>
                    <button type="button" onClick={() => base.patch({ systemPrompt: DEFAULT_SYSTEM_PROMPT })} className={ns('defaultBtn')}>恢复默认</button>
                  </div>
                </div>
              </Field>
              <div className={ns('usageTip')}>
                <p className={ns('usageTipTitle')}>💡 使用说明</p>
                <p>在题目详情页点击「AI 分析」按钮即可开始对话。</p>
                <p className={ns('aiUsageMt')}>可使用快捷动作快速获取考点分析、答题结构、追问预测等辅助。</p>
              </div>
              <div className={ns('aiClearSection')}>
                <div>
                  <p className={ns('cardTitle')}>清除对话记录</p>
                  <p className={ns('clearTextMt', 'textMuted')}>删除所有 AI 对话历史（本地存储）</p>
                </div>
                <button type="button" onClick={() => { clearAllSessions(); base.showToast('对话记录已清除') }} className={ns('aiClearBtn')}>清除</button>
              </div>
            </>
          )}

          {/* ════════════ Sync Tab ════════════ */}
          {base.tab === 'sync' && (
            <>
              <SectionHeader icon={<IconSync />} title="云同步" />
              {!isLoggedIn && (
                <div className={ns('column')}>
                  <div className={ns('syncLoginCard')}>
                    <div className={ns('syncAvatarCircle')}><IconGitHub /></div>
                    <div>
                      <p className={ns('syncLoginTitle')}>使用 GitHub 账号同步进度</p>
                    <p className={ns('syncLoginDesc')}>学习进度和自定义题库将备份到你的 GitHub 私人 Gist，多端同步，不怕丢失</p>
                    </div>
                    <button type="button" onClick={login} disabled={authLoading} className={ns('syncLoginBtn')} data-loading={authLoading}>
                      <IconGitHub />{authLoading ? '跳转中…' : '用 GitHub 登录'}
                    </button>
                  </div>
                  <div className={ns('syncFeatureList')}>
                    {[{ icon: '☁️', text: '备份到私人 Gist，仅自己可见' }, { icon: '📱', text: '多设备自动同步学习进度' }, { icon: '🔒', text: '仅申请 gist 权限，不读写代码仓库' }, { icon: '⚡', text: '登录后自动拉取上次备份' }].map(({ icon, text }) => (
                      <div key={text} className={ns('syncFeatureItem')}>
                        <span className={ns('syncFeatureIcon')}>{icon}</span>
                        <span className={ns('syncFeatureText')}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isLoggedIn && user && (
                <div className={ns('column')}>
                  <div className={ns('syncUserCard')}>
                    <img src={user.avatar_url} alt={user.login} className={ns('syncUserAvatar')} />
                    <div className={ns('syncUserInfo')}>
                      <p className={ns('syncUserName')}>{user.name || user.login}</p>
                      <p className={ns('syncUserLogin')}>@{user.login}</p>
                    </div>
                    <button type="button" onClick={logout} className={ns('syncLogoutBtn')}>退出</button>
                  </div>
                  {base.lastSyncResult && (
                    <div className={ns('syncResultBanner')} data-ok={base.lastSyncResult.ok}>
                      <span className={ns('resultEmoji')}>{base.lastSyncResult.ok ? '✅' : '❌'}</span>
                      <div className={ns('flex1')}>
                        <p className={ns('syncResultText')}>{base.lastSyncResult.message}</p>
                        {base.lastSyncResult.at && <p className={ns('syncResultTime')}>备份时间：{new Date(base.lastSyncResult.at).toLocaleString('zh-CN')}</p>}
                      </div>
                      <button type="button" onClick={() => base.setLastSyncResult(null)} className={ns('syncCloseBtn')}><IconCloseSmall /></button>
                    </div>
                  )}
                  <div className={ns('syncActions')}>
                    <button type="button" data-loading={base.syncPushing || base.syncPulling}
                      disabled={base.syncPushing || base.syncPulling}
                      onClick={async () => { if (!token) return; base.setSyncPushing(true); base.setLastSyncResult(null); try { const r = await pushToGist(token, Object.values(sessions)); if (r.ok) { if (r.aiSessions?.length) upsertSessions(r.aiSessions); if (r.mergedRemoteQuestionCount) invalidateQuestionsCache(); base.setLastSyncResult({ ok: true, message: `已备份 ${r.recordCount ?? 0} 条学习记录、${r.questionCount ?? 0} 道自定义题目、${r.noteCount ?? 0} 条笔记、${r.answerAnnotationCount ?? 0} 个答案标注、${r.questionFlagCount ?? 0} 个重点题、${r.aiSessionCount ?? 0} 个 AI 会话` }) } else { base.setLastSyncResult({ ok: false, message: `备份失败：${r.error ?? '未知错误'}` }) } } catch (err) { base.setLastSyncResult({ ok: false, message: `备份失败：${err instanceof Error ? err.message : String(err)}` }) } finally { base.setSyncPushing(false) } }}
                      className={ns('syncActionBtn')}>
                      <div className={ns('syncActionIconBox', 'primary')}>{base.syncPushing ? <IconSpinner /> : <IconUpload />}</div>
                      <div className={ns('syncActionLabel')}>
                        <p className={ns('syncActionTitle')}>{base.syncPushing ? '备份中…' : '备份到云端'}</p>
                        <p className={ns('syncActionDesc')}>将本地进度和题库上传到 GitHub Gist</p>
                      </div>
                    </button>
                    <button type="button" data-loading={base.syncPulling || base.syncPushing}
                      disabled={base.syncPushing || base.syncPulling}
                      onClick={async () => { if (!token || !confirm('确定要从云端恢复数据吗？这将覆盖本地学习记录。')) return; base.setSyncPulling(true); base.setLastSyncResult(null); try { const r = await pullFromGist(token, Object.values(sessions)); if (r === null) { base.setLastSyncResult({ ok: false, message: '云端暂无备份，请先执行「备份到云端」' }) } else if (r.ok) { invalidateQuestionsCache(); if (r.aiSessions?.length) upsertSessions(r.aiSessions); base.setLastSyncResult({ ok: true, message: `已同步 ${r.recordCount ?? 0} 条学习记录、${r.questionCount ?? 0} 道自定义题目、${r.noteCount ?? 0} 条笔记、${r.answerAnnotationCount ?? 0} 个答案标注、${r.questionFlagCount ?? 0} 个重点题、${r.aiSessionCount ?? 0} 个 AI 会话` }) } else { base.setLastSyncResult({ ok: false, message: `恢复失败：${r.error ?? '未知错误'}` }) } } catch (err) { base.setLastSyncResult({ ok: false, message: `恢复失败：${err instanceof Error ? err.message : String(err)}` }) } finally { base.setSyncPulling(false) } }}
                      className={ns('syncActionBtn')}>
                      <div className={ns('syncActionIconBox', 'neutral')}>{base.syncPulling ? <IconSpinner /> : <IconDownload />}</div>
                      <div className={ns('syncActionLabel')}>
                        <p className={ns('syncActionTitle')}>{base.syncPulling ? '恢复中…' : '从云端恢复'}</p>
                        <p className={ns('syncActionDesc')}>从 GitHub Gist 拉取最新备份到本地</p>
                      </div>
                    </button>
                  </div>
                  <div className={ns('dangerZone')}>
                    <p className={ns('dangerTitle')}>危险操作</p>
                    <button type="button" data-loading={base.syncDeleting} disabled={base.syncDeleting} className={ns('dangerBtn')}
                      onClick={async () => { if (!token || !confirm('确定要删除云端备份 Gist 吗？此操作不可撤销，本地数据不受影响。')) return; base.setSyncDeleting(true); const r = await deleteBackupGist(token); base.setSyncDeleting(false); base.setLastSyncResult({ ok: r.ok, message: r.ok ? '云端备份已删除' : `删除失败：${r.error}` }) }}>
                      <IconTrash />{base.syncDeleting ? '删除中…' : '删除云端备份 Gist'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════ Data Tab ════════════ */}
          {base.tab === 'data' && (
            <>
              <SectionHeader icon={<IconData />} title="数据管理" />
              {base.dataStats && (
                <div className={ns('statsGrid')}>
                  {[
                    { label: '题目总数', value: base.dataStats.questions, color: 'var(--primary)' },
                    { label: '学习记录', value: base.dataStats.records, color: 'var(--success)' },
                    { label: '题目笔记', value: base.dataStats.notes, color: 'var(--warning)' },
                    { label: '答案标注', value: base.dataStats.answerAnnotations, color: 'var(--primary)' },
                    { label: '自定义答案', value: base.dataStats.answerOverrides, color: 'var(--primary)' },
                    { label: '重点题', value: base.dataStats.starred, color: '#f59e0b' },
                    { label: 'AI 会话', value: base.dataStats.aiSessions, color: 'var(--text-2)' },
                    { label: '模拟面试', value: base.dataStats.mockInterviews, color: 'var(--primary)' },
                    { label: 'JD 诊断', value: base.dataStats.jdMatchReports, color: 'var(--text-2)' },
                  ].map((stat) => (
                    <div key={stat.label} className={ns('statCard')}>
                      <p className={ns('statValue')} style={{ color: stat.color }}>{stat.value.toLocaleString()}</p>
                      <p className={ns('statLabel')}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className={ns('dataCard')}>
                <p className={ns('dataCardTitle')}>导出数据</p>
                <p className={ns('dataCardDesc')}>将题目库、学习记录、题目笔记、答案标注、重点题、AI 对话、模拟面试和 JD 诊断导出为 JSON 文件；不会导出 API Key。</p>
                <button type="button" data-loading={base.exporting} disabled={base.exporting}
                  onClick={base.handleExport} className={ns('actionBtn')}>
                  <IconDownload />{base.exporting ? '导出中…' : '导出 JSON'}
                </button>
              </div>
              <div className={ns('dataCard')}>
                <p className={ns('dataCardTitle')}>导入数据</p>
                <p className={ns('dataCardDesc')}>从备份文件恢复数据。已存在的题目、记录、笔记、答案标注、重点标记、AI 会话、模拟面试和 JD 诊断将被覆盖更新。</p>
                <input ref={base.importRef} type="file" accept=".json" className={ns('hiddenInput')} onChange={(e) => { const f = e.target.files?.[0]; if (f) base.handleImport(f) }} />
                <button type="button" data-loading={base.importing} disabled={base.importing}
                  onClick={() => base.importRef.current?.click()} className={ns('actionBtn')}>
                  <IconUpload />{base.importing ? '处理中…' : '选择文件'}
                </button>
                {base.importPreview && (
                  <div className={ns('importPreviewBox')}>
                    <div>
                      <p className={ns('previewTitle')}>待导入备份预览</p>
                      <p className={ns('previewFileName')}>{base.importPreview.fileName} · 导出时间 {formatBackupTime(base.importPreview.exportedAt)}{base.importPreview.formatVersion ? ` · 格式 v${base.importPreview.formatVersion}` : ''}</p>
                    </div>
                    <div className={ns('importPreviewGrid')}>
                      {[
                        { label: '题目', value: base.importPreview.questions.length, impact: base.importPreview.impact.questions },
                        { label: '记录', value: base.importPreview.studyRecords.length, impact: base.importPreview.impact.studyRecords },
                        { label: '笔记', value: base.importPreview.questionNotes.length, impact: base.importPreview.impact.questionNotes },
                        { label: '标注', value: base.importPreview.questionAnswerAnnotations.length, impact: base.importPreview.impact.questionAnswerAnnotations },
                        { label: '答案', value: base.importPreview.questionAnswerOverrides.length, impact: base.importPreview.impact.questionAnswerOverrides },
                        { label: '重点', value: base.importPreview.questionFlags.filter((f) => f.starred).length, impact: base.importPreview.impact.questionFlags },
                        { label: 'AI', value: base.importPreview.aiSessions.length, impact: base.importPreview.impact.aiSessions },
                        { label: '面试', value: base.importPreview.mockInterviews.length, impact: base.importPreview.impact.mockInterviews },
                        { label: '诊断', value: base.importPreview.jdMatchReports.length, impact: base.importPreview.impact.jdMatchReports },
                      ].map((item) => (
                        <div key={item.label} className={ns('previewStatCard')}>
                          <p className={ns('previewStatVal')}>{item.value.toLocaleString()}</p>
                          <p className={ns('previewStatLabel')}>{item.label}</p>
                          <p className={ns('previewStatImpact')}>新增 {item.impact.created.toLocaleString()} · 覆盖 {item.impact.overwritten.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <p className={ns('previewInfo')}>确认后才会写入本地数据；标记为覆盖的同 ID 题目、学习记录、笔记、重点标记、AI 会话、模拟面试和 JD 诊断会被备份内容替换。</p>
                    <div className={ns('flexWrap')}>
                      <button type="button" data-loading={base.importing} disabled={base.importing}
                        onClick={base.handleConfirmImport} className={ns('confirmBtn')}>
                        <IconCheck />{base.importing ? '导入中…' : '确认导入'}
                      </button>
                      <button type="button" data-loading={base.importing} disabled={base.importing}
                        onClick={() => base.setImportPreview(null)} className={ns('cancelBtn')}>取消</button>
                    </div>
                  </div>
                )}
              </div>
              <div className={ns('dangerCard')}>
                <div>
                  <p className={ns('dangerCardTitle')}>清除学习记录</p>
                  <p className={ns('dangerCardDesc')}>保留题库，仅删除进度数据</p>
                </div>
                {base.confirmReset === 'records' ? (
                  <div className={ns('flexWrap')}>
                    <button type="button" onClick={base.handleResetConfirm} className={ns('confirmDangerBtn')}>确认清除</button>
                    <button type="button" onClick={() => base.setConfirmReset(null)} className={ns('cancelDangerBtn')}>取消</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => base.setConfirmReset('records')} className={ns('inlineDangerBtn')}><IconTrash />清除学习记录</button>
                )}
              </div>
              <div className={ns('dangerCard')}>
                <div>
                  <p className={ns('dangerCardTitle')}>重置所有数据</p>
                  <p className={ns('dangerCardDesc')}>删除题库、记录、AI 对话等全部数据</p>
                </div>
                {base.confirmReset === 'all' ? (
                  <div className={ns('flexWrap')}>
                    <button type="button" onClick={base.handleResetConfirm} className={ns('confirmDangerBtn')}>确认重置</button>
                    <button type="button" onClick={() => base.setConfirmReset(null)} className={ns('cancelDangerBtn')}>取消</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => base.setConfirmReset('all')} className={ns('inlineDangerBtn')}><IconTrash />重置全部数据</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={ns('footer')}>
          {base.tab === 'ai' && (
            <div className={ns('saveBar')}>
              {base.testResult && (
                <div className={ns('testBanner')} data-ok={base.testResult.ok}>
                  <span className={ns('resultEmoji')}>{base.testResult.ok ? '✅' : '❌'}</span>
                  <span className={ns('testBannerText')}>{base.testResult.message}</span>
                </div>
              )}
              <div className={ns('saveBarBtns')}>
                <button type="button" data-dirty={base.isDirty} disabled={!base.isDirty}
                  onClick={base.handleSave} className={ns('saveBtn')}>
                  {base.saved ? <><IconCheck /> 已保存</> : '保存设置'}
                </button>
                <button type="button" data-loading={base.testing} disabled={base.testing}
                  onClick={base.handleTest} className={ns('testConnBtn')}>
                  {base.testing ? <><IconSpinner />测试中…</> : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>测试连接</>}
                </button>
                <button type="button" onClick={base.handleReset} className={ns('resetConfigBtn')}>恢复默认</button>
              </div>
            </div>
          )}
          <div className={ns('githubRow')}>
            <a href="https://github.com/dogxii/iFace" target="_blank" rel="noopener noreferrer" className={ns('githubLink')}><IconGitHub />dogxii/iFace</a>
            <span className={ns('version')}>v{__APP_VERSION__}</span>
          </div>
        </div>
      </div>

      {base.toast && <Toast message={base.toast.message} type={base.toast.type} />}
    </>
  )
}
