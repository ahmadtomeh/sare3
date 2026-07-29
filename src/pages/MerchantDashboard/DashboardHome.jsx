import { useEffect } from 'react'
import { TrendingUp, Package, ShoppingCart, Users, ArrowUpRight, Plus, Eye, ClipboardList, Zap, Clock, Copy } from 'lucide-react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { useOrdersStore } from '../../stores/useOrdersStore'
import { useProductsStore } from '../../stores/useProductsStore'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  new:              { label: 'جديد',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  preparing:        { label: 'قيد التجهيز',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  out_for_delivery: { label: 'في الطريق',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  done:             { label: 'تم التسليم',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cancelled:        { label: 'ملغي',          color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

export default function DashboardHome({ onNavigate }) {
  const { store } = useStoreConfig()
  const { orders, fetchOrders } = useOrdersStore()
  const { products } = useProductsStore()

  useEffect(() => {
    if (store?.id) fetchOrders(store.id)
  }, [store?.id])

  const stats = useOrdersStore.getState().getStats()
  const recentOrders = orders.slice(0, 5)

  // حساب إحصائيات إضافية حقيقية
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toDateString()

  const yesterdayOrders = orders.filter(o => new Date(o.created_at).toDateString() === yesterdayStr)
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)
  const todayRevenue = stats.todayRevenue

  const revenueTrend = yesterdayRevenue > 0
    ? `${todayRevenue >= yesterdayRevenue ? '+' : ''}${Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)}% عن أمس`
    : stats.todayRevenue > 0 ? 'مبيعات جديدة 🔥' : 'المبيعات تبدأ'
  const ordersTrend = yesterdayOrders.length > 0
    ? `${stats.todayOrders >= yesterdayOrders.length ? '+' : ''}${Math.round(((stats.todayOrders - yesterdayOrders.length) / yesterdayOrders.length) * 100)}% عن أمس`
    : stats.todayOrders > 0 ? 'طلبات جديدة ✨' : 'انتظر أول طلب'

  const avgOrderValue = orders.length > 0
    ? (stats.totalRevenue / orders.length).toFixed(0)
    : 0

  // أفضل المنتجات مبيعاً
  const productSales = {}
  orders.forEach(o => {
    try {
      const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]')
      items.forEach(item => {
        if (!item.isSpecial && item.name) {
          if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 }
          productSales[item.name].qty += (item.quantity || 1)
          productSales[item.name].revenue += (item.price || 0) * (item.quantity || 1)
        }
      })
    } catch {}
  })
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
  const maxQty = topProducts[0]?.[1]?.qty || 1

  // ── تجهيز بيانات الرسومات البيانية ──
  const salesData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return {
      dayLabel: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
      dateKey: d.toDateString(),
      revenue: 0,
      count: 0
    }
  }).reverse()

  orders.forEach(o => {
    const orderDate = new Date(o.created_at).toDateString()
    const match = salesData.find(s => s.dateKey === orderDate)
    if (match) {
      match.revenue += parseFloat(o.total) || 0
      match.count += 1
    }
  })

  const maxRev = Math.max(...salesData.map(d => d.revenue), 10)
  const svgW = 500
  const svgH = 200
  const padL = 50
  const padR = 20
  const padT = 20
  const padB = 30
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB

  const points = salesData.map((d, i) => {
    const x = padL + i * (plotW / 6)
    const y = svgH - padB - (d.revenue / maxRev) * plotH
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${svgH - padB} L ${points[0].x} ${svgH - padB} Z` : ''

  // توزيع الحالات
  const totalOrders = orders.length || 1
  const statusStats = Object.entries(STATUS_CONFIG).map(([key, config]) => {
    const count = orders.filter(o => o.status === key).length
    const pct = Math.round((count / totalOrders) * 100)
    return { key, count, pct, ...config }
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'صباح الخير'
    if (h < 17) return 'مساء الخير'
    return 'مساء النور'
  }

  const todayStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const handleShareStore = () => {
    const storeUrl = `${window.location.origin}/store/${store?.slug || 'demo'}`
    if (navigator.share) {
      navigator.share({
        title: store?.name || 'متجري على سريع',
        text: `تفضل بزيارة متجرنا واطلب عبر الواتساب مباشرة:`,
        url: storeUrl,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(storeUrl)
      toast.success('📋 تم نسخ رابط متجرك!')
    }
  }

  const handleCopyLink = () => {
    const storeUrl = `${window.location.origin}/store/${store?.slug || 'demo'}`
    navigator.clipboard.writeText(storeUrl).then(() => {
      toast.success(`📋 تم نسخ رابط المتجر: ${storeUrl}`, { duration: 3000 })
    }).catch(() => {
      toast.error('فشل النسخ — انسخ يدوياً: ' + storeUrl)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>

      {/* ── Welcome Header Banner ── */}
      <div className="glass dash-welcome-banner" style={{
        padding: 'var(--sp-lg)',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(16,185,129,0.08))',
        border: '1px solid var(--glass-border-glow)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-md)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h1 className="dash-welcome-title" style={{ fontSize: 'var(--text-xl)', fontWeight: 900 }}>
              {greeting()}{store?.name ? ` — ${store.name}` : ''} 👋
            </h1>
            <span className="badge badge-primary dash-welcome-badge">نشط 🟢</span>
          </div>
          <p className="dash-welcome-subtitle" style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)' }}>{todayStr} • ملخص نشاط متجرك اليوم</p>
        </div>

        <div className="dash-welcome-actions" style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('products')} id="dash-add-product" style={{ flex: 1 }}>
            <Plus size={16} />
            إضافة منتج
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleCopyLink} id="dash-copy-link" style={{ flex: 1 }} title="نسخ رابط المتجر">
            <Copy size={16} />
            نسخ الرابط
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleShareStore} id="dash-share-store" title="مشاركة المتجر">
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="dash-metrics-grid">
        <MetricCard
          icon="📦"
          bg="var(--clr-primary-glow)"
          clr="var(--clr-primary)"
          label="إجمالي الطلبات"
          value={stats.totalOrders}
          trend={stats.totalOrders > 0 ? `منذ البداية` : 'لا توجد بعد'}
          sparklinePath="M0,25 Q20,15 40,20 T80,5 T120,18 T160,2 T200,10"
        />

        <MetricCard
          icon="💰"
          bg="rgba(16,185,129,0.15)"
          clr="var(--clr-accent)"
          label="الإيرادات"
          value={`${stats.totalRevenue.toFixed(0)} ${store?.currency || '₪'}`}
          trend={revenueTrend}
          sparklinePath="M0,28 Q30,20 60,24 T120,10 T180,4 T200,2"
        />

        <MetricCard
          icon="🔐"
          bg="rgba(245,158,11,0.15)"
          clr="var(--clr-warning)"
          label="طلبات اليوم"
          value={stats.todayOrders}
          trend={ordersTrend}
          sparklinePath="M0,20 Q40,10 80,18 T140,5 T200,12"
        />

        <MetricCard
          icon="📈"
          bg="rgba(59,130,246,0.15)"
          clr="var(--clr-info)"
          label="متوسط قيمة الطلب"
          value={`${avgOrderValue} ${store?.currency || '₪'}`}
          trend={orders.length > 0 ? `من ${orders.length} طلب` : 'لا طلبات بعد'}
          sparklinePath="M0,15 Q50,22 100,12 T150,18 T200,8"
        />
      </div>

      {/* ── Charts Section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-md)' }}>
        {/* Sales Area Chart */}
        <div className="glass" style={{ padding: 'var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 'var(--text-sm)' }}>📈 منحنى المبيعات (آخر 7 أيام)</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>مجموع الإيرادات بالعملة المحلية للمتجر</p>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--clr-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--clr-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.5, 1].map((ratio) => {
                const y = padT + ratio * plotH
                const val = (maxRev * (1 - ratio)).toFixed(0)
                return (
                  <g key={ratio} style={{ opacity: 0.15 }}>
                    <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="var(--clr-text)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="var(--clr-text)">
                      {val}
                    </text>
                  </g>
                )
              })}

              {/* Area & Line */}
              {points.length > 0 && (
                <>
                  <path d={areaPath} fill="url(#chartGradient)" />
                  <path d={linePath} fill="none" stroke="var(--clr-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}

              {/* Circles & Labels */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="var(--clr-bg-surface)"
                    stroke="var(--clr-primary)"
                    strokeWidth="2"
                    style={{ transition: 'all 0.2s' }}
                  />
                  {p.revenue > 0 && (
                    <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--clr-accent)">
                      {p.revenue.toFixed(0)}
                    </text>
                  )}
                  {/* X Axis Labels */}
                  <text x={p.x} y={svgH - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--clr-text-3)">
                    {p.dayLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="glass" style={{ padding: 'var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 'var(--text-sm)' }}>📊 توزيع حالات الطلبات</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>حالة ومعالجة الطلبات المستلمة</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', height: '100%' }}>
            {statusStats.map((st) => (
              <div key={st.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color }} />
                    {st.label}
                  </span>
                  <span style={{ color: 'var(--clr-text-3)', fontWeight: 800 }}>
                    {st.count} طلب ({st.pct}%)
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--glass-bg-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--clr-border)' }}>
                  <div
                    style={{
                      height: '100%',
                      background: st.color,
                      width: `${st.pct}%`,
                      borderRadius: 'inherit',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trial Period Warning Banner ── */}
      {store?.subscription_status === 'trial' && (
        <div className="glass dash-trial-banner" style={{
          padding: 'var(--sp-md)',
          border: '1px solid var(--clr-warning)',
          background: 'rgba(245,158,11,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-md)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="trial-icon-box" style={{
              width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
            }}>
              🕐
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--clr-warning)', fontSize: 'var(--text-sm)' }}>
                فترة تجريبية مجانية (7 أيام)
              </div>
              <div className="trial-subtitle" style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-2)' }}>
                ترقية حسابك تضمن استمرار استقبال الطلبات دون انقطاع عبر الواتساب.
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('subscription')} id="trial-upgrade-btn" style={{ flexShrink: 0 }}>
            <Zap size={14} /> ترقية الاشتراك
          </button>
        </div>
      )}

      {/* ── Recent Orders Table ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontWeight: 800, fontSize: 'var(--text-lg)' }}>آخر الطلبات الواردة 📋</h2>
            {stats.newOrders > 0 && (
              <span className="badge badge-warning">{stats.newOrders} طلبات جديدة</span>
            )}
          </div>
          {orders.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('orders')} id="dash-view-orders-btn">
              عرض كل الطلبات →
            </button>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="glass" style={{ padding: 'var(--sp-3xl)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-md)' }}>
            <div style={{ fontSize: '4rem', opacity: 0.4 }}>📭</div>
            <div style={{ fontWeight: 800, color: 'var(--clr-text)', fontSize: 'var(--text-xl)' }}>لا توجد طلبات بعد</div>
            <div style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)', maxWidth: 400 }}>
              قم بنشر رابط متجرك أو طباعة رمز الـ QR لتتيح لزبائنك إرسال طلبياتهم فوراً
            </div>
            <button className="btn btn-primary" onClick={() => onNavigate('qr')} id="dash-share-qr-btn">
              🔗 الحصول على الرابط والـ QR
            </button>
          </div>
        ) : (
          <div className="glass" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ background: 'var(--glass-bg-2)', borderBottom: '1px solid var(--clr-border)' }}>
                    <th style={{ padding: '14px var(--sp-md)', textAlign: 'right', color: 'var(--clr-text-3)' }}># الطلب</th>
                    <th style={{ padding: '14px var(--sp-md)', textAlign: 'right', color: 'var(--clr-text-3)' }}>اسم العميل</th>
                    <th style={{ padding: '14px var(--sp-md)', textAlign: 'right', color: 'var(--clr-text-3)' }}>المبلغ الكلي</th>
                    <th style={{ padding: '14px var(--sp-md)', textAlign: 'right', color: 'var(--clr-text-3)' }}>الحالة الحالية</th>
                    <th style={{ padding: '14px var(--sp-md)', textAlign: 'right', color: 'var(--clr-text-3)' }}>التوقيت</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.new
                    return (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--clr-border)', transition: 'background var(--tr-fast)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px var(--sp-md)', fontWeight: 800, color: 'var(--clr-primary)' }}>
                          #{order.order_number}
                        </td>
                        <td style={{ padding: '14px var(--sp-md)', fontWeight: 700 }}>
                          {order.customer_name}
                        </td>
                        <td style={{ padding: '14px var(--sp-md)', fontWeight: 900, color: 'var(--clr-accent)' }}>
                          {parseFloat(order.total).toFixed(0)} {store?.currency || '₪'}
                        </td>
                        <td style={{ padding: '14px var(--sp-md)' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 12px', borderRadius: 'var(--radius-full)',
                            fontSize: 11, fontWeight: 700,
                            background: sc.bg, color: sc.color,
                            border: `1px solid ${sc.color}40`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color }} />
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px var(--sp-md)', color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)' }}>
                          {formatTime(order.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── أفضل المنتجات مبيعاً ── */}
      {topProducts.length > 0 && (
        <div className="glass" style={{ padding: 'var(--sp-md)' }}>
          <h3 style={{ fontWeight: 800, fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-md)' }}>🏆 أفضل المنتجات مبيعاً</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topProducts.map(([name, data], i) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{name}</span>
                  </span>
                  <span style={{ color: 'var(--clr-text-3)', fontWeight: 700, flexShrink: 0 }}>
                    {data.qty} وحدة • {data.revenue.toFixed(0)} {store?.currency || '₪'}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--glass-bg-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(data.qty / maxQty) * 100}%`,
                    background: i === 0 ? 'linear-gradient(90deg, var(--clr-accent), #34d399)' : 'var(--clr-primary)',
                    borderRadius: 'inherit',
                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    opacity: Math.max(0.4, 1 - i * 0.12),
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function MetricCard({ icon, bg, clr, label, value, trend, sparklinePath }) {
  return (
    <div className="glass glass-interactive metric-card-box" style={{ padding: 'var(--sp-md)', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="metric-icon-box" style={{ width: 38, height: 38, borderRadius: 12, background: bg, color: clr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          {icon}
        </div>
        <span className="metric-trend-badge" style={{ fontSize: 10, fontWeight: 700, color: 'var(--clr-accent)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArrowUpRight size={12} /> {trend}
        </span>
      </div>

      <div>
        <div className="metric-value-text" style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--clr-text)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div className="metric-label-text" style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginTop: 2 }}>
          {label}
        </div>
      </div>

      {/* Mini SVG Trend Line Background */}
      <svg className="metric-sparkline-svg" viewBox="0 0 200 30" preserveAspectRatio="none" style={{ width: '100%', height: 20, opacity: 0.2, marginTop: 2, overflow: 'hidden', display: 'block' }}>
        <path d={sparklinePath} fill="none" stroke={clr} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d
  if (diff < 60000) return 'الآن'
  if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`
  if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
}
