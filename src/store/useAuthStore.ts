import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './hooks'
import { setToken as rtSetToken, logout as rtLogout, setLoading } from './slices/authSlice'

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

export interface AuthState {
  token: string | null
  user: GitHubUser | null
  loading: boolean
  initialized: boolean
}

const TOKEN_KEY = 'iface_gh_token'

function loadToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
function saveToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token) } catch {}
}
function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}

async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return { login: data.login, name: data.name ?? null, avatar_url: data.avatar_url, html_url: data.html_url }
}

export function buildGitHubOAuthUrl(): string {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  if (!clientId) throw new Error('VITE_GITHUB_CLIENT_ID is not set')
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  try { sessionStorage.setItem('iface_oauth_state', state) } catch {}
  const params = new URLSearchParams({ client_id: clientId, scope: 'gist', state })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

let _initialized = false

export function useAuthStore() {
  const dispatch = useAppDispatch()
  const { token, user, loading, initialized } = useAppSelector((s) => s.auth)

  useEffect(() => {
    if (_initialized) return
    _initialized = true
    const savedToken = loadToken()
    if (!savedToken) { dispatch(setLoading(false)); return }
    dispatch(rtSetToken(savedToken))
  }, [dispatch])

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('token=')) return
    const params = new URLSearchParams(hash.slice(1))
    const hashToken = params.get('token')
    if (!hashToken) return
    const returnedState = params.get('state')
    const savedState = (() => { try { return sessionStorage.getItem('iface_oauth_state') } catch { return null } })()
    if (savedState && returnedState && savedState !== returnedState) {
      console.warn('[auth] OAuth state mismatch')
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      return
    }
    try { sessionStorage.removeItem('iface_oauth_state') } catch {}
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    saveToken(hashToken)
    dispatch(rtSetToken(hashToken))
  }, [dispatch])

  const login = useCallback(() => {
    try { window.location.href = buildGitHubOAuthUrl() }
    catch (err) { console.error('[auth] Failed to build OAuth URL:', err) }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    dispatch(rtLogout())
  }, [dispatch])

  const setToken = useCallback(async (t: string) => {
    saveToken(t)
    dispatch(rtSetToken(t))
  }, [dispatch])

  return {
    token,
    user,
    loading,
    initialized,
    isLoggedIn: !!token && !!user,
    login,
    logout,
    setToken,
  }
}
