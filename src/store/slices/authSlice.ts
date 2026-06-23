import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { GitHubUser } from '@/store/useAuthStore'
import { buildGitHubOAuthUrl } from '@/store/useAuthStore'

export interface AuthState {
  token: string | null
  user: GitHubUser | null
  loading: boolean
  initialized: boolean
}

const initialState: AuthState = {
  token: null,
  user: null,
  loading: false,
  initialized: false,
}

export const login = createAsyncThunk('auth/login', async () => {
  const url = buildGitHubOAuthUrl()
  window.location.href = url
  return
})

export const setToken = createAsyncThunk('auth/setToken', async (token: string) => {
  localStorage.setItem('iface_github_token', token)
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const user: GitHubUser = await res.json()
  return { token, user }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      localStorage.removeItem('iface_github_token')
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => { state.loading = true })
    builder.addCase(login.fulfilled, (state) => { state.loading = false })
    builder.addCase(login.rejected, (state) => { state.loading = false })
    builder.addCase(setToken.pending, (state) => { state.loading = true })
    builder.addCase(setToken.fulfilled, (state, action) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.loading = false
      state.initialized = true
    })
    builder.addCase(setToken.rejected, (state) => { state.loading = false; state.initialized = true })
  },
})

export const { logout, setLoading } = authSlice.actions
export default authSlice.reducer
