import { Link } from 'react-router-dom'
import { preloadPath } from '@/lib/routePreload'
import { ToolIcon } from '@/business/components/tools'
import { useNameSpace } from '@/utils'
import styles from './Tools.module.css'

const ns = useNameSpace(styles)

interface ToolCard {
  title: string
  description: string
  href: string
  icon: 'interview' | 'match' | 'prompt' | 'project' | 'questions' | 'review' | 'intro' | 'plan'
}

const toolSections: { title: string; tools: ToolCard[] }[] = [
  {
    title: '面试核心',
    tools: [
      {
        title: '模拟面试',
        description: '基于岗位 JD 和简历进行中文一问一答，结束后查看评分与改进建议。',
        href: '/mock-interview',
        icon: 'interview',
      },
      {
        title: '简历 JD 诊断',
        description: '对照目标岗位，找出简历里的匹配点、风险点和可能追问。',
        href: '/tools/jd-match',
        icon: 'match',
      },
    ],
  },
  {
    title: '准备打磨',
    tools: [
      {
        title: '项目深挖',
        description: '拆解项目亮点、技术难点、追问清单和口语化回答。',
        href: '/tools/project-deep-dive',
        icon: 'project',
      },
      {
        title: '面试问题',
        description: '基于简历、JD 或项目关键词预测这场面试的高概率问题。',
        href: '/tools/interview-questions',
        icon: 'questions',
      },
      {
        title: '自我介绍',
        description: '生成 30 秒、1 分钟、2 分钟中文面试自我介绍。',
        href: '/tools/self-intro',
        icon: 'intro',
      },
    ],
  },
  {
    title: '复盘提升',
    tools: [
      {
        title: '复盘解析',
        description: '把面试记录转成失分点、补强项和下一轮练习清单。',
        href: '/tools/review-analysis',
        icon: 'review',
      },
      {
        title: '学习计划',
        description: '按薄弱点、面试日期和可投入时间生成补强路径。',
        href: '/tools/learning-plan',
        icon: 'plan',
      },
    ],
  },
  {
    title: 'AI 出题',
    tools: [
      {
        title: 'AI 出题',
        description: '复制结构化 Prompt，让 AI 批量生成符合 iFace 格式的面试题。',
        href: '/prompt',
        icon: 'prompt',
      },
    ],
  },
]

export default function Tools() {
  return (
    <div className={ns('page', 'page-container')}>
      <div className={ns('header', 'animate-fade-in')}>
        <h1 className={ns('title')}>工具</h1>
        <p className={ns('subtitle')}>
          不一定每天用，但关键时刻很有用的面试辅助功能
        </p>
      </div>

      {toolSections.map((section) => (
        <section key={section.title} className={ns('section')}>
          <div className={ns('sectionHeader')}>
            <h2>{section.title}</h2>
            <span>{section.tools.length} 个</span>
          </div>
          <div className={ns('list')}>
            {section.tools.map((tool) => (
              <Link
                key={tool.href}
                to={tool.href}
                className={ns('card')}
                onPointerEnter={() => preloadPath(tool.href)}
                onFocus={() => preloadPath(tool.href)}
              >
                <span className={ns('icon')}>
                  <ToolIcon type={tool.icon} />
                </span>
                <span className={ns('content')}>
                  <strong>{tool.title}</strong>
                  <span>{tool.description}</span>
                </span>
                <span className={ns('arrow')} aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
