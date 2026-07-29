import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_STORE, DEMO_PRESETS } from '../utils/demoData'
import { useAuthStore } from './useAuthStore'

// Map demo slugs → preset keys
const DEMO_SLUGS = {
  'demo':         'cafe',
  'demo-cafe':    'cafe',
  'demo-clothes': 'clothes',
  'demo-market':  'supermarket',
}

const getDemoStore = (slug) => {
  const presetKey = DEMO_SLUGS[slug]
  if (!presetKey) return DEMO_STORE
  const preset = DEMO_PRESETS[presetKey]
  return {
    ...DEMO_STORE,
    id: `demo-store-${presetKey}`,
    name: preset.store.name,
    description: preset.store.description,
    slug,
    primary_color: preset.color,
    _presetKey: presetKey,
    working_hours_start: preset.store.working_hours_start || '09:00',
    working_hours_end: preset.store.working_hours_end || '23:00',
    shipping_options: DEMO_STORE.shipping_options,
  }
}

const checkDemo = (slugOrId) => {
  const demoSlugs = Object.keys(DEMO_SLUGS)
  return !isConfigured ||
         useAuthStore.getState().isDemoMode ||
         demoSlugs.includes(slugOrId) ||
         slugOrId === 'demo-store-001' ||
         (slugOrId && slugOrId.startsWith('demo-store-')) ||
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
          const demoStore = getDemoStore(slugOrId)
          set({ store: demoStore, loading: false })
          return demoStore
        }
        // Clear old store state immediately to avoid showing stale cached data
        set({ store: null, loading: true, error: null })
        // Try slug first, then id
        let { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('slug', slugOrId)
          .maybeSingle()
        if (!data && !error) {
          // Try by id if slug not found
          const res = await supabase.from('stores').select('*').eq('id', slugOrId).maybeSingle()
          data = res.data
          error = res.error
        }
        if (error) { set({ error: error.message, loading: false }); return null }
        if (!data) { set({ error: 'المتجر غير موجود', loading: false }); return null }
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
