import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],           // { product, quantity, selectedOptions }
      storeId: null,
      customerInfo: null,  // { name, phone, address } — auto-fill

      setStoreId: (id) => {
        if (!id) return
        const currentId = get().storeId
        if (currentId && currentId !== id) {
          set({ items: [], storeId: id })
        } else if (!currentId) {
          set({ storeId: id })
        }
      },

      addItem: (product, selectedOptions = {}, quantity = 1) => {
        const key = `${product.id}-${JSON.stringify(selectedOptions)}`
        set((s) => {
          const existing = s.items.find((i) => i.key === key)
          if (existing) {
            return { items: s.items.map((i) => i.key === key ? { ...i, quantity: i.quantity + quantity } : i) }
          }
          return { items: [...s.items, { key, product, quantity, selectedOptions }] }
        })
      },

      removeItem: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      updateQty: (key, qty) => {
        if (qty <= 0) { get().removeItem(key); return }
        set((s) => ({ items: s.items.map((i) => i.key === key ? { ...i, quantity: qty } : i) }))
      },

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => {
        const optionExtra = Object.values(i.selectedOptions || {}).reduce((s, opt) => s + Number(opt.price || 0), 0)
        return sum + (Number(i.product.price) + optionExtra) * i.quantity
      }, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      setCustomerInfo: (info) => set({ customerInfo: info }),
    }),
    {
      name: 'fawri-cart',
      partialize: (s) => ({ items: s.items, storeId: s.storeId, customerInfo: s.customerInfo }),
    }
  )
)
