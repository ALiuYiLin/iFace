import { Badge } from '@/components/ui'
import { useNameSpace } from '@/utils'
import { usePromptUI } from '@/business/hooks/prompt-page'
import {
  CopyButton,
  PresetCard,
  CustomBuilder,
  MdConverterPanel,
  PRESETS,
} from '@/business/components/prompt-page'

import styles from './PromptPage.module.css'

const ns = useNameSpace(styles)

interface TipItem {
  icon: React.ReactNode
  title: string
  desc: string
}

const TIPS: TipItem[] = [
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: '分批次生成效果更好',
    desc: '每次让 AI 专注一个模块，质量比一次性生成所有题目要高很多。建议每次生成 50-80 道题。',
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
      </svg>
    ),
    title: '多次生成合并使用',
    desc: '同一模块可以多次生成，每次用不同 AI 或不同角度，然后合并成更完整的题库。注意 ID 不要重复。',
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    title: '可以让 AI 修改答案',
    desc: '对某道题的答案不满意，可以直接让 AI 补充、修正，然后手动更新对应 JSON 条目。',
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    title: '标注 source 字段',
    desc: '建议让 AI 将高频题标注 source: "高频"，大厂题标注公司名，方便在题库中快速筛选。',
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: '推荐模型',
    desc: 'GPT-4o、Claude 3.5/3.7 Sonnet、Gemini 1.5 Pro 的输出质量较好，且能严格遵循 JSON 格式。',
  },
  {
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: '验证 JSON 有效性',
    desc: '粘贴前可先用 jsonlint.com 验证格式，避免导入失败。iFace 导入页也会自动检测并报告格式错误。',
  },
]

