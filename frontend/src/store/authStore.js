import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'
export const useAuthStore = create(persist(
  (set) => ({
    user: null, isAuthenticated: false, plan: 'pro',
    login: async (username, password) => {
      const res = await api.post('/api/auth/login/', { username, password })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      const profile = await api.get('/api/auth/profile/')
      let plan = 'pro'
      try { const b = await api.get('/api/business/'); plan = b.data.plan || 'pro' } catch { /* keep default */ }
      set({ user: profile.data, isAuthenticated: true, plan })
      return profile.data
    },
    refreshPlan: async () => {
      try { const b = await api.get('/api/business/'); set({ plan: b.data.plan || 'pro' }) } catch { /* ignore */ }
    },
    logout: () => { localStorage.clear(); set({ user: null, isAuthenticated: false, plan: 'pro' }) },
  }),
  { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, plan: s.plan }) }
))
