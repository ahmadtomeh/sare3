import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// @ts-ignore
Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // 1. جلب subscription الزبون بناءً على order_id
    const { data: subs, error: subError } = await supabase
      .from('customer_push_subscriptions')
      .select('*')
      .eq('order_id', order_id)

    if (subError) throw subError

    if (!subs || subs.length === 0) {
      console.log(`No subscriptions found for order_id: ${order_id}`)
      return new Response(JSON.stringify({ sent: 0, message: 'No customer subscriptions' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log(`Found ${subs.length} subscriptions for order_id: ${order_id}`)

    // 2. جلب معلومات المتجر بشكل منفصل لتجنب أي مشاكل في العلاقات
    const storeId = subs[0].store_id
    const { data: storeObj } = await supabase
      .from('stores')
      .select('slug, logo_url')
      .eq('id', storeId)
      .maybeSingle()

    const storeLogo = storeObj?.logo_url 
      ? storeObj.logo_url 
      : `https://www.fawri.shop/api/store-icon?slug=${encodeURIComponent(storeObj?.slug || '')}`

    const statusMessages: Record<string, { title: string; body: string }> = {
      confirmed:  { title: '✅ تم تأكيد طلبك!', body: `طلبك #${order_number} من ${store_name} تم تأكيده` },
      preparing:  { title: '👨‍🍳 يتم تحضير طلبك', body: `طلبك #${order_number} من ${store_name} قيد التحضير` },
      ready:      { title: '🎉 طلبك جاهز!', body: `طلبك #${order_number} من ${store_name} جاهز للاستلام` },
      delivering: { title: '🚗 طلبك في الطريق!', body: `طلبك #${order_number} من ${store_name} على الطريق إليك` },
      delivered:  { title: '✅ تم التوصيل!', body: `طلبك #${order_number} من ${store_name} وصل. شكراً! 🙏` },
      cancelled:  { title: '❌ تم إلغاء الطلب', body: `طلبك #${order_number} من ${store_name} تم إلغاؤه` },
    }
    const msg = statusMessages[status] || { title: `تحديث طلبك من ${store_name}`, body: `رقم الطلب #${order_number}` }
    
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

    let sent = 0
    for (const sub of subs) {
      try {
        console.log(`Attempting to send push to endpoint: ${sub.endpoint}`)
        webpush.setVapidDetails(VAPID_SUBJECT, sub.vapid_public_key, sub.vapid_private_key)
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(notification), { TTL: 86400, urgency: 'high' })
        sent++
        console.log(`Push sent successfully to: ${sub.endpoint}`)
      } catch (e: any) {
        console.error(`Push failed for endpoint: ${sub.endpoint}. Error:`, e)
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          await supabase.from('customer_push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
    return new Response(JSON.stringify({ sent, count: subs.length }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (err: any) {
    console.error('Edge Function top level error:', err)
    return new Response(JSON.stringify({ error: err?.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
