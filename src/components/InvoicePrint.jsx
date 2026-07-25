import React from 'react'
import { Printer, X } from 'lucide-react'

export default function InvoicePrint({ order, store, onClose }) {
  if (!order || !store) return null

  const handlePrint = () => {
    window.print()
  }

  const currency = store.currency || '₪'
  const items = Array.isArray(order.items) ? order.items : []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(9, 10, 18, 0.95)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, direction: 'rtl',
    }} className="no-print-overlay">
      
      {/* Invoice Box */}
      <div style={{
        maxWidth: 580, width: '100%',
        background: '#fff', color: '#111827',
        borderRadius: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90dvh', overflow: 'hidden',
      }} className="print-invoice-container">
        
        {/* Actions bar (hidden in print) */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
        }} className="no-print">
          <span style={{ fontWeight: 800, fontSize: 14, color: '#374151' }}>📄 فاتورة طلب رقم #{order.order_number || order.id.slice(-6)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} style={{ padding: '6px 14px', fontSize: 12, minHeight: 32, gap: 6 }}>
              <Printer size={14} /> طباعة
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px 12px', fontSize: 12, minHeight: 32, border: '1px solid #d1d5db' }}>
              <X size={14} /> إغلاق
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div style={{ padding: 32, overflowY: 'auto', flex: 1 }} id="printable-invoice-body">
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
              {items.map((item, idx) => {
                const price = parseFloat(item.price) || 0
                const qty = parseInt(item.qty || item.quantity) || 1
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 8, color: '#111827' }}>
                      {item.name || item.product?.name}
                      {item.option && <span style={{ color: '#6b7280', fontSize: 10 }}> ({item.option})</span>}
                    </td>
                    <td style={{ textAlign: 'center', padding: 8, color: '#4b5563' }}>{qty}</td>
                    <td style={{ textAlign: 'left', padding: 8, color: '#4b5563' }}>{price.toFixed(0)} {currency}</td>
                    <td style={{ textAlign: 'left', padding: 8, fontWeight: 700, color: '#111827' }}>{(price * qty).toFixed(0)} {currency}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', fontSize: 12, color: '#4b5563', paddingRight: '60%', textAlign: 'left', marginTop: 16 }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb', paddingTop: 8 }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>المجموع النهائي:</span>
              <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--clr-primary, #7c3aed)' }}>{parseFloat(order.total).toFixed(0)} {currency}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
            شكرًا لتسوقكم معنا! نتطلع لخدمتكم دائمًا 💖
          </div>
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
            width: 100%;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .no-print-overlay {
            background: none !important;
            backdrop-filter: none !important;
          }
        }
      `}</style>
    </div>
  )
}
