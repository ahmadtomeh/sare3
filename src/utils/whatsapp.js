const formatPrice = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
}

export function buildWhatsAppMessage({ store, items, customer, total, discount, shipping, orderNumber }) {
  const currency = store?.currency || '₪'
  const storeName = store?.name || 'المتجر'

  const itemsText = items
    .map((item) => {
      const opts = Object.entries(item.selectedOptions || {})
        .map(([k, v]) => `${k}: ${v.name || v}${v.price > 0 ? ` (+${v.price} ${currency})` : ''}`)
        .join(' | ')
      const optStr = opts ? ` (${opts})` : ''
      const optionExtra = Object.values(item.selectedOptions || {}).reduce((s, opt) => s + Number(opt.price || 0), 0)
      const itemPrice = Number(item.product.price) + optionExtra
      return `• ${item.product.name}${optStr} × ${item.quantity} — ${formatPrice(itemPrice * item.quantity)} ${currency}`
    })
    .join('\n')

  const now = new Date()
  const dateStr = now.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const msg = [
    `🛍️ طلب جديد من متجر ${storeName}`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👤 العميل: ${customer.name}`,
    customer.phone ? `📞 الهاتف: ${customer.phone}` : '',
    customer.address ? `📍 العنوان: ${customer.address}` : '',
    customer.maps_link ? `🗺️ موقع الخريطة (GPS):\n${customer.maps_link}` : '',
    `━━━━━━━━━━━━━━━━━━━`,
    `🧾 تفاصيل الطلب:`,
    itemsText,
    `━━━━━━━━━━━━━━━━━━━`,
    discount ? `🏷️ الخصم (${discount.code}): -${formatPrice(discount.amount)} ${currency}` : '',
    shipping ? `📦 التوصيل (${shipping.name}): +${formatPrice(shipping.cost)} ${currency}` : '',
    `💰 الإجمالي النهائي: ${formatPrice(total)} ${currency}`,
    customer.notes ? `📝 ملاحظات: ${customer.notes}` : '',
    orderNumber ? `🔖 رقم الطلب: #${orderNumber}` : '',
    `━━━━━━━━━━━━━━━━━━━`,
    `⏰ ${dateStr}`,
    ``,
    `✅ تم الإرسال عبر منصة فوري 🚀`,
  ]
    .filter(Boolean)
    .join('\n')

  return msg
}

export function buildWhatsAppUrl(whatsapp, message) {
  const phone = whatsapp.replace(/[^0-9]/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encoded}`
}

/**
 * إرسال تحديث حالة الطلب للزبون عبر الواتساب
 */
export function buildStatusUpdateMessage({ storeName, orderNumber, status, currency, total }) {
  const statusLabels = {
    new: '🟡 تم استلام طلبك وقيد المراجعة',
    preparing: '🔵 طلبك قيد التجهيز الآن',
    out_for_delivery: '🚚 طلبك في الطريق إليك!',
    done: '✅ تم تسليم طلبك بنجاح',
    cancelled: '❌ تم إلغاء طلبك',
  }
  return [
    `🔔 تحديث طلبك من ${storeName}`,
    `━━━━━━━━━━━━━━━━`,
    `🔖 رقم الطلب: #${orderNumber}`,
    `📦 الحالة: ${statusLabels[status] || status}`,
    total ? `💰 الإجمالي: ${total} ${currency}` : '',
    `━━━━━━━━━━━━━━━━`,
    `شكراً لتسوقك معنا! 🙏`,
  ].filter(Boolean).join('\n')
}

/**
 * توليد رابط خرائط جوجل دقيق ونظيف من العنوان أو الرابط أو الإحداثيات
 */
export function getGoogleMapsUrl(address, mapsLink) {
  if (mapsLink && typeof mapsLink === 'string' && mapsLink.startsWith('http')) {
    return mapsLink
  }

  if (!address || typeof address !== 'string') return ''

  // 1. إذا كان العنوان يحتوي أصلاً على رابط URL
  const urlMatch = address.match(/https?:\/\/[^\s]+/)
  if (urlMatch) return urlMatch[0]

  // 2. إذا كان العنوان يحتوي على إحداثيات (خط العرض وخط الطول)
  const coordMatch = address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
  if (coordMatch) {
    return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`
  }

  // 3. تنظيف العنوان من الرموز التعبيرية
  const clean = address.replace(/[📍📌🗺️]/g, '').trim()
  if (!clean) return ''
  
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`
}
