import * as XLSX from 'xlsx'

/**
 * تصدير الطلبات كملف Excel
 */
export function exportOrdersToExcel(orders, storeName = 'المتجر') {
  const rows = orders.flatMap((order) => {
    const base = {
      'رقم الطلب': `#${order.order_number}`,
      'العميل': order.customer_name,
      'الهاتف': order.customer_phone || '',
      'العنوان': order.customer_address || '',
      'الإجمالي': order.total,
      'الحالة': statusLabel(order.status),
      'التاريخ': new Date(order.created_at).toLocaleString('ar-EG'),
      'ملاحظات': order.notes || '',
    }
    if (!order.items?.length) return [base]
    return order.items.map((item, i) => ({
      ...base,
      'المنتج': item.product?.name || '',
      'الكمية': item.quantity,
      'سعر المنتج': item.product?.price || 0,
      ...(i > 0 ? { 'رقم الطلب': '', 'العميل': '', 'الهاتف': '', 'الإجمالي': '' } : {}),
    }))
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'الطلبات')

  // Set RTL
  ws['!dir'] = 'rtl'

  const fileName = `طلبات-${storeName}-${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * تصدير المنتجات كـ JSON
 */
export function exportStoreData(store, categories, products) {
  const data = { store, categories, products, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.name || 'store'}-backup.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * استيراد بيانات المتجر من JSON
 */
export function importStoreData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch {
        reject(new Error('ملف غير صالح'))
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function statusLabel(status) {
  const map = {
    new: 'جديد', preparing: 'قيد التجهيز',
    out_for_delivery: 'خرج للتوصيل', done: 'تم التسليم', cancelled: 'ملغي',
  }
  return map[status] || status
}

/**
 * توليد كود ترخيص فريد
 */
export function generateLicenseKey(plan = 'monthly') {
  const prefix = plan === 'yearly' ? 'SARE-Y' : 'SARE-M'
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${seg(4)}-${seg(4)}-${seg(4)}`
}