export default function PromptPage() {
  const {
    selectedPreset,
    setSelectedPreset,
    customPrompt,
    setCustomPrompt,
    activeTab,
    setActiveTab,
    rightTab,
    setRightTab,
  } = usePromptUI()

  const currentPreset = PRESETS.find((p) => p.id === selectedPreset)
  const displayPrompt = activeTab === 'custom' ? customPrompt : (currentPreset?.prompt ?? '')

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 1100 }}>
      {/* ── Header ── */}
      <div className={ns('headerSection')}>
        <div className={ns('headerInner')}>
          <div>
            <h1 className={ns('title')}>
              AI 出题 Prompt
            </h1>
            <p className={ns('subtitle')}>
              复制提示词，交给 AI 生成符合格式的题目，然后粘贴到「导入题目」页面
            </p>
          </div>
          <Badge variant="primary" className={ns('badge')}>
            推荐总量：500-600 题
          </Badge>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className={ns('promptLayout')}>
        {/* ── Left: Preset selector ── */}
        <div className={ns('leftColumn', 'animate-fade-in', 'stagger-1')}>
          {/* Tab switcher */}
          <div className={ns('tabSwitcher')}>
            {(
              [
                { key: 'presets', label: '预设 Prompt' },
                { key: 'custom', label: '自定义构建' },
              ] as const
            ).map(({ key, label }) => (
              <button
                type="button"
                key={key}
                onClick={() => setActiveTab(key)}
                className={ns('tabButton', activeTab === key ? 'leftTabActive' : 'leftTabInactive')}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'presets' ? (
            <div className={ns('presetList')}>
              {PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPreset === preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                />
              ))}
            </div>
          ) : (
            <div className={ns('customCard', 'card')}>
              <CustomBuilder
                onGenerate={(prompt) => {
                  setCustomPrompt(prompt)
                }}
              />
            </div>
          )}
        </div>

        {/* ── Right: Prompt preview ── */}
        <div className={ns('rightPanel', 'animate-fade-in', 'stagger-2')}>
          {/* Right panel tab switcher */}
          <div className={ns('tabSwitcher', 'tabSwitcherMargin')}>
            {(
              [
                { key: 'preview', label: 'Prompt 预览' },
                { key: 'converter', label: 'MD → JSON 转换器' },
              ] as const
            ).map(({ key, label }) => {
              const active = rightTab === key
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setRightTab(key)}
                  className={ns('tabButton', active ? 'rightTabActive' : 'rightTabInactive')}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {rightTab === 'converter' ? (
            <MdConverterPanel />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Preview header */}
              <div className={ns('previewHeader')}>
                <div className={ns('previewTitle')}>
                  <span className={ns('previewName')}>
                    {activeTab === 'custom'
                      ? customPrompt
                        ? '自定义 Prompt'
                        : '请在左侧配置并生成'
                      : currentPreset?.title}
                  </span>
                  {displayPrompt && (
                    <span className={ns('previewLength')}>
                      {displayPrompt.length} 字符
                    </span>
                  )}
                </div>
              </div>

              {/* Prompt content */}
              {displayPrompt ? (
                <div className={ns('promptContent')}>
                  <pre className={ns('preBlock')}>
                    {displayPrompt}
                  </pre>
                  {/* Floating copy */}
                  <div className={ns('copyFloat')}>
                    <CopyButton text={displayPrompt} />
                  </div>
                </div>
              ) : (
                <div className={ns('emptyState', 'card')}>
                  <div>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={ns('emptyIcon')}
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <p className={ns('emptyText')}>
                      在左侧配置参数后点击「生成自定义 Prompt」
                    </p>
                  </div>
                </div>
              )}

              {/* Usage guide */}
              {displayPrompt && (
                <div className={ns('usageCard', 'card', 'animate-scale-in')}>
                  <p className={ns('usageTitle')}>使用步骤</p>
                  <ol className={ns('stepList')}>
                    {[
                      {
                        id: 'step-1',
                        number: 1,
                        text: '复制 Prompt，粘贴到 GPT-4o / Claude / Gemini 等 AI',
                      },
                      {
                        id: 'step-2',
                        number: 2,
                        text: 'AI 生成 Markdown 格式题目（比 JSON 更稳定，少出错）',
                      },
                      {
                        id: 'step-3',
                        number: 3,
                        text: '复制 AI 输出，切换到「MD → JSON 转换器」粘贴转换',
                      },
                      {
                        id: 'step-4',
                        number: 4,
                        text: '复制转换后的 JSON，前往「导入题目」页面一键导入',
                      },
                    ].map((step) => (
                      <li key={step.id} className={ns('stepItem')}>
                        <span className={ns('stepNumber')}>
                          {step.number}
                        </span>
                        <span className={ns('stepText')}>{step.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tips ── */}
      <div className={ns('tipsSection', 'animate-fade-in', 'stagger-3')}>
        <p className={ns('sectionLabel')}>
          使用技巧
        </p>
        <div className={ns('tipsGrid')}>
          {TIPS.map((tip, i) => (
            <div
              key={tip.title}
              className={ns('tipCard', 'card', 'animate-fade-in')}
              style={{ animationDelay: `${0.3 + i * 0.05}s` }}
            >
              <div className={ns('tipIconBox')}>
                {tip.icon}
              </div>
              <div>
                <p className={ns('tipTitle')}>
                  {tip.title}
                </p>
                <p className={ns('tipDesc')}>
                  {tip.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recommended scale ── */}
      <div className={ns('scaleSection', 'animate-fade-in', 'stagger-4')}>
        <div className={ns('scaleCard', 'card')}>
          <h2 className={ns('scaleTitle')}>
            推荐题库规模
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={ns('scaleTable')}>
              <thead>
                <tr className={ns('tableRow')}>
                  {['目标', '题目数量', '生成策略', '预计用时'].map((h) => (
                    <th key={h} className={ns('tableHeader')}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['快速入门', '100-200 题', '全量生成 Prompt 运行一次', '15 分钟'],
                  ['覆盖全面', '500-600 题', '按模块分批生成，每模块 60-75 题', '1-2 小时'],
                  ['深度备战', '800-1000 题', '全量 + 大厂真题 + 手写题专项', '3-4 小时'],
                  ['超全题库', '1500+ 题', '多 AI 多轮次生成 + 去重合并', '1 天'],
                ].map(([target, count, strategy, time]) => (
                  <tr key={target} className={ns('tableRow')}>
                    <td className={ns('tableTarget')}>
                      {target}
                    </td>
                    <td className={ns('tableCount')}>
                      <span className={ns('tableBadge')}>
                        {count}
                      </span>
                    </td>
                    <td className={ns('tableStrategy')}>
                      {strategy}
                    </td>
                    <td className={ns('tableTime')}>
                      {time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={ns('scaleNote')}>
            推荐从「覆盖全面」开始，500-600 题已足够覆盖 95% 的面试考点。超过 800
            题后边际收益递减，建议重点放在薄弱点的深度理解。
          </p>
        </div>
      </div>
    </div>
  )
}
