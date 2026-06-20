import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'
export const useAuthStore = create(persist(
  (set) => ({
    user: null, isAuthenticated: false,
    login: async (username, password) => {
      const res = await api.post('/api/auth/login/', { username, password })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      const profile = await api.get('/api/auth/profile/')
      set({ user: profile.data, isAuthenticated: true })
      return profile.data
    },
    logout: () => { localStorage.clear(); set({ user: null, isAuthenticated: false }) },
  }),
  { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
))
