import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_STORE } from '../utils/demoData'
import { useAuthStore } from './useAuthStore'

const checkDemo = (slugOrId) => {
  return !isConfigured || 
         useAuthStore.getState().isDemoMode || 
         slugOrId === 'demo' || 
         slugOrId === 'demo-store-001' ||
         (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard') && !useAuthStore.getState().user)
}

export const useStoreConfig = create(
  persist(
    (set, get) => ({
      store: null,
      loading: false,
      error: null,

      setStore: (store) => set({ store }),

      fetchStore: async (slugOrId) => {
        const isDemo = checkDemo(slugOrId)
        if (isDemo) {
          set({ store: DEMO_STORE, loading: false })
          return DEMO_STORE
        }
        set({ loading: true, error: null })
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
          .single()
        if (error) { set({ error: error.message, loading: false }); return null }
        set({ store: data, loading: false })
        return data
      },

      fetchMyStore: async (userId) => {
        const isDemo = checkDemo()
        if (isDemo) {
          set({ store: DEMO_STORE, loading: false })
          return DEMO_STORE
        }
        set({ loading: true, error: null })
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', userId)
          .single()
        if (error && error.code !== 'PGRST116') {
          set({ error: error.message, loading: false })
          return null
        }
        set({ store: data || null, loading: false })
        return data
      },

      createStore: async (storeData) => {
        const isDemo = checkDemo()
        if (isDemo) {
          const mockStore = {
            ...storeData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }
          set({ store: mockStore, loading: false })
          return mockStore
        }
        set({ loading: true, error: null })
        const { data, error } = await supabase
          .from('stores')
          .insert(storeData)
          .select()
          .single()
        if (error) { set({ error: error.message, loading: false }); throw error }
        set({ store: data, loading: false })
        return data
      },

      updateStore: async (updates) => {
        const { store } = get()
        if (!store) return
        const isDemo = checkDemo()
        if (isDemo) {
          set({ store: { ...store, ...updates } })
          return
        }
        const { data, error } = await supabase
          .from('stores')
          .update(updates)
          .eq('id', store.id)
          .select()
          .single()
        if (error) throw error
        set({ store: data })
        return data
      },
    }),
    {
      name: 'sare3-store-config',
      partialize: (s) => ({ store: s.store }),
    }
  )
)
