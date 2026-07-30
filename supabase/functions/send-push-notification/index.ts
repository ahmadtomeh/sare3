import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    })
  }

  try {
    const { store_id, notification } = await req.json()

    // @ts-ignore
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLezs-OShOVXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU'
    // @ts-ignore
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE'
    // @ts-ignore
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'https://sare-nine.vercel.app'
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://aewutaqpjigaqpdnfrwu.supabase.co'
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all push subscriptions for this store
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('store_id', store_id)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    let sent = 0
    let failed = 0

    for (const sub of subs) {
      try {
        const vapidPub = sub.vapid_public_key || VAPID_PUBLIC_KEY
        const vapidPriv = sub.vapid_private_key || VAPID_PRIVATE_KEY
        webpush.setVapidDetails(VAPID_SUBJECT, vapidPub, vapidPriv)

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(notification),
          { TTL: 86400 }
        )
        sent++
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
