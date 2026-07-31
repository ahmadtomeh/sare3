import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, ClipboardList, Settings,
  QrCode, CreditCard, LogOut, Zap, Menu, X, Bell, Tag, Users
} from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { useOrdersStore } from '../../stores/useOrdersStore'
import { useProductsStore } from '../../stores/useProductsStore'
import ThemeToggle from '../../components/ThemeToggle'
import LiveViewSwitcher from '../../components/LiveViewSwitcher'
import { supabase } from '../../lib/supabase'
import { subscribeToPush, isPushSubscribed, getNotificationPermission } from '../../lib/pushNotifications'
import toast from 'react-hot-toast'

import DashboardHome     from './DashboardHome'
import ProductManager    from './ProductManager'
import OrdersTable       from './OrdersTable'
import StoreSettings     from './StoreSettings'
import QRGenerator       from './QRGenerator'
import SubscriptionPanel from './SubscriptionPanel'
import CouponManager     from './CouponManager'
import CustomersCRM      from './CustomersCRM'

const NAV_ITEMS = [
  { id: 'home',         icon: <LayoutDashboard size={20}/>, label: 'الرئيسية',       badge: null },
  { id: 'products',     icon: <ShoppingBag size={20}/>,     label: 'المنتجات',       badge: null },
  { id: 'orders',       icon: <ClipboardList size={20}/>,   label: 'الطلبات',        badge: 'orders' },
  { id: 'customers',    icon: <Users size={20}/>,           label: 'العملاء والزبائن', badge: null },
  { id: 'coupons',      icon: <Tag size={20}/>,             label: 'الكوبونات والخصومات', badge: null },
  { id: 'settings',     icon: <Settings size={20}/>,        label: 'إعدادات المتجر', badge: null },
  { id: 'qr',           icon: <QrCode size={20}/>,          label: 'الرابط والـ QR', badge: null },
  { id: 'subscription', icon: <CreditCard size={20}/>,      label: 'الاشتراك',       badge: null },
]

