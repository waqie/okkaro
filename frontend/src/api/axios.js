import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use((res) => res, async (error) => {
  if (error.response?.status === 401) {
    const refresh = localStorage.getItem('refresh_token')
    if (refresh) {
      try {
        const res = await axios.post(`${api.defaults.baseURL}/api/auth/refresh/`, { refresh })
        localStorage.setItem('access_token', res.data.access)
        error.config.headers.Authorization = `Bearer ${res.data.access}`
        return api(error.config)
      } catch { localStorage.clear(); window.location.href = '/login' }
    }
  }
  return Promise.reject(error)
})
export default api
