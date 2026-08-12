// ── Customer Push Notification Subscription ──
// تمكّن الزبائن من تتبع طلباتهم عبر إشعارات Push

import { supabase } from './supabase'
import { generateValidVapidPair } from './pushNotifications'

function urlBase64ToUint8Array(base64String) {
  const cleanStr = (base64String || '').trim().replace(/^["']|["']$/g, '')
  const padding = '='.repeat((4 - (cleanStr.length % 4)) % 4)
  const base64 = (cleanStr + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/**
 * اشتراك الزبون بإشعارات تتبع الطلب
 * @param {string} orderId - UUID الطلب
 * @param {string} storeId - UUID المتجر
 * @param {number} orderNumber - رقم الطلب للعرض
 */
export async function subscribeCustomerToPush(orderId, storeId, orderNumber) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('متصفحك لا يدعم الإشعارات')
  }

  // طلب إذن الإشعارات
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('لم يُمنح إذن الإشعارات')
  }

  // تسجيل Service Worker
  let reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  // إلغاء الاشتراك القديم إن وُجد
  try {
    const old = await reg.pushManager.getSubscription()
    if (old) await old.unsubscribe()
  } catch {}

  // استخدام مفتاح VAPID العام الثابت للمنصة (مع تنظيف علامات الاقتباس إن وجدت)
  const activeVapidKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLezs-OShOVXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU')
    .trim()
    .replace(/^["']|["']$/g, '')

  // الاشتراك لدى خوادم Push
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(activeVapidKey),
  })

  const subJson = subscription.toJSON()

  // حذف أي اشتراك قديم لنفس الطلب أولاً (تجاهل الخطأ)
  try {
    await supabase.from('customer_push_subscriptions').delete().eq('order_id', orderId)
  } catch {}

  // حفظ الاشتراك الجديد في Supabase مرتبطاً بالطلب
  const payload = {
    order_id: orderId,
    order_number: orderNumber,
    store_id: storeId,
    endpoint: subJson.endpoint,
    p256dh: subJson.keys?.p256dh,
    auth: subJson.keys?.auth,
    vapid_public_key: activeVapidKey,
    vapid_private_key: '', // فارغ للاعتماد على المفتاح الخاص الثابت في الخادم
  }

  const { error } = await supabase.from('customer_push_subscriptions').insert(payload)

  if (error) throw new Error('فشل حفظ الاشتراك: ' + error.message + ' | ' + error.code)
  return subscription
}

/**
 * التحقق هل الزبون مشترك لهذا الطلب
 */
export async function isCustomerSubscribed(orderId) {
  try {
    const { count } = await supabase
      .from('customer_push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)
    return (count || 0) > 0
  } catch {
    return false
  }
}
