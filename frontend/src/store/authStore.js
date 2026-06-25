import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'
export const useAuthStore = create(persist(
  (set) => ({
    user: null, isAuthenticated: false, plan: 'pro', business: null,
    login: async (username, password) => {
      const res = await api.post('/api/auth/login/', { username, password })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      const profile = await api.get('/api/auth/profile/')
      let plan = 'pro', business = null
      try { const b = await api.get('/api/business/'); business = b.data; plan = b.data.plan || 'pro' } catch { /* keep default */ }
      set({ user: profile.data, isAuthenticated: true, plan, business })
      return profile.data
    },
    refreshPlan: async () => {
      try { const b = await api.get('/api/business/'); set({ plan: b.data.plan || 'pro', business: b.data }) } catch { /* ignore */ }
    },
    setBusiness: (business) => set({ business }),
    switchBranch: async (schema) => {
      const res = await api.post('/api/branches/switch/', { schema })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      try { const b = await api.get('/api/business/'); set({ business: b.data, plan: b.data.plan || 'pro' }) } catch { /* ignore */ }
      window.location.reload()
    },
    logout: () => { localStorage.clear(); set({ user: null, isAuthenticated: false, plan: 'pro', business: null }) },
  }),
  { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, plan: s.plan, business: s.business }) }
))
