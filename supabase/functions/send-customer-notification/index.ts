import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    })
  }

  try {
    const { order_id, status, store_name, order_number } = await req.json()

    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://aewutaqpjigaqpdnfrwu.supabase.co'
    // @ts-ignore
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkwOTYyNiwiZXhwIjoyMTAwNDg1NjI2fQ.placeholder'
    // @ts-ignore
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'https://fawri.shop'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // جلب subscription الزبون بناءً على order_id مع تفاصيل المتجر للبراندينج
    const { data: subs } = await supabase
      .from('customer_push_subscriptions')
      .select('*, stores(slug, logo_url)')
      .eq('order_id', order_id)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No customer subscriptions' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const storeObj = (subs[0] as any)?.stores
    const storeLogo = storeObj?.logo_url 
      ? storeObj.logo_url 
      : `https://www.fawri.shop/api/store-icon?slug=${encodeURIComponent(storeObj?.slug || '')}`

    // رسائل حالة الطلب بالعربي
    const statusMessages: Record<string, { title: string; body: string; emoji: string }> = {
      new:        { title: '📦 تم استلام طلبك', body: `طلبك #${order_number} من ${store_name} قيد المراجعة`, emoji: '📦' },
      confirmed:  { title: '✅ تم تأكيد طلبك!', body: `طلبك #${order_number} من ${store_name} تم تأكيده`, emoji: '✅' },
      preparing:  { title: '👨‍🍳 يتم تحضير طلبك', body: `طلبك #${order_number} من ${store_name} قيد التحضير الآن`, emoji: '👨‍🍳' },
      ready:      { title: '🎉 طلبك جاهز!', body: `طلبك #${order_number} من ${store_name} جاهز للاستلام`, emoji: '🎉' },
      delivering: { title: '🚗 طلبك في الطريق!', body: `طلبك #${order_number} من ${store_name} على الطريق إليك`, emoji: '🚗' },
      delivered:  { title: '✅ تم التوصيل!', body: `طلبك #${order_number} من ${store_name} وصل. شكراً لك! 🙏`, emoji: '✅' },
      cancelled:  { title: '❌ تم إلغاء الطلب', body: `طلبك #${order_number} من ${store_name} تم إلغاؤه`, emoji: '❌' },
    }

    const msg = statusMessages[status] || {
      title: `تحديث طلبك من ${store_name}`,
      body: `رقم الطلب #${order_number} — الحالة: ${status}`,
      emoji: '📋'
    }

    const notification = {
      title: msg.title,
      body: msg.body,
      tag: `order-${order_id}-${status}`,
      url: '/my-orders',
      icon: storeLogo,
      badge: storeLogo,
      actions: [
        { action: 'open', title: '📋 تتبع الطلب' }
      ]
    }

    const results = await Promise.allSettled(
      subs.map(async (sub: any) => {
        webpush.setVapidDetails(VAPID_SUBJECT, sub.vapid_public_key, sub.vapid_private_key)
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(notification),
          { TTL: 86400, urgency: 'high' }
        )
      })
    )

    let sent = 0, failed = 0
    results.forEach((res: any, i: number) => {
      if (res.status === 'fulfilled') { sent++ }
      else {
        failed++
        const err = res.reason
        // حذف subscriptions المنتهية الصلاحية
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          supabase.from('customer_push_subscriptions').delete().eq('endpoint', subs[i].endpoint)
        }
      }
    })

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
