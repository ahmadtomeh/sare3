import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isConfigured } from '../lib/supabase'
import { DEMO_ORDERS } from '../utils/demoData'
import { useAuthStore } from './useAuthStore'

// Always use the correct hardcoded Supabase URL for edge function calls
const CORRECT_SUPABASE_URL = 'https://aewutaqpjigaqpdnfrwu.supabase.co'
const CORRECT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

const checkDemo = () => {
  return !isConfigured || 
         useAuthStore.getState().isDemoMode || 
         (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard') && !useAuthStore.getState().user)
}

export const useOrdersStore = create(
  persist(
    (set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async (storeId) => {
    const isDemo = checkDemo()
    if (isDemo) { set({ orders: DEMO_ORDERS, loading: false }); return }
    if (get().orders.length === 0) {
      set({ loading: true })
    }
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

    const { data: insertedData, error: insertError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .maybeSingle()

    if (insertError) {
      console.warn('Insert error:', insertError)
    }

    let data = insertedData
    if (!data) {
      data = {
        ...orderData,
        id: crypto.randomUUID(),
        order_number: Math.floor(Math.random() * 9000) + 1000,
        status: 'new',
        created_at: new Date().toISOString()
      }
    }

    set((s) => ({ orders: [data, ...s.orders] }))

    // ── إشعار تيليجرام فوري ──
    try {
      const { data: storeData } = await supabase
        .from('stores')
        .select('telegram_chat_id, name, currency')
        .eq('id', orderData.store_id)
        .single()

      if (storeData?.telegram_chat_id) {
        const itemsList = (data.items || [])
          .filter(i => !i.isSpecial)
          .map((i, idx, arr) => `${idx === arr.length - 1 ? '└' : '├'} ${i.quantity}x ${i.product?.name}`)
          .join('\n') || '└ لا توجد تفاصيل'

        const cleanPhone = (data.customer_phone || '').replace(/[^0-9]/g, '')
        const orderTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })

        const msg = [
          `⚡ *طلب جديد واصل الآن!*`,
          `━━━━━━━━━━━━━━━━━━━`,
          `📦 *رقم الطلب:* \`#${data.order_number}\``,
          `🏪 *المتجر:* ${storeData.name || 'فوري'}`,
          `⏰ *التوقيت:* \`${orderTime}\``,
          ``,
          `👤 *بيانات الزبون:*`,
          `├ 👤 *الاسم:* ${data.customer_name || 'غير محدد'}`,
          data.customer_phone ? `├ 📞 *الهاتف:* \`${data.customer_phone}\`` : null,
          data.customer_address ? `└ 📍 *العنوان:* ${data.customer_address}` : null,
          ``,
          `🛍️ *قائمة الطلبية (${(data.items || []).length} عناصر):*`,
          itemsList,
          ``,
          `💰 *إجمالي الفاتورة:* \`${data.total} ${storeData.currency || '₪'}\``,
          `💳 *طريقة الدفع:* الدفع عند الاستلام 💵`,
          data.notes ? `📝 *ملاحظات:* ${data.notes}` : null,
          `━━━━━━━━━━━━━━━━━━━`,
        ].filter(Boolean).join('\n')

        const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8222454961:AAEEDv-XsHx9xMSGJW_BEIIqlEtWNMsT2w0'
        let chatId = storeData?.telegram_chat_id

        // إذا التاجر لم يحفظ Chat ID يدوياً، ابحث عنه تلقائياً في getUpdates برابط الـ 1-Click!
        if (!chatId && BOT_TOKEN) {
          try {
            const updatesRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-20`)
            const updatesData = await updatesRes.json()
            if (updatesData.ok && Array.isArray(updatesData.result)) {
              for (const update of [...updatesData.result].reverse()) {
                const text = update.message?.text || ''
                if (text.includes(orderData.store_id) || update.message?.chat?.id) {
                  chatId = String(update.message.chat.id)
                  supabase.from('stores').update({ telegram_chat_id: chatId }).eq('id', orderData.store_id).then(() => {})
                  break
                }
              }
            }
          } catch (e) {
            console.warn('Auto getUpdates check error:', e)
          }
        }

        const inlineKeyboard = []
        const row1 = []
        const row2 = []

        if (cleanPhone) {
          row1.push({ text: '💬 مراسلة الزبون واتساب', url: `https://wa.me/${cleanPhone}` })
        }

        if (data.customer_address) {
          row2.push({ text: '📍 موقع التوصيل على الخريطة', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.customer_address)}` })
        }
        row2.push({ text: '📋 فتح لوحة التحكم', url: 'https://fawri.shop/dashboard' })

        if (row1.length > 0) inlineKeyboard.push(row1)
        if (row2.length > 0) inlineKeyboard.push(row2)

        if (BOT_TOKEN && chatId) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msg,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: inlineKeyboard
              }
            }),
          })
        }
      }
    } catch (e) {
      console.warn('Telegram notification skipped/failed:', e)
    }

    // ── إشعار Web Push (حتى لو الهاتف مقفل) ──
    try {
      const items = (data.items || [])
        .filter(i => !i.isSpecial)
        .map(i => `${i.quantity}x ${i.product?.name}`)
        .join('، ')

      await fetch(`${CORRECT_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CORRECT_ANON_KEY}`,
        },
        body: JSON.stringify({
          store_id: orderData.store_id,
          notification: {
            title: `🛒 طلب جديد #${data.order_number}`,
            body: `${data.customer_name} — ${items} — ${data.total} ₪`,
            tag: `order-${data.id}`,
            url: '/dashboard',
            orderId: data.id,
          },
        }),
      })
    } catch {
      // Web Push اختياري — لا يوقف العملية
    }

    return data
  },

  addLiveOrder: (order) => {
    set((s) => {
      if (s.orders.some((o) => o.id === order.id)) return s
      return { orders: [order, ...s.orders] }
    })
  },

  subscribeToOrders: (storeId) => {
    const channel = supabase
      .channel(`orders-${storeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        set((s) => {
          if (s.orders.some((o) => o.id === payload.new.id)) return s
          return { orders: [payload.new, ...s.orders] }
        })
      })
      .subscribe((status) => {
        console.log(`⚡ Realtime orders subscription status: ${status}`)
      })
    return () => supabase.removeChannel(channel)
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
    }),
    {
      name: 'fawri-orders',
      partialize: (s) => ({ orders: s.orders }),
    }
  )
)
