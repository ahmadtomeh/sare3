/**
 * بناء رسالة الواتساب المنسقة من سلة الطلبات
 */
export function buildWhatsAppMessage({ store, items, customer, total, discount, shipping, orderNumber }) {
  const currency = store?.currency || '₪'
  const storeName = store?.name || 'المتجر'

  const itemsText = items
    .map((item) => {
      const opts = Object.entries(item.selectedOptions || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ')
      const optStr = opts ? ` (${opts})` : ''
      return `• ${item.product.name}${optStr} × ${item.quantity} — ${(item.product.price * item.quantity).toFixed(0)} ${currency}`
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
    `━━━━━━━━━━━━━━━━━━━`,
    `🧾 تفاصيل الطلب:`,
    itemsText,
    `━━━━━━━━━━━━━━━━━━━`,
    discount ? `🏷️ الخصم (${discount.code}): -${discount.amount.toFixed(0)} ${currency}` : '',
    shipping ? `📦 التوصيل (${shipping.name}): +${shipping.cost.toFixed(0)} ${currency}` : '',
    `💰 الإجمالي النهائي: ${total.toFixed(0)} ${currency}`,
    customer.notes ? `📝 ملاحظات: ${customer.notes}` : '',
    orderNumber ? `🔖 رقم الطلب: #${orderNumber}` : '',
    `━━━━━━━━━━━━━━━━━━━`,
    `⏰ ${dateStr}`,
    ``,
    `✅ تم الإرسال عبر منصة سريع 🚀`,
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
