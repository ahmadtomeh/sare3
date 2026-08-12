import React, { useState } from 'react'
import { Printer, X } from 'lucide-react'

const formatPrice = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
}

export default function InvoicePrint({ order, store, onClose }) {
  if (!order || !store) return null

  const [isThermalMode, setIsThermalMode] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  const currency = store.currency || '₪'
  const allItems = Array.isArray(order.items) ? order.items : []

  // تصفية المنتجات العادية لاستبعاد البنود الخاصة بالشحن والخصم من قائمة العناصر الأساسية
  const productItems = allItems.filter(item => {
    const isSpecial = item.isSpecial || item.product?.id === 'discount' || item.product?.id === 'shipping'
    return !isSpecial
  })

  // استخراج تفاصيل الخصم وتفاصيل التوصيل
  const discountItem = allItems.find(item => item.product?.id === 'discount' || (item.isSpecial && item.name?.includes('خصم')))
  const shippingItem = allItems.find(item => item.product?.id === 'shipping' || (item.isSpecial && item.name?.includes('توصيل')))

  let discountVal = 0
  let discountName = ''
  if (discountItem) {
    const price = parseFloat(discountItem.price) || parseFloat(discountItem.product?.price) || 0
    discountVal = Math.abs(price)
    discountName = discountItem.name || discountItem.product?.name || 'خصم كوبون'
  }

  let shippingVal = 0
  let shippingName = ''
  if (shippingItem) {
    shippingVal = parseFloat(shippingItem.price) || parseFloat(shippingItem.product?.price) || 0
    shippingName = shippingItem.name || shippingItem.product?.name || 'رسوم التوصيل'
  }

  const subtotal = productItems.reduce((acc, item) => {
    const price = parseFloat(item.price) || parseFloat(item.product?.price) || 0
    const qty = parseInt(item.qty || item.quantity) || 1
    return acc + (price * qty)
  }, 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(9, 10, 18, 0.95)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, direction: 'rtl',
    }} className="no-print-overlay">
      
      {/* Invoice Box */}
      <div style={{
        maxWidth: isThermalMode ? 360 : 580, width: '100%',
        background: '#fff', color: '#111827',
        borderRadius: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90dvh', overflow: 'hidden',
        transition: 'all 0.3s ease',
      }} className="print-invoice-container">
        
        {/* Actions bar (hidden in print) */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
          gap: 12,
        }} className="no-print">
          <span style={{ fontWeight: 800, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📄 طلب #{order.order_number || order.id.slice(-6)}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Toggle print template */}
            <div style={{ display: 'flex', background: '#e5e7eb', borderRadius: 8, padding: 2 }}>
              <button
                type="button"
                onClick={() => setIsThermalMode(false)}
                style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none',
                  cursor: 'pointer', background: !isThermalMode ? '#fff' : 'transparent',
                  color: !isThermalMode ? '#111827' : '#6b7280', transition: 'all 0.2s'
                }}
              >
                قياسي A4
              </button>
              <button
                type="button"
                onClick={() => setIsThermalMode(true)}
                style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none',
                  cursor: 'pointer', background: isThermalMode ? '#fff' : 'transparent',
                  color: isThermalMode ? '#111827' : '#6b7280', transition: 'all 0.2s'
                }}
              >
                حراري (80mm) 🖨️
              </button>
            </div>

            <button className="btn btn-primary btn-sm" onClick={handlePrint} style={{ padding: '6px 14px', fontSize: 12, minHeight: 32, gap: 6 }}>
              <Printer size={14} /> طباعة
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 12px', fontSize: 12, minHeight: 32, border: '1px solid #d1d5db' }}>
              <X size={14} /> إغلاق
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div style={{
          padding: isThermalMode ? '24px 16px' : 32,
          overflowY: 'auto',
          flex: 1,
          fontFamily: isThermalMode ? 'monospace, sans-serif' : 'system-ui, sans-serif',
          color: '#111827'
        }} id="printable-invoice-body">
          {isThermalMode ? (
            /* ── Thermal Receipt Layout (80mm) ── */
            <div style={{ width: '100%', maxWidth: '280px', margin: '0 auto', fontSize: 12, color: '#000' }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#000', margin: '0 0 4px 0' }}>{store.name}</h2>
                {store.description && <p style={{ fontSize: 11, margin: '0 0 6px 0', opacity: 0.8 }}>{store.description}</p>}
                <div style={{ fontSize: 10 }}>هاتف: {store.country_code} {store.whatsapp}</div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Order Info */}
              <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                <div><strong>رقم الطلب:</strong> #{order.order_number || order.id.slice(-6)}</div>
                <div><strong>التاريخ:</strong> {new Date(order.created_at || order.date).toLocaleDateString('ar-EG')}</div>
                <div><strong>الزبون:</strong> {order.customer_name || order.customer?.name}</div>
                {(order.customer_phone || order.customer?.phone) && <div><strong>الهاتف:</strong> {order.customer_phone || order.customer?.phone}</div>}
                {(order.customer_address || order.customer?.address) && <div><strong>العنوان:</strong> {order.customer_address || order.customer?.address}</div>}
                {order.notes && <div><strong>ملاحظات:</strong> {order.notes}</div>}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

              {/* Products List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {productItems.map((item, idx) => {
                  const price = parseFloat(item.price) || parseFloat(item.product?.price) || 0
                  const qty = parseInt(item.qty || item.quantity) || 1
                  const name = item.name || item.product?.name
                  const option = item.option || (item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : '')
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', fontSize: 11 }}>
                      <div style={{ fontWeight: 700 }}>{name} {option && `(${option})`}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
                        <span>{qty} × {formatPrice(price)} {currency}</span>
                        <span style={{ fontWeight: 800 }}>{formatPrice(price * qty)} {currency}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }} />

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  <span>المجموع الفرعي:</span>
                  <span>{formatPrice(subtotal)} {currency}</span>
                </div>
                {discountVal > 0 && (
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                    <span>{discountName}:</span>
                    <span>-{formatPrice(discountVal)} {currency}</span>
                  </div>
                )}
                {shippingVal > 0 && (
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                    <span>{shippingName}:</span>
                    <span>+{formatPrice(shippingVal)} {currency}</span>
                  </div>
                )}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '1px dotted #000', paddingTop: 6, fontWeight: 900, fontSize: 13 }}>
                  <span>المجموع النهائي:</span>
                  <span>{formatPrice(order.total)} {currency}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '12px 0' }} />

              {/* QR Code and footer */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(`${window.location.origin}/${store.slug}?track=${order.order_number || order.id.slice(-6)}`)}`}
                  alt="Order QR Code"
                  style={{ width: 90, height: 90, display: 'block' }}
                />
                <span style={{ fontSize: 9, opacity: 0.7 }}>تتبع طلبك عبر مسح الـ QR 📱</span>
                <span style={{ fontSize: 10, fontWeight: 700, marginTop: 6 }}>شكرًا لتسوقكم معنا! 💖</span>
              </div>
            </div>
          ) : (
            /* ── Standard A4/A5 Invoice Layout ── */
            <>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: '0 0 4px 0' }}>{store.name}</h1>
                {store.description && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px 0' }}>{store.description}</p>}
                <div style={{ fontSize: 11, color: '#9ca3af' }}>هاتف المتجر: {store.country_code} {store.whatsapp}</div>
              </div>

              <hr style={{ border: 'none', borderTop: '2px dashed #e5e7eb', margin: '16px 0' }} />

              {/* Customer / Order Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12, color: '#4b5563', marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>بيانات العميل:</div>
                  <div>الاسم: {order.customer_name || order.customer?.name}</div>
                  {(order.customer_phone || order.customer?.phone) && <div>الهاتف: {order.customer_phone || order.customer?.phone}</div>}
                  {(order.customer_address || order.customer?.address) && <div>العنوان: {order.customer_address || order.customer?.address}</div>}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>معلومات الفاتورة:</div>
                  <div>رقم الطلب: #{order.order_number || order.id.slice(-6)}</div>
                  <div>التاريخ: {new Date(order.created_at || order.date).toLocaleDateString('ar-EG')}</div>
                  <div>الحالة: {order.status === 'new' ? 'جديد' : 'نشط'}</div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, margin: '20px 0' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'right', padding: 8, fontWeight: 700, color: '#374151' }}>المنتج</th>
                    <th style={{ textAlign: 'center', padding: 8, fontWeight: 700, color: '#374151', width: 60 }}>الكمية</th>
                    <th style={{ textAlign: 'left', padding: 8, fontWeight: 700, color: '#374151', width: 100 }}>السعر</th>
                    <th style={{ textAlign: 'left', padding: 8, fontWeight: 700, color: '#374151', width: 100 }}>المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {productItems.map((item, idx) => {
                    const price = parseFloat(item.price) || parseFloat(item.product?.price) || 0
                    const qty = parseInt(item.qty || item.quantity) || 1
                    const name = item.name || item.product?.name
                    const option = item.option || (item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : '')
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: 8, color: '#111827' }}>
                          {name}
                          {option && <span style={{ color: '#6b7280', fontSize: 10 }}> ({option})</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: 8, color: '#4b5563' }}>{qty}</td>
                        <td style={{ textAlign: 'left', padding: 8, color: '#4b5563' }}>{formatPrice(price)} {currency}</td>
                        <td style={{ textAlign: 'left', padding: 8, fontWeight: 700, color: '#111827' }}>{formatPrice(price * qty)} {currency}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', fontSize: 12, color: '#4b5563', paddingRight: '50%', textAlign: 'left', marginTop: 16 }}>
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb', paddingTop: 8 }}>
                  <span>المجموع الفرعي:</span>
                  <span>{formatPrice(subtotal)} {currency}</span>
                </div>
                {discountVal > 0 && (
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', color: '#8b5cf6' }}>
                    <span>{discountName}:</span>
                    <span>-{formatPrice(discountVal)} {currency}</span>
                  </div>
                )}
                {shippingVal > 0 && (
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                    <span>{shippingName}:</span>
                    <span>+{formatPrice(shippingVal)} {currency}</span>
                  </div>
                )}
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '1px dashed #e5e7eb', paddingTop: 6, marginTop: 4 }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>المجموع النهائي:</span>
                  <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--clr-primary, #7c3aed)' }}>{formatPrice(order.total)} {currency}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
                شكرًا لتسوقكم معنا! نتطلع لخدمتكم دائمًا 💖
              </div>
            </>
          )}
        </div>

      </div>

      {/* Global CSS style block for printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-invoice-container, .print-invoice-container * {
            visibility: visible;
          }
          .print-invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: ${isThermalMode ? '80mm' : '100%'} !important;
            max-width: ${isThermalMode ? '80mm' : '100%'} !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
          .no-print-overlay {
            background: none !important;
            backdrop-filter: none !important;
          }
          @page {
            size: ${isThermalMode ? '80mm auto' : 'auto'};
            margin: 0;
          }
        }
      `}</style>
    </div>
  )
}
