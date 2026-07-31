import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      role: null, // 'super_admin' | 'merchant' | 'staff'
      loading: (() => {
        try {
          const cached = localStorage.getItem('sare3-auth')
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed?.state?.user || parsed?.state?.isDemoMode) {
              return false
            }
          }
        } catch {}
        return true
      })(),
      session: null,
      isDemoMode: false,

      init: async () => {
        try {
          const { data } = await supabase.auth.getSession()
          if (data?.session?.user) {
            set({ user: data.session.user, session: data.session, loading: false })
          } else {
            set({ user: null, session: null, loading: false })
          }
        } catch (err) {
          console.warn('Auth init warning:', err)
          set({ user: null, session: null, loading: false })
        } finally {
          set({ loading: false })
        }

        try {
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              user: session?.user ?? null,
              session,
              loading: false,
            })
          })
        } catch (e) {}
      },

      signUp: async ({ email, password, name }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
        set({ isDemoMode: false })
        return data
      },

      signIn: async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        set({ user: data.user, session: data.session, isDemoMode: false })
        return data
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null, role: null, isDemoMode: false })
      },

      enterDemoMode: () => {
        set({ isDemoMode: true, user: null, session: null })
      },

      isAuthenticated: () => !!get().user || get().isDemoMode,
    }),
    {
      name: 'sare3-auth',
      partialize: (s) => ({ user: s.user, role: s.role, isDemoMode: s.isDemoMode }),
    }
  )
)
