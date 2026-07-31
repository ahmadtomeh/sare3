import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const update = await req.json()
    const message = update.message || update.edited_message

    if (message && message.text) {
      const text = message.text.trim()
      const chatId = String(message.chat.id)

      // Check if message is /start STORE_ID
      if (text.startsWith('/start')) {
        const parts = text.split(' ')
        const storeId = parts[1] ? parts[1].trim() : null

        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://aewutaqpjigaqpdnfrwu.supabase.co'
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFld3V0YXFwamlnYXFwZG5mcnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDk2MjYsImV4cCI6MjEwMDQ4NTYyNn0.Nc8stbQBls4fFC7gXtSZDYoj6ByrQ87EvWQrMwEk_G0'
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const BOT_TOKEN = '8222454961:AAEEDv-XsHx9xMSGJW_BEIIqlEtWNMsT2w0'

        if (storeId && storeId !== 'demo') {
          // Auto-save the merchant's chat_id to their store in Supabase
          const { data: updatedStore } = await supabase
            .from('stores')
            .update({ telegram_chat_id: chatId })
            .eq('id', storeId)
            .select('name')
            .single()

          const storeName = updatedStore?.name ? `(${updatedStore.name})` : ''

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🎉 *تم ربط إشعارات متجرك ${storeName} بنجاح!*\n\nستصلك طلبيات الزبائن فوراً هنا بصوت عالي ونغمة مميزة حتى لو كان هاتفك مقفلاً 🔔⚡`,
              parse_mode: 'Markdown',
            }),
          })
        } else {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👋 أهلاً بك في بوت إشعارات منصة فوري ⚡\n\nربط الإشعارات يتم بنقرة واحدة مباشرة من لوحة تحكم متجرك!`,
              parse_mode: 'Markdown',
            }),
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
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
