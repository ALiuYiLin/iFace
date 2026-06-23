import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { type CategoryMap, DEFAULT_CATEGORY_MAP, getCategoryMap } from '@/api/compat'
import { BUILTIN_CATEGORIES } from '@/lib/fileUtils'
import { useStudyStore } from '@/store/useStudyStore'
import { IconCheck, IconClose, IconArrowRight } from '@/components/icon'
import { useNameSpace } from '@/utils'
import styles from './OnboardingGuide.module.css'

const ns = useNameSpace(styles)

const ONBOARDING_DONE_KEY = 'iface_onboarding_done_v1'
type StepId = 'welcome' | 'banks' | 'workflow'
const steps: { id: StepId; label: string }[] = [
  { id: 'welcome', label: '欢迎' },
  { id: 'banks', label: '题库' },
  { id: 'workflow', label: '开始' },
]

function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(ONBOARDING_DONE_KEY) === '1' } catch { return true }
}
function markOnboardingDone(): void {
  try { localStorage.setItem(ONBOARDING_DONE_KEY, '1') } catch { /* ignore */ }
}

function FeatureRow({ title, description, index }: {
  title: string; description: string; index: number
}) {
  return (
    <div className={ns('featureRow')}>
      <span className={ns('featureNum')}>{index + 1}</span>
      <div className={ns('featureBody')}>
        <p className={ns('featureTitle')}>{title}</p>
        <p className={ns('featureDesc')}>{description}</p>
      </div>
    </div>
  )
}

