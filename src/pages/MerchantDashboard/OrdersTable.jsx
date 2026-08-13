import { useState, useEffect } from 'react'
import { Download, MessageSquare, RefreshCw, Printer } from 'lucide-react'
import { useOrdersStore } from '../../stores/useOrdersStore'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { exportOrdersToExcel } from '../../utils/export'
import { buildStatusUpdateMessage, buildWhatsAppUrl } from '../../utils/whatsapp'
import InvoicePrint from '../../components/InvoicePrint'
import toast from 'react-hot-toast'

const formatPrice = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
}

const STATUSES = [
  { value: 'all',              label: 'الكل',              emoji: '📋' },
  { value: 'new',              label: 'جديد',              emoji: '🟡' },
  { value: 'preparing',        label: 'قيد التجهيز',       emoji: '🔵' },
  { value: 'out_for_delivery', label: 'خرج للتوصيل',       emoji: '🚚' },
  { value: 'done',             label: 'تم التسليم',        emoji: '✅' },
  { value: 'cancelled',        label: 'ملغي',              emoji: '❌' },
]

const STATUS_NEXT = {
  new:              { label: 'بدء التجهيز 🔵',      next: 'preparing' },
  preparing:        { label: 'خرج للتوصيل 🚚',      next: 'out_for_delivery' },
  out_for_delivery: { label: 'تم التسليم ✅',        next: 'done' },
  done:             null,
  cancelled:        null,
}