export default function MerchantDashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  const getInitialTab = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    const tab = parts[parts.length - 1]
    return ['products', 'orders', 'customers', 'coupons', 'settings', 'qr', 'subscription'].includes(tab) ? tab : 'home'
  }

  const [active, setActive] = useState(getInitialTab)
  const [view, setView] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const { user, signOut } = useAuthStore()
  const { store, fetchMyStore } = useStoreConfig()
  const { fetchOrders, getStats } = useOrdersStore()
  const { fetchAll } = useProductsStore()

  // 1. Sync URL path -> Active tab state on mount and URL changes
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    const tab = parts[parts.length - 1]
    const matchedTab = ['products', 'orders', 'customers', 'coupons', 'settings', 'qr', 'subscription'].includes(tab) ? tab : 'home'
    if (active !== matchedTab) {
      setActive(matchedTab)
    }
  }, [location.pathname])

  // 2. Sync Active tab state -> URL path on user interactions
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    const currentTab = parts[parts.length - 1]
    const matchedTab = ['products', 'orders', 'customers', 'coupons', 'settings', 'qr', 'subscription'].includes(currentTab) ? currentTab : 'home'
    if (active !== matchedTab) {
      navigate(active === 'home' ? '/dashboard' : `/dashboard/${active}`)
    }
  }, [active])

  // Load merchant store on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      const s = await fetchMyStore(user?.id)
      if (s?.id) {
        fetchOrders(s.id)
        fetchAll(s.id)
        // Subscribe to real-time order updates
        const unsubscribe = useOrdersStore.getState().subscribeToOrders(s.id)
        return unsubscribe
      } else if (!useAuthStore.getState().isDemoMode) {
        // No store found — redirect to onboarding wizard
        navigate('/onboarding')
      }
    }
    const cleanup = loadData()
    return () => { cleanup?.then?.(fn => fn?.()) }
  }, [user?.id])

  // طلب إذن الإشعارات والاشتراك تلقائياً عند فتح اللوحة
  useEffect(() => {
    isPushSubscribed().then(setPushEnabled)
    if ('Notification' in window) {
      if (Notification.permission === 'granted' && store?.id) {
        subscribeToPush(store.id).then(() => setPushEnabled(true)).catch(() => {})
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted' && store?.id) {
            subscribeToPush(store.id).then(() => setPushEnabled(true)).catch(() => {})
          }
        })
      }
    }
  }, [store?.id])

  const handleEnablePush = async () => {
    if (!store?.id) {
      toast.error('لم يتم العثور على المتجر')
      return
    }
    if (getNotificationPermission() === 'denied') {
      toast.error('تم حظر الإشعارات في هذا المتصفح — افتح إعدادات المتصفح وأعد التفعيل')
      return
    }
    setPushLoading(true)
    try {
      await subscribeToPush(store.id)
      setPushEnabled(true)
      toast.success('🔔 تم تفعيل الإشعارات! ستصلك إشعارات الطلبات حتى لو الهاتف مقفل', { duration: 5000 })
    } catch (err) {
      toast.error(err.message || 'فشل تفعيل الإشعارات')
    }
    setPushLoading(false)
  }


  useEffect(() => {
    if (!store?.id) return

    const playCashRegisterSound = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const playTone = (freq, startTime, duration, type = 'sine') => {
          const osc = audioCtx.createOscillator()
          const gain = audioCtx.createGain()
          osc.connect(gain)
          gain.connect(audioCtx.destination)
          osc.type = type
          osc.frequency.setValueAtTime(freq, startTime)
          gain.gain.setValueAtTime(0.08, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
          osc.start(startTime)
          osc.stop(startTime + duration)
        }
        const now = audioCtx.currentTime
        playTone(987.77, now, 0.08, 'sine') // B5
        playTone(1318.51, now + 0.08, 0.08, 'sine') // E6
        playTone(1975.53, now + 0.16, 0.25, 'sine') // B6
      } catch (e) {
        console.warn('Audio feedback failed:', e)
      }
    }

    const channel = supabase
      .channel(`live-orders-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          const newOrder = payload.new
          if (!newOrder) return

          // Append to state
          useOrdersStore.getState().addLiveOrder(newOrder)

          // Play Sound
          playCashRegisterSound()

          // Browser Notification (even when tab is in background)
          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`💰 طلب جديد — ${store.name}`, {
              body: `من: ${newOrder.customer_name} • بقيمة ${parseFloat(newOrder.total || 0).toFixed(0)} ${store.currency || '₪'}`,
              icon: store.logo_url || '/favicon.ico',
              badge: '/favicon.ico',
              tag: `order-${newOrder.id}`,
              requireInteraction: true,
            })
            notif.onclick = () => {
              window.focus()
              setActive('orders')
              notif.close()
            }
          }

          // Show beautiful custom toast
          toast.custom((t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} glass`}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, var(--clr-primary, #8B5CF6), var(--clr-accent, #10B981))',
                color: '#fff',
                borderRadius: 14,
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--clr-border, rgba(255, 255, 255, 0.15))',
                direction: 'rtl',
                minWidth: 280,
              }}
            >
              <div style={{ fontSize: 24 }}>💰</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>طلب جديد وارد! #{newOrder.order_number}</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>من: {newOrder.customer_name} • بقيمة {parseFloat(newOrder.total).toFixed(0)} {store.currency || '₪'}</div>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  setActive('orders')
                }}
                style={{
                  background: '#fff',
                  color: 'var(--clr-primary, #8B5CF6)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                عرض
              </button>
            </div>
          ), { duration: 6000 })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [store?.id])

  const stats = getStats()
  const newOrdersCount = stats.newOrders

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // ── Live Preview Mode ──────────────────────────────────────
  if (view === 'storefront') {
    return <StorefrontPreview slug={store?.slug || 'demo'} onBack={() => setView('dashboard')} />
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--clr-bg)' }}>

      {/* ── Fixed Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        height: 'var(--header-h)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        gap: 8,
      }}>
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* Mobile hamburger */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none', padding: 6, borderRadius: 8, minHeight: 34,
              background: 'var(--glass-bg-2)', border: '1px solid var(--clr-border)',
              color: 'var(--clr-text)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            {mobileMenuOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>

          <div className="navbar-logo" style={{ flexShrink: 0 }}>
            <Zap size={18} style={{ color: 'var(--clr-accent)' }}/>
            سريع
          </div>

          {store && (
            <div className="desktop-store-pill" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              background: 'var(--glass-bg-2)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)', color: 'var(--clr-text-2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clr-success)', flexShrink: 0 }}/>
              {store.name}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* Desktop Live Switcher */}
          <div className="desktop-switcher">
            <LiveViewSwitcher view={view} onChange={setView}/>
          </div>
          {/* Mobile Eye Button for Quick Preview */}
          <button
            className="mobile-preview-btn btn btn-ghost btn-sm"
            onClick={() => setView(view === 'dashboard' ? 'storefront' : 'dashboard')}
            style={{ display: 'none', padding: '4px 8px', minHeight: 34, fontSize: 11 }}
            id="mobile-preview-toggle"
          >
            {view === 'dashboard' ? '👁️ المعاينة' : '📊 اللوحة'}
          </button>

          <ThemeToggle/>

          {/* Push Notifications Toggle */}
          <button
            onClick={handleEnablePush}
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, minHeight: 34, position: 'relative' }}
            title={pushEnabled ? 'الإشعارات مفعّلة ✅' : 'فعّل الإشعارات الفورية 🔔'}
            id="push-enable-btn"
            disabled={pushLoading}
          >
            <Bell size={16} style={{ color: pushEnabled ? 'var(--clr-success)' : 'var(--clr-text-3)' }} />
            {pushEnabled && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--clr-success)',
              }} />
            )}
          </button>

          {newOrdersCount > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: 6, minHeight: 34 }}
                onClick={() => setActive('orders')}
                id="dash-bell-btn"
              >
                <Bell size={16}/>
              </button>
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: 'var(--clr-danger)', color: '#fff',
                fontSize: 9, fontWeight: 900, borderRadius: '50%',
                width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {newOrdersCount}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside style={{
        position: 'fixed',
        top: 'var(--header-h)',
        right: 0,
        width: 'var(--sidebar-w)',
        height: 'calc(100dvh - var(--header-h))',
        overflow: 'auto',
        padding: 'var(--sp-md)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--glass-border)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }} className="desktop-sidebar">

        {/* Store card */}
        {store && (
          <div style={{
            padding: 'var(--sp-md)', marginBottom: 'var(--sp-sm)',
            background: 'var(--glass-bg-2)',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {store.logo_url
                ? <img src={store.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}/>
                : '🏪'
              }
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {store.name}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
                {store.subscription_status === 'trial' ? '🟡 تجريبي' : '🟢 نشط'}
              </div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>
          القائمة
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`sidebar-${item.id}`}
            onClick={() => setActive(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px var(--sp-md)', borderRadius: 'var(--radius-md)',
              border: '1px solid transparent',
              cursor: 'pointer', width: '100%',
              fontSize: 'var(--text-sm)', fontWeight: 500,
              transition: 'all var(--tr-base)',
              background: active === item.id ? 'linear-gradient(135deg, var(--clr-primary-glow), transparent)' : 'transparent',
              color: active === item.id ? 'var(--clr-primary)' : 'var(--clr-text-2)',
              borderColor: active === item.id ? 'var(--clr-primary-glow)' : 'transparent',
            }}
          >
            {item.icon}
            <span style={{ flex: 1, textAlign: 'right' }}>{item.label}</span>
            {item.badge === 'orders' && newOrdersCount > 0 && (
              <span style={{
                background: 'var(--clr-warning)', color: '#fff',
                borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700,
                padding: '2px 7px',
              }}>
                {newOrdersCount}
              </span>
            )}
          </button>
        ))}

        <div style={{ flex: 1 }}/>
        <div style={{ height: 1, background: 'var(--clr-border)', margin: '8px 0' }}/>
        <button
          id="sidebar-signout"
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px var(--sp-md)', borderRadius: 'var(--radius-md)',
            border: '1px solid transparent', cursor: 'pointer', width: '100%',
            fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--clr-danger)',
            background: 'transparent', transition: 'all var(--tr-base)',
          }}
        >
          <LogOut size={20}/>
          تسجيل الخروج
        </button>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 55, backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 'var(--header-h)', right: 0,
              width: 260, height: `calc(100dvh - var(--header-h))`,
              background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
              borderLeft: '1px solid var(--glass-border)',
              padding: 'var(--sp-md)',
              display: 'flex', flexDirection: 'column', gap: 4,
              animation: 'slideUpSheet 0.25s ease forwards',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActive(item.id); setMobileMenuOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px var(--sp-md)', borderRadius: 'var(--radius-md)',
                  border: '1px solid transparent', cursor: 'pointer', width: '100%',
                  fontSize: 'var(--text-sm)', fontWeight: 500,
                  background: active === item.id ? 'var(--clr-primary-glow)' : 'transparent',
                  color: active === item.id ? 'var(--clr-primary)' : 'var(--clr-text-2)',
                  transition: 'all var(--tr-base)',
                }}
              >
                {item.icon}
                <span style={{ flex: 1, textAlign: 'right' }}>{item.label}</span>
              </button>
            ))}
            <div style={{ flex: 1 }}/>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px var(--sp-md)',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', width: '100%',
                fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--clr-danger)', background: 'transparent',
              }}
            >
              <LogOut size={20}/>
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main style={{
        marginRight: 'var(--sidebar-w)',
        marginTop: 'var(--header-h)',
        padding: 'var(--sp-xl)',
        minHeight: 'calc(100dvh - var(--header-h))',
      }} id="dashboard-main">
        {active === 'home'         && <DashboardHome     onNavigate={setActive}/>}
        {active === 'products'     && <ProductManager/>}
        {active === 'orders'       && <OrdersTable/>}
        {active === 'customers'    && <CustomersCRM/>}
        {active === 'coupons'      && <CouponManager/>}
        {active === 'settings'     && <StoreSettings/>}
        {active === 'qr'           && <QRGenerator/>}
        {active === 'subscription' && <SubscriptionPanel/>}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav style={{
        display: 'none',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'var(--bottom-bar-h)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} id="mobile-bottom-nav">
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'space-around' }}>
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <button
              key={item.id}
              id={`mob-nav-${item.id}`}
              onClick={() => setActive(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: active === item.id ? 'var(--clr-primary)' : 'var(--clr-text-3)',
                fontSize: 10, fontWeight: 500,
                padding: 8, borderRadius: 'var(--radius-md)',
                background: 'none', border: 'none', cursor: 'pointer',
                minWidth: 52, transition: 'all var(--tr-base)',
                position: 'relative',
              }}
            >
              {item.icon}
              {item.label.split(' ')[0]}
              {item.badge === 'orders' && newOrdersCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, left: 6,
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'var(--clr-danger)', color: '#fff',
                  fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {newOrdersCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Responsive Styles ── */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn  { display: flex !important; }
          #mobile-bottom-nav { display: block !important; }
          .desktop-sidebar  { display: none !important; }
          #dashboard-main {
            margin-right: 0 !important;
            padding: var(--sp-md) !important;
            padding-bottom: calc(var(--bottom-bar-h) + var(--sp-xl)) !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ── Storefront Preview Wrapper ────────────────────────────── */
function StorefrontPreview({ slug, onBack }) {
  // Dynamically import to avoid circular dep
  const [Storefront, setStorefront] = useState(null)
  useEffect(() => {
    import('../CustomerStorefront/index.jsx').then((m) => setStorefront(() => m.default))
  }, [])

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Sleek Preview Banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 48,
        background: 'rgba(15, 17, 30, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 700,
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--clr-accent)', boxShadow: '0 0 10px var(--clr-accent)' }} />
          <span>👁️ معاينة حية — هكذا يبدو متجرك لزبائنك</span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={onBack}
          style={{ padding: '4px 14px', minHeight: 32, fontSize: 12, borderRadius: 'var(--radius-full)' }}
          id="preview-back-to-dashboard"
        >
          ← العودة للوحة التحكم
        </button>
      </div>
      <div style={{ paddingTop: 48 }}>
        {Storefront ? <Storefront previewSlug={slug}/> : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--clr-primary-glow)', borderTop: '3px solid var(--clr-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
          </div>
        )}
      </div>
    </div>
  )
}


