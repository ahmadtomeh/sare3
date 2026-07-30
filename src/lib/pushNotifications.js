// ── Web Push Subscription Manager ──
// Handles subscribing, unsubscribing, and saving subscriptions to Supabase

import { supabase } from './supabase'

const DEFAULT_VAPID_PUBLIC_KEY = 'BlnicYbfYPJbl0_MIPaR6P4ISgHCLYLCEo_d6Us6R2ZElfMd1w8_6axXTySSmw7XkNcpJkXGGZfvpntaUVuAS2s'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY

/**
 * Convert a base64url VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

/**
 * Subscribe this browser to push notifications.
 * Saves the subscription to Supabase so the Edge Function can send pushes.
 */
export async function subscribeToPush(storeId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('متصفحك لا يدعم الإشعارات الفورية')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID key غير مضبوط — أضف VITE_VAPID_PUBLIC_KEY في إعدادات Vercel')
  }

  // 1. طلب إذن الإشعارات
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('لم يُمنح إذن الإشعارات')
  }

  // 2. الحصول على Service Worker
  const reg = await navigator.serviceWorker.ready

  // 3. الاشتراك في Push
  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  // 4. حفظ الـ Subscription في Supabase
  const subJson = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      store_id: storeId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' }
  )

  if (error) throw error
  return subscription
}

/**
 * Unsubscribe from push notifications and remove from Supabase.
 */
export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.getSubscription()
  if (!subscription) return

  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

/**
 * Check if push notifications are currently active
 */
export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

/**
 * Check what notification permission is granted
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}
