import { create } from 'zustand'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '../utils/demoData'
import { useAuthStore } from './useAuthStore'

const checkDemo = () => {
  return !isConfigured || 
         useAuthStore.getState().isDemoMode || 
         (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard') && !useAuthStore.getState().user)
}

export const useProductsStore = create((set, get) => ({
  categories: [],
  products: [],
  loading: false,
  error: null,

  fetchAll: async (storeId) => {
    const isDemo = checkDemo()
    if (isDemo || !storeId) {
      set({ categories: DEMO_CATEGORIES, products: DEMO_PRODUCTS, loading: false })
      return
    }
    set({ loading: true })
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order'),
      supabase.from('products').select('*').eq('store_id', storeId).order('sort_order'),
    ])
    set({
      categories: catRes.data || [],
      products: prodRes.data || [],
      loading: false,
    })
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

  getByCategory: (catId) => {
    const prods = get().products
    if (!catId) return prods
    return prods.filter((p) => p.category_id === catId)
  },
}))
