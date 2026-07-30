import { create } from 'zustand'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_PRESETS } from '../utils/demoData'
import { useAuthStore } from './useAuthStore'
import { useStoreConfig } from './useStoreConfig'

const checkDemo = (storeId) => {
  return !isConfigured ||
         useAuthStore.getState().isDemoMode ||
         (storeId && storeId.startsWith('demo-store-')) ||
         (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard') && !useAuthStore.getState().user)
}

export const useProductsStore = create((set, get) => ({
  categories: [],
  products: [],
  loading: false,
  error: null,

  fetchAll: async (storeId) => {
    const isDemo = checkDemo(storeId)
    if (isDemo || !storeId) {
      // Load the correct preset based on the current store's _presetKey
      const currentStore = useStoreConfig.getState().store
      const presetKey = currentStore?._presetKey
      if (presetKey && DEMO_PRESETS[presetKey]) {
        const preset = DEMO_PRESETS[presetKey]
        const demoId = `demo-store-${presetKey}`
        const cats = preset.categories.map((c, i) => ({ ...c, store_id: demoId, sort_order: i }))
        const prods = preset.products.map((p, i) => ({ ...p, store_id: demoId, is_available: p.in_stock, sort_order: i }))
        set({ categories: cats, products: prods, loading: false })
      } else {
        set({ categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS, loading: false })
      }
      return
    }

    // Instant Cache Read (0ms latency!)
    const cacheKey = `sare3_products_${storeId}`
    try {
      const cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.categories && parsed?.products) {
          set({ categories: parsed.categories, products: parsed.products, loading: false })
        }
      }
    } catch {}

    if (get().products.length === 0) {
      set({ loading: true })
    }

    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order'),
        supabase.from('products').select('*').eq('store_id', storeId).order('sort_order'),
      ])

      const freshCats = catRes.data || []
      const freshProds = prodRes.data || []

      set({
        categories: freshCats,
        products: freshProds,
        loading: false,
      })

      try {
        const jsonStr = JSON.stringify({ categories: freshCats, products: freshProds })
        sessionStorage.setItem(cacheKey, jsonStr)
        localStorage.setItem(cacheKey, jsonStr)
      } catch {}
    } catch (err) {
      console.warn('Error fetching products:', err)
      set({ loading: false })
    }
  },

  // ── Categories ──────────────────────────────────────────────
  addCategory: async (storeId, cat) => {
    const isDemo = checkDemo()
    if (isDemo) {
      const newCat = { ...cat, id: crypto.randomUUID(), store_id: storeId }
      set((s) => ({ categories: [...s.categories, newCat] }))
      return newCat
    }
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...cat, store_id: storeId })
      .select().single()
    if (error) throw error
    set((s) => ({ categories: [...s.categories, data] }))
    return data
  },

  updateCategory: async (id, updates) => {
    const isDemo = checkDemo()
    if (isDemo) {
      set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, ...updates } : c) }))
      return
    }
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single()
    if (error) throw error
    set((s) => ({ categories: s.categories.map((c) => c.id === id ? data : c) }))
  },

  deleteCategory: async (id) => {
    const isDemo = checkDemo()
    if (isDemo) {
      set((s) => ({
        categories: s.categories.filter((c) => c.id !== id),
        products: s.products.map((p) => p.category_id === id ? { ...p, category_id: null } : p),
      }))
      return
    }
    await supabase.from('categories').delete().eq('id', id)
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
  },

  // ── Products ────────────────────────────────────────────────
  addProduct: async (storeId, prod) => {
    const isDemo = checkDemo()
    if (isDemo) {
      const newProd = { ...prod, id: crypto.randomUUID(), store_id: storeId, created_at: new Date().toISOString() }
      set((s) => ({ products: [...s.products, newProd] }))
      return newProd
    }
    const { data, error } = await supabase
      .from('products')
      .insert({ ...prod, store_id: storeId })
      .select().single()
    if (error) throw error
    set((s) => ({ products: [...s.products, data] }))
    return data
  },

  updateProduct: async (id, updates) => {
    const isDemo = checkDemo()
    if (isDemo) {
      set((s) => ({ products: s.products.map((p) => p.id === id ? { ...p, ...updates } : p) }))
      return
    }
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single()
    if (error) throw error
    set((s) => ({ products: s.products.map((p) => p.id === id ? data : p) }))
  },

  deleteProduct: async (id) => {
    const isDemo = checkDemo()
    if (isDemo) {
      set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
      return
    }
    await supabase.from('products').delete().eq('id', id)
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
  },

  toggleAvailability: async (id) => {
    const product = get().products.find((p) => p.id === id)
    if (!product) return
    await get().updateProduct(id, { is_available: !product.is_available })
  },

  subscribeToProducts: (storeId) => {
    const isDemo = checkDemo(storeId)
    if (isDemo || !storeId) return () => {}

    const cacheKey = `sare3_products_${storeId}`
    const channel = supabase
      .channel(`products-${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
      }, (payload) => {
        const isTargetStore = (payload.new && payload.new.store_id === storeId) ||
                              (payload.old && get().products.some(p => p.id === payload.old.id))
        if (!isTargetStore) return

        set((s) => {
          let nextProducts = [...s.products]
          if (payload.eventType === 'INSERT') {
            if (!nextProducts.some(p => p.id === payload.new.id)) {
              nextProducts.push(payload.new)
            }
          } else if (payload.eventType === 'UPDATE') {
            nextProducts = nextProducts.map(p => p.id === payload.new.id ? payload.new : p)
          } else if (payload.eventType === 'DELETE') {
            nextProducts = nextProducts.filter(p => p.id !== payload.old.id)
          }

          try {
            const cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey)
            if (cached) {
              const parsed = JSON.parse(cached)
              parsed.products = nextProducts
              const jsonStr = JSON.stringify(parsed)
              sessionStorage.setItem(cacheKey, jsonStr)
              localStorage.setItem(cacheKey, jsonStr)
            }
          } catch {}

          return { products: nextProducts }
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  getByCategory: (catId) => {
    const prods = get().products
    if (!catId) return prods
    return prods.filter((p) => p.category_id === catId)
  },
}))
