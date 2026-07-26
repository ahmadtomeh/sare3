import { useState, useMemo } from 'react'
import { useOrdersStore } from '../../stores/useOrdersStore'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { Users, Phone, ShoppingBag, DollarSign, Calendar, MessageCircle, Search } from 'lucide-react'

export default function CustomersCRM() {
  const { orders } = useOrdersStore()
  const { store } = useStoreConfig()
  const [search, setSearch] = useState('')

  // Aggregate customer details from all orders
  const customers = useMemo(() => {
    if (!orders || orders.length === 0) return []

    const customerMap = {}

    orders.forEach((order) => {
      // Normalize phone number or name to aggregate
      const phoneKey = order.customer_phone?.trim() || ''
      const nameKey = order.customer_name?.trim() || 'زبون مجهول'
      const aggKey = phoneKey ? phoneKey : nameKey

      // Total items quantity
      let itemsCount = 0
      try {
        const parsedItems = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]')
        parsedItems.forEach(i => {
          if (!i.isSpecial) {
            itemsCount += (i.quantity || 1)
          }
        })
      } catch (e) {
        itemsCount = 1
      }

      if (!customerMap[aggKey]) {
        customerMap[aggKey] = {
          name: nameKey,
          phone: phoneKey,
          address: order.customer_address || 'لم يحدد',
          ordersCount: 1,
          totalSpent: parseFloat(order.total || 0),
          lastOrderDate: order.created_at || order.date || new Date().toISOString(),
        }
      } else {
        customerMap[aggKey].ordersCount += 1
        customerMap[aggKey].totalSpent += parseFloat(order.total || 0)
        
        // Compare dates
        const currentLastDate = new Date(customerMap[aggKey].lastOrderDate)
        const orderDate = new Date(order.created_at || order.date)
        if (orderDate > currentLastDate) {
          customerMap[aggKey].lastOrderDate = order.created_at || order.date
          if (order.customer_address) {
            customerMap[aggKey].address = order.customer_address
          }
        }
      }
    })

    // Return as array sorted by total spent desc
    return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase())
    )
  }, [customers, search])

  const handleWhatsAppChat = (phone) => {
    if (!phone) return
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    // Add default country code if not present (e.g. 0599 -> 970599)
    let formattedPhone = cleanPhone
    if (formattedPhone.startsWith('05')) {
      const code = store?.country_code?.replace('+', '') || '970'
      formattedPhone = code + formattedPhone.substring(1)
    }
    window.open(`https://wa.me/${formattedPhone}`, '_blank')
  }

  const currency = store?.currency || '₪'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 'var(--text-2xl)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={28} style={{ color: 'var(--clr-primary)' }} />
            سجل الزبائن وعملائك 👥
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', marginTop: 4 }}>
            عرض وإدارة العملاء الذين قاموا بالشراء من متجرك مسبقاً وتفاصيل إنفاقهم.
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-md)' }}>
        <div className="glass" style={{ padding: 'var(--sp-md) var(--sp-lg)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>إجمالي عدد الزبائن</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, marginTop: 4 }}>{customers.length} 👤</div>
        </div>
        <div className="glass" style={{ padding: 'var(--sp-md) var(--sp-lg)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>متوسط الإنفاق للزبون</span>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, marginTop: 4, color: 'var(--clr-accent)' }}>
            {customers.length > 0 ? (customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length).toFixed(0) : 0} {currency}
          </div>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="glass" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
        <Search size={18} style={{ color: 'var(--clr-text-3)', marginRight: 4 }} />
        <input
          className="input"
          style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: 13, minHeight: 'auto', boxShadow: 'none' }}
          placeholder="ابحث باسم الزبون، هاتفه، أو عنوانه..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Customers List / Table */}
      <div className="glass" style={{ overflowX: 'auto', borderRadius: 'var(--radius-xl)', padding: 'var(--sp-md)' }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--clr-text-muted)' }}>
            <Users size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontWeight: 700 }}>لم نجد أي زبائن مسجلين</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>ستظهر بيانات الزبائن هنا تلقائياً بعد تلقي أول طلب.</div>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--clr-border)' }}>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)' }}>الزبون</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)' }}>رقم الهاتف</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)' }}>العنوان الأخير</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)', textAlign: 'center' }}>الطلبات</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)' }}>إجمالي الإنفاق</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)' }}>آخر طلب</th>
                <th style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-3)', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((cust, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--clr-border)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '12px 8px', fontWeight: 700, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--glass-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                      }}>
                        👤
                      </div>
                      {cust.name}
                    </div>
                  </td>
                  <td style={{ padding: 12, fontSize: 12, direction: 'ltr', textAlign: 'right' }}>
                    {cust.phone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} style={{ opacity: 0.5 }} /> {cust.phone}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--clr-text-muted)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 12, fontSize: 12, color: 'var(--clr-text-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cust.address}
                  </td>
                  <td style={{ padding: 12, fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                    <span style={{ background: 'var(--glass-bg-2)', padding: '2px 8px', borderRadius: 10 }}>
                      {cust.ordersCount}
                    </span>
                  </td>
                  <td style={{ padding: 12, fontSize: 13, fontWeight: 900, color: 'var(--clr-accent)' }}>
                    {cust.totalSpent.toFixed(0)} {currency}
                  </td>
                  <td style={{ padding: 12, fontSize: 11, color: 'var(--clr-text-3)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} style={{ opacity: 0.5 }} />
                      {new Date(cust.lastOrderDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {cust.phone ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleWhatsAppChat(cust.phone)}
                        style={{ color: '#25D366', padding: '4px 8px', fontSize: 11, gap: 4, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <MessageCircle size={14} /> مراسلة
                      </button>
                    ) : (
                      <span style={{ color: 'var(--clr-text-muted)', fontSize: 11 }}>غير متوفر</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
