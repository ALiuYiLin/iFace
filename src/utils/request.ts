import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const message =
      error.response?.data?.error?.message
      ?? error.response?.data?.message
      ?? error.message
      ?? '请求失败'

    const code = error.response?.data?.error?.code ?? 'UNKNOWN_ERROR'
    const status = error.response?.status ?? 0

    return Promise.reject({ code, message, status, data: error.response?.data })
  },
)

export default api