export function OnboardingGuide() {
  const location = useLocation()
  const { hiddenCategories, setHiddenCategories } = useStudyStore()
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({ ...DEFAULT_CATEGORY_MAP })
  const step = steps[stepIndex]

  useEffect(() => { getCategoryMap().then(setCategoryMap) }, [])

  useEffect(() => {
    if (location.pathname === '/api/auth' || hasCompletedOnboarding()) return
    const frame = window.requestAnimationFrame(() => setOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { markOnboardingDone(); setOpen(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const categories = useMemo(
    () => Object.entries(categoryMap).sort(([, a], [, b]) => {
      if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
      return (a.order ?? 99) - (b.order ?? 99)
    }),
    [categoryMap],
  )

  const visibleCount = categories.filter(([key]) => !hiddenCategories.has(key)).length

  const close = useCallback(() => { markOnboardingDone(); setOpen(false) }, [])

  const toggleCategory = useCallback((categoryName: string) => {
    const nextHidden = new Set(hiddenCategories)
    if (nextHidden.has(categoryName)) nextHidden.delete(categoryName)
    else nextHidden.add(categoryName)
    setHiddenCategories([...nextHidden])
  }, [hiddenCategories, setHiddenCategories])

  const setAllCategoriesVisible = useCallback(() => setHiddenCategories([]), [setHiddenCategories])

  const setOnlyCategoryVisible = useCallback((categoryName: string) => {
    setHiddenCategories(categories.filter(([key]) => key !== categoryName).map(([key]) => key))
  }, [categories, setHiddenCategories])

  if (!open) return null

  const titleText = step.id === 'welcome' ? '欢迎来到 iFace！' : step.id === 'banks' ? '题库设置' : '准备好了'

  return (
    <>
      <div role="presentation" className={ns('overlay')} />
      <section role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className={ns('dialog')}>
        <div className={`glass ${ns('dialogInner')}`}>
          {/* Header */}
          <div className={ns('dialogHeader')}>
            <div className={ns('dialogHeaderLeft')}>
              <div className={ns('stepCounter')}>
                <span className={ns('stepNum')}>{stepIndex + 1} / {steps.length}</span>
              </div>
              <h2 id="onboarding-title" className={ns('dialogTitle')}>{titleText}</h2>
            </div>
            <button type="button" aria-label="跳过新手引导" onClick={close} className={ns('dialogCloseBtn')}>
              <IconClose />
            </button>
          </div>

          {/* Body */}
          <div className={ns('dialogBody')}>
            <aside className={ns('sidebar')}>
              {steps.map((item, index) => {
                const active = index === stepIndex
                const done = index < stepIndex
                return (
                  <button key={item.id} type="button" onClick={() => setStepIndex(index)}
                    data-active={active} data-done={done} className={ns('stepBtn')}>
                    <span className={ns('stepNumBadge')}>{done ? <IconCheck /> : index + 1}</span>
                    {item.label}
                  </button>
                )
              })}
            </aside>

            <div className={ns('content')}>
              {/* Welcome */}
              {step.id === 'welcome' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p className={ns('welcomeText')}>
                    人你好，我是项目作者 <a href="https://dogxi.me">Dogxi</a> 👋<br />
                    很高兴你来到这里 🎉，这里是一个永远开源免费的八股面试题网站！
                    <br />
                    接下来需要先花半分钟完成设置，能让刷题体验轻松很多哦。
                    <br />
                    iFace 拥有超多题目，以及下面三大功能，至于更多...我想你主动去发现会更有意思 👀
                    <br />
                    项目地址：https://github.com/dogxii/iface，交流Q群：279167739
                    <br />
                    作者主页：https://dogxi.me，最后感谢大家的喜欢 ❤️！
                  </p>
                  <div className={ns('featureCards')}>
                    <FeatureRow index={0} title="海量题库"
                      description="从题库列表进入任意题目，先说出你的答案，再展开参考答案。" />
                    <FeatureRow index={1} title="专项练习"
                      description="练习页可以按模块、难度和学习状态组合，适合冲刺和查漏补缺。" />
                    <FeatureRow index={2} title="AI 助手"
                      description="在设置里的 AI 助手填入 API Key 后，题目详情页会出现分析和追问辅助。" />
                  </div>
                </div>
              )}

              {/* Banks */}
              {step.id === 'banks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p className={ns('banksDesc')}>
                    ⚙️ 这里是题库设置页面，你可以关闭你不需要的题目分类，
                    <br />
                    不用有任何顾虑！题目关闭之后仍然可以在设置页面重新打开 ✅
                    <br />
                    （未来 iFace 仍会添加更多但高质量的题目！）
                  </p>
                  <div className={ns('bankActions')}>
                    <Button size="sm" variant="secondary" onClick={setAllCategoriesVisible}>全部显示</Button>
                    {categories.slice(0, 4).map(([key, category]) => (
                      <Button key={key} size="sm" variant="ghost" onClick={() => setOnlyCategoryVisible(key)}>
                        只看{category.name}
                      </Button>
                    ))}
                  </div>
                  <div className={ns('bankGrid')}>
                    {categories.map(([key, category]) => {
                      const enabled = !hiddenCategories.has(key)
                      const builtinCat = BUILTIN_CATEGORIES.find((item) => item.category === key)
                      const fileCount = builtinCat?.files.length ?? 0
                      return (
                        <button key={key} type="button" data-enabled={enabled}
                          onClick={() => toggleCategory(key)} className={ns('bankCard')}>
                          <span className={ns('bankCardTop')}>
                            <span className={ns('bankName')}>{category.name}</span>
                            <span className={ns('bankToggle')}>
                              <span className={ns('bankToggleKnob')} />
                            </span>
                          </span>
                          <span className={ns('bankModules')}>
                            {category.modules.length} 个模块{fileCount > 0 ? ` · ${fileCount} 个文件` : ''}
                          </span>
                          <span className={ns('bankStatus')}>{enabled ? '显示中' : '已隐藏'}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className={ns('banksFootNote')}>
                    当前显示 {visibleCount} 个题库。隐藏只是收起入口和统计，不会删除题目、笔记或学习记录。
                  </p>
                </div>
              )}

              {/* Workflow */}
              {step.id === 'workflow' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p className={ns('workflowText')}>
                    如果你不知道从哪里开始，推荐先打开设置，看看有什么可以调整
                    <br />
                    然后，享受刷题！
                    <br />
                    人再见，祝你生活愉快，面试顺利 🎉
                    <br />
                    ps: 本引导窗口只在首次进入页面时显示。
                    <br />
                  </p>
                  <div className={ns('actionGrid')}>
                    {[
                      { title: '设置', body: '右上角设置里可以调整题库展示、答题模式、每日目标和 AI 助手。', label: '随时调整' },
                      { title: '题库', body: '从顶部导航进入题库，打开任意题目后，先作答再看参考答案。', label: '逐题学习' },
                      { title: '练习', body: '想集中刷一组题时，去练习页按模块、难度和学习状态组合题目。', label: '专项刷题' },
                    ].map((item) => (
                      <div key={item.title} className={ns('actionCard')}>
                        <span>
                          <span className={ns('actionCardTitle')}>{item.title}</span>
                          <span className={ns('actionCardBody')}>{item.body}</span>
                        </span>
                        <span className={ns('actionCardLabel')}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className={ns('tipCard')}>
                    本网站强烈推荐配合面试食用 🍜
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={ns('dialogFooter')}>
            <Button variant="ghost" onClick={close}>跳过引导</Button>
            <div className={ns('footerButtons')}>
              {stepIndex > 0 && (
                <Button variant="secondary" onClick={() => setStepIndex((value) => value - 1)}>上一步</Button>
              )}
              {stepIndex < steps.length - 1 ? (
                <Button variant="primary" onClick={() => setStepIndex((value) => value + 1)} iconRight={<IconArrowRight />}>下一步</Button>
              ) : (
                <Button variant="primary" onClick={close}>完成引导</Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
