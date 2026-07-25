import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Search, ShoppingCart, Package, MapPin, Phone, User, MessageCircle, Plus, Check, ArrowRight } from 'lucide-react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { useProductsStore } from '../../stores/useProductsStore'
import { useCartStore } from '../../stores/useCartStore'
import { buildWhatsAppMessage } from '../../utils/whatsapp'
import { BottomSheet } from '../../components/ui/Modal'
import ThemeToggle from '../../components/ThemeToggle'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function CustomerStorefront({ previewSlug }) {
  const { slug: routeSlug } = useParams()
  const slug = previewSlug || routeSlug

  const { store, fetchStore, loading: storeLoading } = useStoreConfig()
  const { categories, products, fetchAll } = useProductsStore()
  const { items, addItem, count, total, setStoreId, customerInfo, setCustomerInfo } = useCartStore()

  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [myOrdersOpen, setMyOrdersOpen] = useState(false)

  // ── Coupon & Shipping States ──
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [selectedShippingZone, setSelectedShippingZone] = useState(null)

  useEffect(() => {
    if (slug) {
      fetchStore(slug).then((s) => {
        if (s?.id) {
          fetchAll(s.id)
          setStoreId(s.id)
        }
      })
    }
  }, [slug])

  useEffect(() => {
    if (!store) return
    const theme = store.selected_theme || 'neon'
    const root = document.documentElement

    const pColor = theme === 'luxury' ? '#d4af37' : (store.primary_color || '#8B5CF6')
    const aColor = theme === 'luxury' ? '#f59e0b' : (store.accent_color || '#10B981')
    root.style.setProperty('--clr-primary', pColor)
    root.style.setProperty('--clr-accent', aColor)

    if (theme === 'classic') {
      root.style.setProperty('--clr-bg', '#f9fafb')
      root.style.setProperty('--clr-bg-surface', '#ffffff')
      root.style.setProperty('--clr-text', '#111827')
      root.style.setProperty('--clr-text-2', '#374151')
      root.style.setProperty('--clr-text-3', '#6b7280')
      root.style.setProperty('--clr-border', '#e5e7eb')
      root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.85)')
      root.style.setProperty('--glass-bg-2', 'rgba(243, 244, 246, 0.8)')
      root.style.setProperty('--glass-border', 'rgba(229, 231, 235, 0.6)')
    } else if (theme === 'luxury') {
      root.style.setProperty('--clr-bg', '#09090b')
      root.style.setProperty('--clr-bg-surface', '#18181b')
      root.style.setProperty('--clr-text', '#fafafa')
      root.style.setProperty('--clr-text-2', '#d4d4d8')
      root.style.setProperty('--clr-text-3', '#a1a1aa')
      root.style.setProperty('--clr-border', '#27272a')
      root.style.setProperty('--glass-bg', 'rgba(24, 24, 27, 0.85)')
      root.style.setProperty('--glass-bg-2', 'rgba(39, 39, 42, 0.8)')
      root.style.setProperty('--glass-border', 'rgba(212, 175, 55, 0.2)')
    } else {
      root.style.removeProperty('--clr-bg')
      root.style.removeProperty('--clr-bg-surface')
      root.style.removeProperty('--clr-text')
      root.style.removeProperty('--clr-text-2')
      root.style.removeProperty('--clr-text-3')
      root.style.removeProperty('--clr-border')
      root.style.removeProperty('--glass-bg')
      root.style.removeProperty('--glass-bg-2')
      root.style.removeProperty('--glass-border')
    }

    return () => {
      root.style.removeProperty('--clr-primary')
      root.style.removeProperty('--clr-accent')
      root.style.removeProperty('--clr-bg')
      root.style.removeProperty('--clr-bg-surface')
      root.style.removeProperty('--clr-text')
      root.style.removeProperty('--clr-text-2')
      root.style.removeProperty('--clr-text-3')
      root.style.removeProperty('--clr-border')
      root.style.removeProperty('--glass-bg')
      root.style.removeProperty('--glass-bg-2')
      root.style.removeProperty('--glass-border')
    }
  }, [store?.primary_color, store?.accent_color, store?.selected_theme])

  const cartCount = count()
  const cartTotal = total()
  const currency = store?.currency || '₪'

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0
    if (appliedCoupon.discount_type === 'percentage') {
      return cartTotal * (appliedCoupon.discount_value / 100)
    } else {
      return parseFloat(appliedCoupon.discount_value)
    }
  }, [appliedCoupon, cartTotal])

  const finalTotal = useMemo(() => {
    return Math.max(0, cartTotal - discountAmount + (selectedShippingZone?.cost || 0))
  }, [cartTotal, discountAmount, selectedShippingZone])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const inCat = activeCategory === 'all' || p.category_id === activeCategory
      const inSearch = !search || p.name.includes(search) || p.description?.includes(search)
      return inCat && inSearch
    })
  }, [products, activeCategory, search])

  if (storeLoading) return <CompactSkeleton />
  if (!store) return <StoreNotFound />

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--clr-bg)', paddingBottom: cartCount > 0 ? 84 : 20 }}>

      {/* ── Compact Native Mobile Top Bar (Height ~54px) ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 54,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--clr-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
      }}>
        {/* Store Brand Mini Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${store.primary_color || 'var(--clr-primary)'}, ${store.accent_color || 'var(--clr-accent)'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0, color: '#fff', fontWeight: 800,
          }}>
            {store.logo_url ? <img src={store.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : '🏪'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h1 style={{ fontSize: 14, fontWeight: 800, color: 'var(--clr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              {store.name}
            </h1>
            <span style={{ fontSize: 10, color: 'var(--clr-accent)', fontWeight: 700 }}>مفتوح للطلب 🟢</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, minHeight: 34 }}
            onClick={() => setSearchOpen(!searchOpen)}
            id="cust-toggle-search"
          >
            <Search size={16} />
          </button>
          
          {/* Shopping Cart Button in Header */}
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px 8px', minHeight: 34, position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCartOpen(true)}
            id="cust-top-cart-btn"
          >
            <ShoppingCart size={18} style={{ color: cartCount > 0 ? 'var(--clr-accent)' : 'var(--clr-text)' }} />
            {cartCount > 0 && (
              <span style={{
                background: 'var(--clr-accent)', color: '#fff',
                fontSize: 10, fontWeight: 900, borderRadius: 'var(--radius-full)',
                padding: '1px 6px', minWidth: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px var(--clr-accent-glow)',
              }}>
                {cartCount}
              </span>
            )}
          </button>

          <ThemeToggle />

          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, minHeight: 34 }}
            onClick={() => setMyOrdersOpen(true)}
            id="cust-orders-icon"
          >
            📋
          </button>
        </div>
      </header>

      {/* ── Expandable Search Bar (Only when toggled) ── */}
      {searchOpen && (
        <div style={{ padding: '8px 12px', background: 'var(--glass-bg-2)', borderBottom: '1px solid var(--clr-border)' }}>
          <input
            className="input"
            style={{ minHeight: 36, fontSize: 13 }}
            placeholder={`بحث في ${store.name}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            id="cust-compact-search"
          />
        </div>
      )}

      {/* ── Compact Horizontal Categories Bar ── */}
      <div style={{ padding: '8px 12px 4px' }}>
        <div className="category-chips">
          <button className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
            الكل ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              id={`cat-${cat.id}`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Ultra-Compact 2-Column Mobile Product Grid ── */}
      <div style={{ padding: '4px 12px' }}>
        {filteredProducts.length === 0 ? (
          <div className="glass empty-state" style={{ padding: '32px 16px' }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.4 }}>🔍</div>
            <div className="empty-state-title" style={{ fontSize: 14 }}>لا توجد منتجات</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', alignContent: 'start', alignItems: 'start', gap: 8 }}>
            {filteredProducts.map((product, idx) => (
              <CompactProductCard
                key={product.id}
                product={product}
                currency={currency}
                badge={idx === 0 ? '🔥 الأكثر مبيعاً' : null}
                onAdd={() => {
                  let opts = product.options
                  if (typeof opts === 'string') {
                    try { opts = JSON.parse(opts) } catch { opts = [] }
                  }
                  if (Array.isArray(opts) && opts.length > 0) {
                    setSelectedProduct(product)
                  } else {
                    addItem(product)
                    toast.success(`أضيف للسلة 🛒`, { duration: 1000 })
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Cart Bar (Thumb Zone) ── */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 'calc(10px + env(safe-area-inset-bottom))',
          left: 12, right: 12, zIndex: 90,
        }}>
          <button
            className="btn btn-primary btn-full animate-glow"
            onClick={() => setCartOpen(true)}
            id="cust-bottom-cart-bar"
            style={{
              background: `linear-gradient(135deg, ${store.primary_color || 'var(--clr-primary)'}, ${store.accent_color || 'var(--clr-accent)'})`,
              minHeight: 48, borderRadius: 14,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
              <ShoppingCart size={18} />
              <span>السلة ({cartCount})</span>
            </div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              {cartTotal.toFixed(0)} {currency} ←
            </div>
          </button>
        </div>
      )}

      {/* ── Product Options Sheet ── */}
      {selectedProduct && (
        <ProductOptionsSheet
          product={selectedProduct}
          currency={currency}
          onClose={() => setSelectedProduct(null)}
          onAdd={(opts) => {
            addItem(selectedProduct, opts)
            setSelectedProduct(null)
            toast.success('أضيف للسلة 🛒', { duration: 1000 })
          }}
        />
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <CartDrawer
          store={store}
          items={items}
          currency={currency}
          cartTotal={cartTotal}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          appliedCoupon={appliedCoupon}
          setAppliedCoupon={setAppliedCoupon}
          discountAmount={discountAmount}
          finalTotal={finalTotal}
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setOrderOpen(true) }}
        />
      )}

      {/* ── Order Form Sheet ── */}
      {orderOpen && (
        <OrderFormSheet
          store={store}
          items={items}
          currency={currency}
          cartTotal={cartTotal}
          appliedCoupon={appliedCoupon}
          discountAmount={discountAmount}
          selectedShippingZone={selectedShippingZone}
          setSelectedShippingZone={setSelectedShippingZone}
          finalTotal={finalTotal}
          customerInfo={customerInfo}
          onSaveCustomer={setCustomerInfo}
          onClose={() => setOrderOpen(false)}
        />
      )}

      {/* ── My Orders Sheet ── */}
      {myOrdersOpen && (
        <MyOrdersSheet store={store} onClose={() => setMyOrdersOpen(false)} />
      )}

    </div>
  )
}

/* ── Ultra-Compact Product Card Component ── */
function CompactProductCard({ product, currency, badge, onAdd }) {
  return (
    <div className="glass" style={{
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      position: 'relative', border: '1px solid var(--clr-border)',
    }}>
      {/* Badge */}
      {badge && product.is_available && (
        <span style={{
          position: 'absolute', top: 6, right: 6, zIndex: 10,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
        }}>
          {badge}
        </span>
      )}

      {/* Image */}
      <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--glass-bg-2)', position: 'relative', overflow: 'hidden' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-muted)' }}>
            <Package size={28} style={{ opacity: 0.3 }} />
          </div>
        )}
        {!product.is_available && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            نفد المخزون
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--clr-text)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
          {product.name}
        </div>

        {/* Price & Compact Add Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--clr-accent)' }}>
            {parseFloat(product.price).toFixed(0)} <span style={{ fontSize: 9 }}>{currency}</span>
          </div>

          {product.is_available && (
            <button
              onClick={onAdd}
              id={`add-btn-${product.id}`}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: '0 2px 8px var(--clr-primary-glow)',
              }}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Product Options Sheet ── */
function ProductOptionsSheet({ product, currency, onClose, onAdd }) {
  const optionsList = useMemo(() => {
    if (!product?.options) return []
    if (typeof product.options === 'string') {
      try { return JSON.parse(product.options) } catch { return [] }
    }
    return Array.isArray(product.options) ? product.options : []
  }, [product?.options])

  const [selected, setSelected] = useState({})
  const allSelected = optionsList.length === 0 || optionsList.every((opt) => selected[opt.label])

  return (
    <BottomSheet title={product.name} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {product.image_url && (
          <img src={product.image_url} alt={product.name} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12 }} />
        )}
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--clr-accent)' }}>
          {parseFloat(product.price).toFixed(2)} {currency}
        </div>

        {optionsList.map((opt) => (
          <div key={opt.label}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
              {opt.label} {selected[opt.label] && <span style={{ color: 'var(--clr-primary)' }}>— {selected[opt.label]}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {opt.values?.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`category-chip ${selected[opt.label] === val ? 'active' : ''}`}
                  style={{ padding: '6px 14px', minHeight: 34, fontSize: 12, fontWeight: 700 }}
                  onClick={() => setSelected((s) => ({ ...s, [opt.label]: val }))}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          className="btn btn-primary btn-full btn-lg animate-glow"
          onClick={() => onAdd(selected)}
          disabled={!allSelected}
          style={{ marginTop: 8 }}
        >
          {allSelected ? '✅ إضافة للسلة' : 'اختر الخيارات أولاً'}
        </button>
      </div>
    </BottomSheet>
  )
}

/* ── Cart Drawer ── */
function CartDrawer({
  store, items, currency, cartTotal,
  couponCode, setCouponCode, appliedCoupon, setAppliedCoupon,
  discountAmount, finalTotal, onClose, onCheckout
}) {
  const { updateQty, removeItem } = useCartStore()
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCheckingCoupon(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', store.id)
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single()
      if (error || !data) {
        toast.error('❌ الكوبون غير صالح أو منتهي')
        setAppliedCoupon(null)
      } else {
        setAppliedCoupon(data)
        toast.success('🎉 تم تطبيق كود الخصم!')
      }
    } catch {
      // Local fallback testing
      if (couponCode.toUpperCase() === 'WELCOME10') {
        setAppliedCoupon({ code: 'WELCOME10', discount_type: 'percentage', discount_value: 10 })
        toast.success('🎉 تم تطبيق كود الخصم!')
      } else {
        toast.error('❌ الكوبون غير صالح')
      }
    } finally {
      setCheckingCoupon(false)
    }
  }

  return (
    <BottomSheet title="سلة التسوق 🛒" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div style={{ fontSize: '2.5rem' }}>🛒</div>
            <div className="empty-state-title" style={{ fontSize: 14 }}>السلة فارغة</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '35dvh', overflowY: 'auto' }}>
              {items.map((item) => (
                <div key={item.key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: 'var(--glass-bg-2)', borderRadius: 10 }}>
                  {item.product.image_url
                    ? <img src={item.product.image_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, background: 'var(--clr-bg-surface)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                    <div style={{ fontWeight: 900, color: 'var(--clr-accent)', fontSize: 12 }}>
                      {(item.product.price * item.quantity).toFixed(0)} {currency}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--glass-bg-2)', padding: '2px 4px', borderRadius: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', minHeight: 24 }} onClick={() => updateQty(item.key, item.quantity - 1)}>−</button>
                    <span style={{ fontWeight: 800, fontSize: 12 }}>{item.quantity}</span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', minHeight: 24 }} onClick={() => updateQty(item.key, item.quantity + 1)}>+</button>
                  </div>
                  <button onClick={() => removeItem(item.key)} style={{ color: 'var(--clr-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                </div>
              ))}
            </div>

            {/* Coupon Section */}
            <div style={{ padding: '8px 0', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                style={{ minHeight: 34, fontSize: 11, flex: 1 }}
                placeholder="أدخل رمز الكوبون..."
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                disabled={appliedCoupon}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--clr-danger)', fontSize: 11 }}
                  onClick={() => { setAppliedCoupon(null); setCouponCode('') }}
                >
                  إلغاء الخصم
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ minHeight: 34, fontSize: 11, padding: '0 14px' }}
                  onClick={handleApplyCoupon}
                  disabled={checkingCoupon}
                >
                  {checkingCoupon ? 'جاري الفحص...' : 'تطبيق'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--clr-border)', paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--clr-text-3)' }}>
                <span>مجموع المنتجات:</span>
                <span>{cartTotal.toFixed(0)} {currency}</span>
              </div>
              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--clr-accent)' }}>
                  <span>خصم كوبون ({appliedCoupon.code}):</span>
                  <span>-{discountAmount.toFixed(0)} {currency}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--clr-border)', paddingTop: 6, marginTop: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>المجموع الإجمالي:</span>
                <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--clr-accent)' }}>
                  {finalTotal.toFixed(0)} {currency}
                </span>
              </div>
            </div>

            <button className="btn btn-primary btn-full btn-lg animate-glow" onClick={onCheckout} id="cust-cart-checkout" style={{ marginTop: 4 }}>
              <MessageCircle size={18} />
              تأكيد الطلب والتوصيل 💬
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

/* ── Order Form Sheet ── */
function OrderFormSheet({
  store, items, currency, cartTotal,
  appliedCoupon, discountAmount, selectedShippingZone, setSelectedShippingZone,
  finalTotal, customerInfo, onSaveCustomer, onClose
}) {
  const { clearCart, setCustomerInfo } = useCartStore()
  const [form, setForm] = useState({
    name: customerInfo?.name || '',
    phone: customerInfo?.phone || '',
    address: customerInfo?.address || '',
    notes: customerInfo?.notes || '',
  })
  const [sending, setSending] = useState(false)

  // Default to first shipping option if available and none selected yet
  useEffect(() => {
    const opts = store?.shipping_options || []
    if (opts.length > 0 && !selectedShippingZone) {
      setSelectedShippingZone(opts[0])
    }
  }, [store?.shipping_options])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSend = async () => {
    if (!form.name) { toast.error('يرجى كتابة اسمك'); return }
    setSending(true)

    const info = { name: form.name, phone: form.phone, address: form.address }
    setCustomerInfo(info)
    onSaveCustomer?.(info)

    // Build discount and shipping detail objects
    const discountObj = appliedCoupon ? { code: appliedCoupon.code, amount: discountAmount } : null
    const shippingObj = selectedShippingZone ? { name: selectedShippingZone.name, cost: selectedShippingZone.cost } : null

    const message = buildWhatsAppMessage({
      store, items, customer: form, total: finalTotal,
      discount: discountObj, shipping: shippingObj
    })

    const whatsappNumber = `${store.country_code || '+970'}${store.whatsapp}`.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

    // ── حفظ الطلب في localStorage ──
    const orderRecord = {
      id: `ORD-${Date.now()}`,
      storeId: store.id,
      storeName: store.name,
      date: new Date().toISOString(),
      customer: form,
      items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price, option: i.option })),
      total: finalTotal,
      currency,
    }
    try {
      const key = `sare3-orders-${store.id}`
      const prev = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify([orderRecord, ...prev].slice(0, 30)))
    } catch {}

    await new Promise(r => setTimeout(r, 400))
    window.open(url, '_blank')
    clearCart()
    setSending(false)
    onClose()
    toast.success('🎉 تم إرسال طلبك وحفظه في سجل طلباتك!')
  }

  const shippingOptions = store?.shipping_options || []

  return (
    <BottomSheet title="بيانات التوصيل 📍" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="input-group">
          <label className="input-label"><User size={12} /> الاسم الكامل *</label>
          <input className="input" style={{ minHeight: 38, fontSize: 13 }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="محمد أحمد" required id="cust-order-name" />
        </div>
        <div className="input-group">
          <label className="input-label"><Phone size={12} /> رقم الهاتف</label>
          <input className="input" style={{ minHeight: 38, fontSize: 13, direction: 'ltr' }} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0599123456" type="tel" id="cust-order-phone" />
        </div>
        <div className="input-group">
          <label className="input-label"><MapPin size={12} /> عنوان التوصيل</label>
          <input className="input" style={{ minHeight: 38, fontSize: 13 }} value={form.address} onChange={e => set('address', e.target.value)} placeholder="المدينة — الشارع" id="cust-order-address" />
        </div>

        {/* Shipping Options Dropdown */}
        {shippingOptions.length > 0 && (
          <div className="input-group">
            <label className="input-label">منطقة الشحن والتوصيل 🚚</label>
            <select
              className="input"
              value={selectedShippingZone ? JSON.stringify(selectedShippingZone) : ''}
              onChange={e => {
                if (e.target.value) {
                  setSelectedShippingZone(JSON.parse(e.target.value))
                } else {
                  setSelectedShippingZone(null)
                }
              }}
              style={{ minHeight: 38, fontSize: 13 }}
            >
              {shippingOptions.map((opt, i) => (
                <option key={i} value={JSON.stringify(opt)}>
                  {opt.name} (+{opt.cost} {currency})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="btn btn-accent btn-full btn-lg animate-glow"
          onClick={handleSend}
          disabled={sending}
          id="cust-confirm-wa-btn"
          style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', marginTop: 4 }}
        >
          <MessageCircle size={18} />
          إرسال الطلب الآن ({finalTotal.toFixed(0)} {currency}) 💬
        </button>
      </div>
    </BottomSheet>
  )
}

function MyOrdersSheet({ store, onClose }) {
  const { addItem } = useCartStore()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    try {
      const key = `sare3-orders-${store.id}`
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      setOrders(saved)
    } catch {
      setOrders([])
    }
  }, [store.id])

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addItem({ id: `reorder-${item.name}`, name: item.name, price: item.price }, item.qty, item.option)
    })
    toast.success('✅ تمت إعادة الطلب إلى السلة!')
    onClose()
  }

  const handleClearOrders = () => {
    const key = `sare3-orders-${store.id}`
    localStorage.removeItem(key)
    setOrders([])
    toast.success('تم مسح السجل')
  }

  return (
    <BottomSheet title="طلباتي السابقة 📋" onClose={onClose}>
      {orders.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--clr-text-2)' }}>لا توجد طلبات سابقة</div>
          <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 4 }}>ستظهر طلباتك هنا بعد أول عملية شراء</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55dvh', overflowY: 'auto' }}>
          {orders.map((order) => (
            <div key={order.id} className="glass" style={{ borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{order.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>
                    {new Date(order.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--clr-accent)' }}>
                  {order.total?.toFixed(0)} {order.currency}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--clr-text-2)', display: 'flex', gap: 4 }}>
                    <span style={{ color: 'var(--clr-text-3)' }}>{item.qty}×</span>
                    <span>{item.name}</span>
                    {item.option && <span style={{ color: 'var(--clr-text-3)' }}>({item.option})</span>}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost btn-sm btn-full"
                onClick={() => handleReorder(order)}
                style={{ fontSize: 11 }}
              >
                🔄 إعادة الطلب
              </button>
            </div>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClearOrders}
            style={{ fontSize: 11, color: 'var(--clr-danger)', alignSelf: 'center', marginTop: 4 }}
          >
            🗑️ مسح السجل
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

function StoreNotFound() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="glass empty-state" style={{ maxWidth: 360, width: '100%', padding: 24 }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <div className="empty-state-title">المتجر غير موجود</div>
        <a href="/" className="btn btn-primary" style={{ marginTop: 12 }}>العودة للرئيسية</a>
      </div>
    </div>
  )
}

function CompactSkeleton() {
  return (
    <div style={{ padding: 12 }}>
      <div className="skeleton" style={{ height: 50, marginBottom: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
      </div>
    </div>
  )
}