export default function OrdersTable() {
  const { orders, fetchOrders, updateStatus } = useOrdersStore()
  const { store } = useStoreConfig()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [printingOrder, setPrintingOrder] = useState(null)

  useEffect(() => {
    if (store?.id) fetchOrders(store.id)
  }, [store?.id])

  const filtered = orders.filter((o) => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search || o.customer_name?.includes(search) || String(o.order_number)?.includes(search)
    return matchStatus && matchSearch
  })

  const handleStatusUpdate = async (order, newStatus) => {
    setUpdating(order.id)
    try {
      await updateStatus(order.id, newStatus)
      toast.success(`تم تحديث حالة الطلب #${order.order_number}`)
    } finally {
      setUpdating(null)
    }
  }

  const handleNotifyCustomer = (order, status) => {
    const msg = buildStatusUpdateMessage({
      storeName: store?.name,
      orderNumber: order.order_number,
      status,
      currency: store?.currency || '₪',
      total: order.total,
    })
    const url = buildWhatsAppUrl(order.customer_phone, msg)
    window.open(url, '_blank')
  }

  const newOrdersCount = orders.filter(o => o.status === 'new').length
  const doneOrdersCount = orders.filter(o => o.status === 'done').length
  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)
  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
  const todayRevenue = todayOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">سجل الطلبات 📋</h1>
          <p className="page-subtitle">{orders.length} طلب • {totalRevenue.toFixed(0)} {store?.currency || '₪'} إجمالي</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => store?.id && fetchOrders(store.id)} id="refresh-orders-btn">
            <RefreshCw size={16} />
            تحديث
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => exportOrdersToExcel(orders, store?.name)}
            disabled={orders.length === 0}
            id="export-orders-btn"
          >
            <Download size={16} />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Stats Mini */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--sp-md)' }}>
        {[
          { label: 'اليوم', value: todayOrders.length, sub: `${todayRevenue.toFixed(0)} ${store?.currency || '₪'}`, color: 'var(--clr-primary)' },
          { label: 'جديد', value: newOrdersCount, sub: 'بحاجة للمعالجة', color: 'var(--clr-warning)' },
          { label: 'مكتمل', value: doneOrdersCount, sub: 'تم التسليم', color: 'var(--clr-success)' },
        ].map((s) => (
          <div key={s.label} className="glass" style={{ padding: 'var(--sp-md)' }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{s.label}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--sp-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-bar-icon">🔍</span>
          <input className="input" placeholder="بحث باسم العميل أو رقم الطلب..." value={search} onChange={e => setSearch(e.target.value)} id="orders-search" />
        </div>
        <div className="category-chips">
          {STATUSES.map((s) => (
            <button key={s.value} className={`category-chip ${filter === s.value ? 'active' : ''}`} onClick={() => setFilter(s.value)}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
        {filtered.length === 0 ? (
          <div className="glass empty-state" style={{ padding: 40 }}>
            <div style={{ fontSize: '2.5rem' }}>📋</div>
            <div className="empty-state-title">لا توجد طلبات تطابق الفلتر</div>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={store?.currency || '₪'}
              isExpanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onStatusUpdate={handleStatusUpdate}
              onNotify={handleNotifyCustomer}
              onPrint={(ord) => setPrintingOrder(ord)}
              updating={updating === order.id}
            />
          ))
        )}
      </div>

      {/* Invoice Printing Overlay */}
      {printingOrder && (
        <InvoicePrint
          order={printingOrder}
          store={store}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  )
}

function OrderCard({ order, currency, isExpanded, onToggle, onStatusUpdate, onNotify, onPrint, updating }) {
  const sc = STATUS_STYLES[order.status] || STATUS_STYLES.new
  const nextAction = STATUS_NEXT[order.status]

  return (
    <div className="glass" style={{ overflow: 'hidden' }}>
      {/* Card Header — always visible */}
      <div
        onClick={onToggle}
        style={{ padding: 'var(--sp-md)', cursor: 'pointer', display: 'flex', gap: 'var(--sp-md)', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, display: 'flex', gap: 'var(--sp-md)', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: 'var(--clr-primary)', fontSize: 'var(--text-lg)', flexShrink: 0 }}>
            #{order.order_number}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--clr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.customer_name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
              {formatTime(order.created_at)} • {order.items?.length || 0} منتجات
            </div>
          </div>
          <div style={{ fontWeight: 800, color: 'var(--clr-accent)', flexShrink: 0 }}>
            {formatPrice(order.total)} {currency}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
          <span
            className="status-badge"
            style={{ '--s-clr': sc.color, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
            {sc.label}
          </span>
          <span style={{ color: 'var(--clr-text-3)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--clr-border)', padding: 'var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
          {/* Customer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-sm)' }}>
            {[
              { icon: '📞', label: 'الهاتف', value: order.customer_phone },
              { icon: '📍', label: 'العنوان', value: order.customer_address },
              { icon: '📝', label: 'ملاحظات', value: order.notes },
            ].filter(f => f.value).map((f) => (
              <div key={f.label} style={{ background: 'var(--glass-bg-2)', padding: 'var(--sp-sm)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 2 }}>{f.icon} {f.label}</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 8 }}>🧾 الطلبيات:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(order.items || []).map((item, i) => {
                const opts = typeof item.selectedOptions === 'string'
                  ? item.selectedOptions
                  : (item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(' | ') : '')
                return (
                  <div key={i} style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center', padding: '6px 10px', background: 'var(--glass-bg-2)', borderRadius: 8 }}>
                    <div style={{ flex: 1, fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontWeight: 600 }}>{item.product?.name || 'منتج'}</span>
                      {opts && <span style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)' }}> — {opts}</span>}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>×{item.quantity}</div>
                    <div style={{ fontWeight: 700, color: 'var(--clr-primary)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                      {formatPrice((item.product?.price || 0) * item.quantity)} {currency}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            {nextAction && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onStatusUpdate(order, nextAction.next)}
                disabled={updating}
                id={`advance-status-${order.id}`}
              >
                {updating ? '⏳' : nextAction.label}
              </button>
            )}
            {order.customer_phone && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onNotify(order, order.status)}
                id={`notify-customer-${order.id}`}
              >
                <MessageSquare size={14} />
                إشعار الزبون عبر الواتساب
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onPrint(order)}
              style={{ border: '1px solid var(--clr-border)' }}
              id={`print-invoice-${order.id}`}
            >
              <Printer size={14} />
              طباعة الفاتورة
            </button>
            {order.status !== 'cancelled' && order.status !== 'done' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--clr-danger)' }}
                onClick={() => onStatusUpdate(order, 'cancelled')}
                id={`cancel-order-${order.id}`}
              >
                ❌ إلغاء الطلب
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_STYLES = {
  new:              { label: 'جديد',          color: '#F59E0B', bg: 'hsla(42,95%,60%,0.12)',  border: 'hsla(42,95%,60%,0.3)' },
  preparing:        { label: 'قيد التجهيز',   color: '#3B82F6', bg: 'hsla(210,80%,60%,0.12)', border: 'hsla(210,80%,60%,0.3)' },
  out_for_delivery: { label: 'في الطريق',     color: '#6366F1', bg: 'hsla(245,80%,65%,0.12)', border: 'hsla(245,80%,65%,0.3)' },
  done:             { label: 'تم التسليم',    color: '#10B981', bg: 'hsla(142,72%,50%,0.12)', border: 'hsla(142,72%,50%,0.3)' },
  cancelled:        { label: 'ملغي',          color: '#EF4444', bg: 'hsla(0,80%,62%,0.12)',   border: 'hsla(0,80%,62%,0.3)' },
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'الآن'
  if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`
  if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}


