import { create } from 'zustand'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_ORDERS } from '../utils/demoData'
import { useAuthStore } from './useAuthStore'

const checkDemo = () => {
  return !isConfigured || 
         useAuthStore.getState().isDemoMode || 
         (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard') && !useAuthStore.getState().user)
}

export const useOrdersStore = create((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (storeId) => {
    const isDemo = checkDemo()
    if (isDemo) { set({ orders: DEMO_ORDERS, loading: false }); return }
    set({ loading: true })
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (!error) set({ orders: data || [] })
    set({ loading: false })
  },

  placeOrder: async (orderData) => {
    const isDemo = checkDemo()
    if (isDemo) {
      const newOrder = {
        ...orderData,
        id: crypto.randomUUID(),
        order_number: Math.floor(Math.random() * 9000) + 1000,
        status: 'new',
        created_at: new Date().toISOString(),
      }
      set((s) => ({ orders: [newOrder, ...s.orders] }))
      return newOrder
    }
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()
    if (error) throw error
    set((s) => ({ orders: [data, ...s.orders] }))

    // ── إشعار تيليجرام فوري ──
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('telegram_chat_id, name, currency')
        .eq('id', orderData.store_id)
        .single()

      if (storeData?.telegram_chat_id) {
        const items = (data.items || [])
          .filter(i => !i.isSpecial)
          .map(i => `• ${i.quantity}x ${i.product?.name}`)
          .join('\n')

        const msg = [
          `🛒 *طلب جديد #${data.order_number}*`,
          `🏪 ${storeData.name}`,
          ``,
          `👤 *${data.customer_name}*`,
          data.customer_phone ? `📞 ${data.customer_phone}` : null,
          data.customer_address ? `📍 ${data.customer_address}` : null,
          ``,
          items,
          ``,
          `💰 *الإجمالي: ${data.total} ${storeData.currency || '₪'}*`,
          data.notes ? `📝 ${data.notes}` : null,
        ].filter(Boolean).join('\n')

        const BOT_TOKEN = '7770225613:AAFVHJsM_7-SoovCJmA-WkyidZ-jwMFBZbE'
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: storeData.telegram_chat_id,
            text: msg,
            parse_mode: 'Markdown',
          }),
        })
      }
    } catch {
      // إشعار تيليجرام اختياري — لا يوقف العملية
    }

    return data
  },

  addLiveOrder: (order) => {
    set((s) => {
      if (s.orders.some((o) => o.id === order.id)) return s
      return { orders: [order, ...s.orders] }
    })
  },

  updateStatus: async (orderId, status) => {
    const isDemo = checkDemo()
    if (isDemo) {
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === orderId ? { ...o, status, status_updated_at: new Date().toISOString() } : o
        ),
      }))
      return
    }
    const { data, error } = await supabase
      .from('orders')
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()
    if (error) throw error
    set((s) => ({
      orders: s.orders.map((o) => o.id === orderId ? data : o),
    }))
  },

  getStats: () => {
    const orders = get().orders
    const total = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)
    const today = new Date().toDateString()
    const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today)
    return {
      totalOrders: orders.length,
      totalRevenue: total,
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
      newOrders: orders.filter((o) => o.status === 'new').length,
    }
  },
}))
