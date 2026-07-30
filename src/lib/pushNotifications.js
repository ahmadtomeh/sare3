// ── Web Push Subscription Manager ──
// Handles subscribing, unsubscribing, and saving subscriptions to Supabase

import { supabase } from './supabase'

const DEFAULT_VAPID_PUBLIC_KEY = 'BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLezs-OShOVXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY

/**
 * Convert a base64url VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const cleanStr = (base64String || '').trim().replace(/^["']|["']$/g, '')
  const padding = '='.repeat((4 - (cleanStr.length % 4)) % 4)
  const base64 = (cleanStr + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Generate a mathematically valid P-256 VAPID keypair in browser using WebCrypto
 */
export async function generateValidVapidPair() {
  const pair = await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  )
  const pubRaw = await window.crypto.subtle.exportKey("raw", pair.publicKey)
  const privPkcs8 = await window.crypto.subtle.exportKey("pkcs8", pair.privateKey)
  
  const toB64Url = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    
  return {
    publicKey: toB64Url(pubRaw),
    privateKey: toB64Url(new Uint8Array(privPkcs8).slice(36, 68))
  }
}

/**
 * Subscribe this browser to push notifications.
 * Generates a native WebCrypto P-256 VAPID keypair, subscribes via PushManager,
 * and saves matching subscription + keys to Supabase.
 */
export async function subscribeToPush(storeId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('متصفحك لا يدعم الإشعارات الفورية')
  }

  if (!storeId) {
    throw new Error('لم يتم الترفق برقم المتجر (storeId)')
  }

  // 1. طلب إذن الإشعارات
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('لم يُمنح إذن الإشعارات')
  }

  // 2. تسجيل والحصول على Service Worker
  let reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js')
  }
  await navigator.serviceWorker.ready

  // 3. إلغاء أي اشتراك قديم لضمان تجديد مفتاح VAPID في خوادم Google Push
  try {
    const oldSub = await reg.pushManager.getSubscription()
    if (oldSub) {
      await oldSub.unsubscribe()
    }
  } catch (e) {
    console.warn('Failed to unsubscribe old sub:', e)
  }

  // 4. توليد زوج مفاتيح VAPID حقيقي ومطابق 100% عبر WebCrypto
  const vapidPair = await generateValidVapidPair()

  // 5. الاشتراك فريش لدى خوادم التنبيه بالمفتاح الجديد
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPair.publicKey),
  })

  // 5. مسح أي اشتراكات قديمة منتهية الصلاحية للمتجر لضمان وجود رابط فريش واحد فقط
  try {
    await supabase.from('push_subscriptions').delete().eq('store_id', String(storeId))
  } catch (e) {
    console.warn('Could not clean old store push subs:', e)
  }

  // 6. حفظ الـ Subscription الفريش والمفاتيح المطلوبة في Supabase
  const subJson = subscription.toJSON()
  const payload = {
    store_id: String(storeId),
    endpoint: subJson.endpoint,
    p256dh: subJson.keys?.p256dh,
    auth: subJson.keys?.auth,
    vapid_public_key: vapidPair.publicKey,
    vapid_private_key: vapidPair.privateKey,
    user_agent: navigator.userAgent.slice(0, 200),
  }

  const { error } = await supabase.from('push_subscriptions').insert(payload)

  if (error) {
    console.error('push_subscriptions insert failed:', error)
    throw new Error('فشل حفظ التنبيه في قاعدة البيانات: ' + error.message)
  }

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
