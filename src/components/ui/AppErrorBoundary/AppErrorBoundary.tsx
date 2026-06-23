import { Component, type ErrorInfo, type ReactNode } from 'react'
import { recoverFromAppLoadError } from '@/lib/appRecovery'
import { useNameSpace } from '@/utils'
import styles from './AppErrorBoundary.module.css'

const ns = useNameSpace(styles)

interface AppErrorBoundaryProps {
  children: ReactNode
  resetKey: string
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (recoverFromAppLoadError(error)) return
    console.error('iFace render error', error, errorInfo)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className={`page-container ${ns('wrapper')}`}>
        <div className={`card ${ns('card')}`}>
          <h1 className={ns('title')}>页面加载遇到问题</h1>
          <p className={ns('desc')}>可能是 PWA 缓存中的页面资源已经更新。刷新后会重新加载最新资源。</p>
          <button type="button" onClick={() => window.location.reload()} className={ns('reloadBtn')}>
            刷新页面
          </button>
        </div>
      </div>
    )
  }
}
