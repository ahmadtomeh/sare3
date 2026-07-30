import { supabase } from './supabase'

const BOT_TOKEN = '8222454961:AAEEDv-XsHx9xMSGJW_BEIIqlEtWNMsT2w0'

export async function checkAndBindTelegram(storeId) {
  if (!storeId) return null

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-20`)
    const data = await res.json()
    if (!data.ok || !Array.isArray(data.result)) return null

    for (const update of [...data.result].reverse()) {
      const text = update.message?.text || ''
      const chatId = update.message?.chat?.id

      if (chatId) {
        const chatIdStr = String(chatId)
        // 1. Save chat_id to store in Supabase
        const { data: updatedStore } = await supabase
          .from('stores')
          .update({ telegram_chat_id: chatIdStr })
          .eq('id', storeId)
          .select('name')
          .single()

        const storeName = updatedStore?.name || 'متجرك'

        // 2. Send instant confirmation message to merchant on Telegram
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatIdStr,
            text: `🎉 *تم ربط إشعارات ${storeName} بنجاح!*\n\nستصلك طلبيات الزبائن فوراً هنا بصوت عالي ونغمة مميزة حتى لو كان هاتفك مقفلاً 🔔⚡`,
            parse_mode: 'Markdown',
          }),
        })

        return chatIdStr
      }
    }
  } catch (err) {
    console.error('Telegram bind error:', err)
  }
  return null
}
