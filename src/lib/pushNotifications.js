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
 * Saves the subscription to Supabase so the Edge Function can send pushes.
 */
export async function subscribeToPush(storeId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('متصفحك لا يدعم الإشعارات الفورية')
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

  // 3. إلغاء أي اشتراك قديم تالف لضمان تجديد مفتاح VAPID في خوادم Google Push
  try {
    const oldSub = await reg.pushManager.getSubscription()
    if (oldSub) {
      await oldSub.unsubscribe()
    }
  } catch (e) {
    console.warn('Failed to unsubscribe old sub:', e)
  }

  // 4. الاشتراك من جديد فريش بالمفتاح الحالي
  let subscription
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  } catch (err) {
    if (err.message && (err.message.includes('applicationServerKey') || err.name === 'InvalidAccessError')) {
      console.warn('VAPID key invalid on P-256 curve, generating dynamic valid keypair...')
      const dynamicPair = await generateValidVapidPair()
      localStorage.setItem('sare3_dynamic_vapid', JSON.stringify(dynamicPair))
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(dynamicPair.publicKey),
      })
    } else {
      throw err
    }
  }

  if (!storeId) {
    throw new Error('لم يتم الترفق برقم المتجر (storeId)')
  }

  // 5. حفظ الـ Subscription في Supabase
  const subJson = subscription.toJSON()
  const payload = {
    store_id: storeId,
    endpoint: subJson.endpoint,
    p256dh: subJson.keys?.p256dh,
    auth: subJson.keys?.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    payload,
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('push_subscriptions upsert failed:', error)
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
