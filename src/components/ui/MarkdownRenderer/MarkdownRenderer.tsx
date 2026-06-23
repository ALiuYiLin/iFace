import { useCallback, useState } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { useNameSpace } from '@/utils'
import styles from './MarkdownRenderer.module.css'

const ns = useNameSpace(styles)

export interface MarkdownRendererProps {
  content: string
  className?: string
  resolveImageSrc?: (src: string) => string | undefined
}

const LOCAL_NOTE_IMAGE_SRC_PREFIX = 'iface-note-image:'

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      const el = document.createElement('textarea')
      el.value = code
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }, [code])
  return (
    <button type="button" onClick={handleCopy}
      className={`code-copy-btn${copied ? ' copied' : ''}`}
      aria-label={copied ? '已复制' : '复制代码'}>
      {copied ? (
        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>已复制</>
      ) : (
        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>复制</>
      )}
    </button>
  )
}

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children && typeof children === 'object' && 'props' in (children as object)) {
    return extractText((children as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ''
}

const components: Components = {
  pre({ children, ...props }) {
    const codeText = extractText(children)
    return (
      <div className={ns('preWrap')}>
        <pre className={ns('pre')} {...props}>{children}</pre>
        <CopyButton code={codeText} />
      </div>
    )
  },
  code({ className, children, ...props }) {
    const isInline = !className
    if (isInline) return <code className={ns('codeInline')} {...props}>{children}</code>
    return <code className={`${ns('codeBlock')} ${className ?? ''}`} {...props}>{children}</code>
  },
  h1({ children, ...props }) { return <h1 className={ns('h1')} {...props}>{children}</h1> },
  h2({ children, ...props }) { return <h2 className={ns('h2')} {...props}>{children}</h2> },
  h3({ children, ...props }) { return <h3 className={ns('h3')} {...props}>{children}</h3> },
  h4({ children, ...props }) { return <h4 className={ns('h4')} {...props}>{children}</h4> },
  p({ children, ...props }) { return <p className={ns('p')} {...props}>{children}</p> },
  ul({ children, ...props }) { return <ul className={ns('ul')} {...props}>{children}</ul> },
  ol({ children, ...props }) { return <ol className={ns('ol')} {...props}>{children}</ol> },
  li({ children, ...props }) { return <li className={ns('li')} {...props}>{children}</li> },
  blockquote({ children, ...props }) { return <blockquote className={ns('blockquote')} {...props}>{children}</blockquote> },
  hr(props) { return <hr className={ns('hr')} {...props} /> },
  strong({ children, ...props }) { return <strong className={ns('strong')} {...props}>{children}</strong> },
  em({ children, ...props }) { return <em className={ns('em')} {...props}>{children}</em> },
  a({ children, href, ...props }) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={ns('link')} {...props}>{children}</a>
  },
  table({ children, ...props }) {
    return (
      <div className={ns('tableWrap')}>
        <table className={ns('table')} {...props}>{children}</table>
      </div>
    )
  },
  thead({ children, ...props }) { return <thead className={ns('thead')} {...props}>{children}</thead> },
  tbody({ children, ...props }) { return <tbody {...props}>{children}</tbody> },
  tr({ children, ...props }) { return <tr className={ns('tr')} {...props}>{children}</tr> },
  th({ children, ...props }) { return <th className={ns('th')} {...props}>{children}</th> },
  td({ children, ...props }) { return <td className={ns('td')} {...props}>{children}</td> },
}

function transformMarkdownUrl(value: string, key: string) {
  if (key === 'src' && value.startsWith(LOCAL_NOTE_IMAGE_SRC_PREFIX)) return value
  return defaultUrlTransform(value)
}

export function MarkdownRenderer({ content, className = '', resolveImageSrc }: MarkdownRendererProps) {
  const markdownComponents: Components = {
    ...components,
    img({ src, alt, ...props }) {
      const rawSrc = typeof src === 'string' ? src : ''
      const resolvedByResolver = rawSrc ? resolveImageSrc?.(rawSrc) : undefined
      const missingLocalImage = rawSrc.startsWith(LOCAL_NOTE_IMAGE_SRC_PREFIX) && !resolvedByResolver
      const resolvedSrc = resolvedByResolver ?? rawSrc
      if (missingLocalImage) {
        return <span className={ns('imgMissing')}>本地图片不可用</span>
      }
      return <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" className={ns('img')} {...props} />
    },
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}
        components={markdownComponents} urlTransform={transformMarkdownUrl}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
