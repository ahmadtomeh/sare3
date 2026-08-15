import { useState, useEffect, useMemo, useRef, memo, useCallback, useDeferredValue } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Package, MapPin, Phone, User, MessageCircle, Plus, Check, ArrowRight, Bell, Trash2, Sparkles, Tag, ShoppingBag, Share2 } from 'lucide-react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { useProductsStore } from '../../stores/useProductsStore'
import { useCartStore } from '../../stores/useCartStore'
import { buildWhatsAppMessage } from '../../utils/whatsapp'
import { useOrdersStore } from '../../stores/useOrdersStore'
import { BottomSheet } from '../../components/ui/Modal'
import ThemeToggle from '../../components/ThemeToggle'
import { supabase } from '../../lib/supabase'
import InstallPWA from '../../components/InstallPWA'
import { useReviewsStore } from '../../stores/useReviewsStore'
import toast from 'react-hot-toast'
import { subscribeCustomerToPush } from '../../lib/customerPushNotifications'
import SpinWheelModal from '../../components/SpinWheelModal'
import ImageLightboxModal from '../../components/ImageLightboxModal'
import { playAudioPop } from '../../utils/audio'
import { getStoreUrl } from '../../utils/storeUrl'

export const formatPrice = (val) => {
  const num = Number(val)
  if (isNaN(num)) return '0'
  return num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
}

export function optimizeImageUrl(url, width = 360, quality = 80) {
  if (!url || typeof url !== 'string') return url
  if (url.includes('images.unsplash.com')) {
    const clean = url.split('?')[0]
    return `${clean}?w=${width}&q=${quality}&auto=format&fit=crop`
  }
  return url
}

export default function CustomerStorefront({ previewSlug }) {
  const { slug: routeSlug } = useParams()

  const slug = useMemo(() => {
    if (previewSlug) return previewSlug

    const hostname = window.location.hostname
    const parts = hostname.split('.')

    // Check if we are on a custom store subdomain on fawri.shop
    const isSubdomain = parts.length >= 3 && !hostname.includes('vercel.app') && !['www', 'dashboard', 'admin', 'api'].includes(parts[0])
    if (isSubdomain) {
      return parts[0]
    }

    // Also support testing subdomains on localhost if desired (e.g. mudawra.localhost:5173)
    const isLocalhostSubdomain = hostname.includes('localhost') && parts.length >= 2 && parts[0] !== 'localhost'
    if (isLocalhostSubdomain) {
      return parts[0]
    }

    return routeSlug
  }, [previewSlug, routeSlug])
  const navigate = useNavigate()

  const { store, fetchStore, loading: storeLoading } = useStoreConfig()
  const { categories, products, fetchAll, loading: productsLoading, subscribeToProducts } = useProductsStore()
  const { items, addItem, count, total, setStoreId, customerInfo, setCustomerInfo } = useCartStore()

  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [myOrdersOpen, setMyOrdersOpen] = useState(false)
  const [trackedOrder, setTrackedOrder] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false) // {product} after order success
  const [spinWheelOpen, setSpinWheelOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState(null) // { url, title }

  // ── Share Store Action ──
  const handleShareStore = () => {
    const storeUrl = store?.slug ? getStoreUrl(store.slug) : window.location.href
    if (navigator.share) {
      navigator.share({
        title: store?.name || 'المتجر',
        text: `تسوق الآن من متجر ${store?.name || ''} على منصة فوري ⚡`,
        url: storeUrl
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(storeUrl)
      toast.success('🔗 تم نسخ رابط المتجر بنجاح!')
    }
  }

  // ── Coupon & Shipping States ──
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [selectedShippingZone, setSelectedShippingZone] = useState(null)

  // ── Audio Feedback (Web Audio API) ──
  const playAudioPop = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1)
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12)
      
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.12)
    } catch (e) {
      console.warn('Audio Context not supported or blocked:', e)
    }
  }

  const playAudioChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        
        gain.gain.setValueAtTime(0.06, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        
        osc.start(startTime)
        osc.stop(startTime + duration)
      }
      
      const now = audioCtx.currentTime
      playTone(523.25, now, 0.2) // C5 tone
      playTone(783.99, now + 0.12, 0.45) // G5 tone
    } catch (e) {
      console.warn('Celebrate chime not supported:', e)
    }
  }

  // ── Confetti Effect (Vanilla Canvas) ──
  const triggerConfetti = () => {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.top = 0
    canvas.style.left = 0
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.zIndex = 9999
    canvas.style.pointerEvents = 'none'
    document.body.appendChild(canvas)

    const ctx = canvas.getContext('2d')
    const colors = [
      { r: 244, g: 63, b: 94 },   // rose
      { r: 59, g: 130, b: 246 },  // blue
      { r: 16, g: 185, b: 129 },  // emerald
      { r: 234, g: 179, b: 8 },   // amber
      { r: 139, g: 92, b: 246 },  // violet
      { r: 255, g: 120, b: 73 }   // orange
    ]
    const particles = []
    
    // Resize canvas
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.8,
        r: Math.random() * 6 + 4,
        d: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 15 - 7,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 12 + 6,
        slowdown: 0.98,
        gravity: 0.25,
        opacity: 1.0
      })
    }

    let animationFrame
    let isCleanedUp = false

    const cleanup = () => {
      if (isCleanedUp) return
      isCleanedUp = true
      cancelAnimationFrame(animationFrame)
      if (canvas.parentNode) {
        document.body.removeChild(canvas)
      }
    }

    // Safety timeout to destroy canvas after 3.5 seconds
    const safetyTimeout = setTimeout(cleanup, 3500)

    const updateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let active = false

      particles.forEach((p) => {
        p.speed *= p.slowdown
        p.x += Math.cos(p.d * Math.PI / 180) * p.speed
        p.y += Math.sin(p.d * Math.PI / 180) * p.speed + p.gravity
        p.tiltAngle += p.tiltAngleIncremental
        p.tilt = Math.sin(p.tiltAngle - (particles.indexOf(p) / 3)) * 12
        p.opacity = Math.max(0, p.opacity - 0.015) // Gradually fade out

        ctx.beginPath()
        ctx.lineWidth = p.r / 2
        ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2)
        ctx.stroke()

        if (p.opacity > 0 && p.y < canvas.height + 20) {
          active = true
        }
      })

      if (active && !isCleanedUp) {
        animationFrame = requestAnimationFrame(updateConfetti)
      } else {
        clearTimeout(safetyTimeout)
        cleanup()
      }
    }
    updateConfetti()
  }

  // ── Store Open / Hours Check ──
  const isStoreOpen = useMemo(() => {
    if (!store) return true
    const start = store.working_hours_start || '09:00'
    const end = store.working_hours_end || '23:00'
    
    const now = new Date()
    const currentStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    
    if (start <= end) {
      return currentStr >= start && currentStr <= end
    } else {
      // Handles overnight hours (e.g. 18:00 to 02:00)
      return currentStr >= start || currentStr <= end
    }
  }, [store])

  // ── Mobile Hardware Back Button / Gesture Management ──
  // Check if any modal/sheet is open
  const isAnyModalOpen = !!(cartOpen || orderOpen || myOrdersOpen || searchOpen || trackedOrder)

  // Close all open modals helper
  const closeAllModals = () => {
    setCartOpen(false)
    setOrderOpen(false)
    setSelectedProduct(null)
    setMyOrdersOpen(false)
    setSearchOpen(false)
    setTrackedOrder(null)
  }

  // Push state to browser history when a modal opens so back button pops it instead of navigating away
  useEffect(() => {
    if (isAnyModalOpen) {
      window.history.pushState({ modalOpen: true }, '')
    }
  }, [isAnyModalOpen])

  useEffect(() => {
    const handlePopState = (e) => {
      if (isAnyModalOpen) {
        // If a modal was open, close it and prevent actual navigation back
        closeAllModals()
      } else {
        // Otherwise do normal navigation
        navigate('/')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isAnyModalOpen])

  const handleManualBack = () => {
    if (isAnyModalOpen) {
      closeAllModals()
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  useEffect(() => {
    if (slug) {
      // Parallel loading: fetch products immediately if store config is already cached
      const cachedStore = useStoreConfig.getState().store
      if (cachedStore && cachedStore.slug === slug) {
        fetchAll(cachedStore.id)
        setStoreId(cachedStore.id)
      }

      fetchStore(slug).then((s) => {
        if (s?.id) {
          fetchAll(s.id)
          setStoreId(s.id)
        }
      })
    }
  }, [slug])

  useEffect(() => {
    if (store?.id && subscribeToProducts) {
      const unsubscribe = subscribeToProducts(store.id)

      // Add a status tracker to show a connection toast directly on the mobile screen
      const testChannel = supabase
        .channel(`rt-status-${store.id}`)
        .subscribe((status) => {
          console.log(`⚡ Realtime connection status: ${status}`)
          if (status === 'SUBSCRIBED') {
            toast.success('🟢 تم الاتصال بالبث المباشر (Realtime Active)', { id: 'rt-toast', duration: 1500 })
          } else if (status === 'CHANNEL_ERROR') {
            toast.error('🔴 فشل اتصال البث المباشر', { id: 'rt-toast' })
          }
        })

      return () => {
        unsubscribe()
        supabase.removeChannel(testChannel)
      }
    }
  }, [store?.id, subscribeToProducts])

  // ── SEO + Open Graph + Dynamic White-Label Store PWA Manifest ──
  useEffect(() => {
    if (!store) return

    const storeSlug = store.slug || slug || 'demo'
    const storeName = store.name || 'المتجر'
    const storeDesc = store.description || `تسوق من ${storeName} واطلب منتجاتك مباشرة عبر الواتساب بسهولة وسرعة.`
    const storeLogo = store.logo_url || 'https://fawri.shop/og-default.png'
    const url = window.location.href

    const title = `${storeName} — اطلب عبر الواتساب ⚡`
    document.title = title

    const setMeta = (prop, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }

    setMeta('description', storeDesc)
    setMeta('og:title', title, 'property')
    setMeta('og:description', storeDesc, 'property')
    setMeta('og:image', storeLogo, 'property')
    setMeta('og:url', url, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('apple-mobile-web-app-title', storeName)

    // ── Dynamic Store PWA Manifest (same-origin API endpoint — no Chrome badge) ──
    // نستخدم API endpoint من نفس الدومين بدلاً من data: URI لضمان تثبيت PWA صحيح
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove())

    const hostname = window.location.hostname
    const parts = hostname.split('.')
    const isSubdomain = parts.length >= 3 && !hostname.includes('vercel.app') && !['www', 'dashboard', 'admin', 'api'].includes(parts[0])
    const isLocalhostSubdomain = hostname.includes('localhost') && parts.length >= 2 && parts[0] !== 'localhost'
    const isRootStorefront = isSubdomain || isLocalhostSubdomain

    const manifestLink = document.createElement('link')
    manifestLink.id = 'dynamic-store-manifest'
    manifestLink.rel = 'manifest'
    manifestLink.href = `/api/store-manifest?slug=${encodeURIComponent(storeSlug)}${isRootStorefront ? '&subdomain=1' : ''}`
    document.head.appendChild(manifestLink)

  }, [store?.name, store?.description, store?.logo_url, store?.slug, slug])

  useEffect(() => {
    if (!store) return
    console.log("🎨 SAR3E Theme Loader - Colors from Database:", {
      primary: store.primary_color,
      accent: store.accent_color,
      selected_theme: store.selected_theme
    })
    const theme = store.selected_theme || 'neon'
    const root = document.documentElement

    const pColor = theme === 'luxury' ? '#d4af37' : (store.primary_color || '#8B5CF6')
    const aColor = theme === 'luxury' ? '#f59e0b' : (store.accent_color || '#10B981')
    root.style.setProperty('--clr-primary', pColor)
    root.style.setProperty('--clr-accent', aColor)
    root.style.setProperty('--clr-primary-glow', pColor + '40')
    root.style.setProperty('--clr-accent-glow', aColor + '40')

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
      root.style.removeProperty('--clr-primary-glow')
      root.style.removeProperty('--clr-accent-glow')
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
  const cartPulseClass = cartCount % 2 === 0 ? 'cartPulseEvenClass' : 'cartPulseOddClass'
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

  // Extract free shipping limit threshold from store options
  const freeShippingLimitObj = useMemo(() => {
    return store?.shipping_options?.find(o => o.name === '__free_shipping_threshold__')
  }, [store?.shipping_options])

  const freeShippingLimit = freeShippingLimitObj ? parseFloat(freeShippingLimitObj.cost) : null
  const isFreeShippingEligible = freeShippingLimit !== null && cartTotal >= freeShippingLimit

  const finalTotal = useMemo(() => {
    const shippingCost = isFreeShippingEligible ? 0 : (selectedShippingZone?.cost || 0)
    return Math.max(0, cartTotal - discountAmount + shippingCost)
  }, [cartTotal, discountAmount, selectedShippingZone, isFreeShippingEligible])

  // Celebrate Free Shipping Milestone
  const [celebratedFreeShipping, setCelebratedFreeShipping] = useState(false)
  useEffect(() => {
    if (isFreeShippingEligible) {
      if (!celebratedFreeShipping) {
        triggerConfetti()
        playAudioChime()
        toast.success('🚚 مبروك! حصلت على توصيل مجاني!', {
          icon: '🎉',
          duration: 3500,
          style: {
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff',
            fontWeight: 'bold',
            border: '1px solid #34D399',
            boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
          }
        })
        setCelebratedFreeShipping(true)
      }
    } else {
      setCelebratedFreeShipping(false)
    }
  }, [isFreeShippingEligible, celebratedFreeShipping])

  const deferredSearch = useDeferredValue(search)

  const filteredProducts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return products
      .filter((p) => {
        const inCat = activeCategory === 'all' || p.category_id === activeCategory
        const inSearch = !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        return inCat && inSearch
      })
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at) - new Date(b.created_at))
  }, [products, activeCategory, deferredSearch])

  if (!store) {
    if (storeLoading) return <CompactSkeleton logoUrl={null} storeName="" />
    return <StoreNotFound />
  }

  // ── فحص انتهاء الاشتراك ──────────────────────────────────────
  const isExpired = (() => {
    if (!store.is_active) return true
    if (store.subscription_status === 'expired') return true
    if (store.subscription_status === 'trial') {
      const trialEnd = store.trial_ends_at ? new Date(store.trial_ends_at) : null
      if (trialEnd && new Date() > trialEnd) return true
    }
    return false
  })()

  if (isExpired) return <StoreExpired storeName={store.name} />

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--clr-bg)', paddingBottom: cartCount > 0 ? 150 : 90 }}>
      {/* Global persistent style block for keyframe animations to prevent browser re-render bugs */}
      <style>{`
        .image-fly-to-cart {
          animation: imageFlyAnim 0.65s cubic-bezier(0.25, 1, 0.50, 1) forwards;
        }
        @keyframes imageFlyAnim {
          0% {
            transform: scale(1) translate(0, 0);
            opacity: 1;
          }
          40% {
            transform: scale(0.6) translate(-100px, -80px);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.01) translate(-280px, -450px);
            opacity: 0;
          }
        }
      `}</style>

      {/* Background interaction lock container to absorb Ghost Clicks and prevent click-throughs on the storefront */}
      <div style={{ pointerEvents: selectedProduct ? 'none' : 'auto' }}>
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
          {/* Back button styled clearly */}
          <button
            onClick={handleManualBack}
            title="رجوع"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--glass-bg-2)',
              border: '1px solid var(--clr-border)',
              color: 'var(--clr-text)', cursor: 'pointer',
              transition: 'transform 0.1s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            id="cust-back-btn"
          >
            <ArrowRight size={18} />
          </button>
          <div style={{
            width: 1, height: 20, background: 'var(--clr-border)', flexShrink: 0,
          }} />
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
            {isStoreOpen ? (
              <span style={{ fontSize: 10, color: 'var(--clr-accent)', fontWeight: 700 }}>مفتوح للطلب 🟢</span>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--clr-danger)', fontWeight: 700 }}>مغلق الآن 🔴</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, minHeight: 34 }}
            onClick={() => setSearchOpen(!searchOpen)}
            id="cust-toggle-search"
            title="بحث"
          >
            <Search size={18} />
          </button>

          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: 6, minHeight: 34 }}
            onClick={handleShareStore}
            id="cust-share-store"
            title="مشاركة المتجر"
          >
            <Share2 size={18} />
          </button>
          
          <ThemeToggle />
        </div>
      </header>

      {/* ── Store Banner (if configured) ── */}
      {store.banner_url && (
        <div style={{ width: '100%', maxHeight: 160, overflow: 'hidden' }}>
          <img
            src={store.banner_url}
            alt={`${store.name} banner`}
            style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

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
              {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Ultra-Compact 2-Column Mobile Product Grid ── */}
      <div style={{ padding: '4px 12px' }}>
        {(productsLoading && filteredProducts.length === 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass empty-state" style={{ padding: '32px 16px' }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.4 }}>🔍</div>
            <div className="empty-state-title" style={{ fontSize: 14 }}>لا توجد منتجات</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', alignContent: 'start', alignItems: 'start', gap: 8 }}>
            {filteredProducts.map((product, idx) => {
              const qtyInCart = items
                .filter(item => item.product.id === product.id)
                .reduce((sum, item) => sum + item.quantity, 0)
              
              return (
                <CompactProductCard
                  key={product.id}
                  product={product}
                  currency={currency}
                  badge={product.badge || (idx === 0 ? '🔥 الأكثر طلباً' : null)}
                  qtyInCart={qtyInCart}
                  onPreviewImage={setPreviewImage}
                  onAdd={() => {
                    let opts = product.options
                    if (typeof opts === 'string') {
                      try { opts = JSON.parse(opts) } catch { opts = [] }
                    }
                    if (Array.isArray(opts) && opts.length > 0) {
                      setSelectedProduct(product)
                    } else {
                      addItem(product)
                      playAudioPop()
                      toast.success(`أضيف للسلة 🛒`, { duration: 1000 })
                    }
                  }}
                />
              )
            })}
          </div>
        )}
      </div>


      </div>

      {/* ── Product Options Sheet ── */}
      {selectedProduct && (
        <ProductOptionsSheet
          key={`${selectedProduct.id}-${items.length}`}
          product={selectedProduct}
          currency={currency}
          onClose={() => setSelectedProduct(null)}
          onPreviewImage={setPreviewImage}
          onAdd={(opts, qty) => {
            addItem(selectedProduct, opts, qty)
            playAudioPop()
            toast.success('أضيف للسلة 🛒', { duration: 1000 })
            setSelectedProduct(null)
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
          freeShippingLimit={freeShippingLimit}
          isFreeShippingEligible={isFreeShippingEligible}
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setOrderOpen(true) }}
          onOpenSpinWheel={() => setSpinWheelOpen(true)}
        />
      )}

      {/* ── Image Lightbox Full-Screen Preview ── */}
      {previewImage && (
        <ImageLightboxModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* ── Spin Wheel Modal ── */}
      {spinWheelOpen && (
        <SpinWheelModal
          store={store}
          onClose={() => setSpinWheelOpen(false)}
          onApplyCoupon={(code) => {
            setCouponCode(code)
            setCartOpen(true)
            toast.success(`✅ تم تعبئة كود الخصم (${code})، اضغط تطبيق بالسلة!`)
          }}
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
          triggerConfetti={triggerConfetti}
          isFreeShippingEligible={isFreeShippingEligible}
          onSuccess={handleOrderSuccess}
        />
      )}

      {/* ── Previous Orders Sheet ── */}
      {myOrdersOpen && (
        <MyOrdersSheet
          store={store}
          currency={currency}
          onClose={() => setMyOrdersOpen(false)}
          onTrackOrder={(order) => { setMyOrdersOpen(false); setTrackedOrder(order) }}
        />
      )}

      {/* ── Live Order Tracker Modal ── */}
      {trackedOrder && (
        <OrderTrackerModal
          store={store}
          order={trackedOrder}
          onClose={() => setTrackedOrder(null)}
        />
      )}

      {/* ── Spin Wheel Modal ── */}
      {spinWheelOpen && (
        <SpinWheelModal
          store={store}
          onClose={() => setSpinWheelOpen(false)}
          onWinCoupon={(coupon) => {
            setAppliedCoupon(coupon)
            setCouponCode(coupon.code)
          }}
        />
      )}

      {/* ── Image Preview Lightbox ── */}
      {previewImage && (
        <ImageLightboxModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* ── Review Sheet ── */}
      {reviewOpen && (
        <ReviewSheet
          store={store}
          product={reviewOpen}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {/* Hide all floating bars when any modal/sheet (selectedProduct, cartOpen, orderOpen, etc.) is open */}
      {!selectedProduct && !cartOpen && !orderOpen && !myOrdersOpen && !trackedOrder && !reviewOpen && (
        <>
          {/* ── Mobile Floating Quick Cart Bar ── */}
          {cartCount > 0 && (
            <div
              className="mobile-quick-cart-bar touch-scale"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setCartOpen(true)
              }}
              role="button"
              tabIndex={0}
              id="mobile-quick-cart-bar-btn"
              style={{
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 100000,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.25)',
                  padding: '4px 10px', borderRadius: 12,
                  fontWeight: 900, fontSize: 13, pointerEvents: 'none'
                }}>
                  {cartCount} {cartCount === 1 ? 'عنصر' : 'عناصر'}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>سلة التسوق</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 14, pointerEvents: 'none' }}>
                <span style={{ pointerEvents: 'none' }}>{formatPrice(cartTotal)} {currency}</span>
                <span style={{ pointerEvents: 'none' }}>←</span>
              </div>
            </div>
          )}

          {/* ── Mobile Floating Bottom Navigation ── */}
          <nav className="mobile-bottom-nav">
            <button
              className={`mobile-bottom-nav-item ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setActiveCategory('all')
              }}
            >
              <span className="mobile-bottom-nav-item-icon">🏠</span>
              <span>الرئيسية</span>
            </button>

            <button
              className="mobile-bottom-nav-item"
              onClick={() => setCartOpen(true)}
              style={{ position: 'relative' }}
            >
              <span className="mobile-bottom-nav-item-icon">🛒</span>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: '22%',
                  background: 'var(--clr-accent, #10b981)', color: '#fff',
                  fontSize: 9, fontWeight: 900, borderRadius: 10,
                  padding: '1px 5px', minWidth: 16, textAlign: 'center'
                }}>
                  {cartCount}
                </span>
              )}
              <span>السلة</span>
            </button>

            <button
              className="mobile-bottom-nav-item"
              onClick={() => setMyOrdersOpen(true)}
            >
              <span className="mobile-bottom-nav-item-icon">📋</span>
              <span>طلباتي</span>
            </button>
          </nav>
        </>
      )}
    </div>
  )
}

/* ── Star Rating Display Helper ── */
const StarRating = memo(function StarRating({ rating, count, size = 11 }) {
  if (!rating) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#f59e0b' : 'var(--clr-border)' }}>★</span>
      ))}
      <span style={{ fontSize: size - 1, color: 'var(--clr-text-3)', marginRight: 2 }}>({count})</span>
    </div>
  )
})

/* ── Ultra-Compact Product Card Component ── */
const CompactProductCard = memo(function CompactProductCard({ product, currency, badge, onAdd, rating, qtyInCart, onPreviewImage }) {
  const isInCart = qtyInCart > 0
  const badgeAnimClass = qtyInCart % 2 === 0 ? 'badgePulseEvenClass' : 'badgePulseOddClass'

  return (
    <div className="glass" style={{
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      position: 'relative', 
      border: isInCart ? '1px solid var(--clr-primary)' : '1px solid var(--clr-border)',
      boxShadow: isInCart ? '0 0 10px var(--clr-primary-glow)' : 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isInCart ? 'scale(1.01)' : 'scale(1)',
    }}>
      {/* Dynamic Cart Count Badge */}
      {isInCart && (
        <span className={badgeAnimClass} style={{
          position: 'absolute', top: 6, left: 6, zIndex: 10,
          background: 'var(--clr-primary)', color: '#fff',
          fontSize: 10, fontWeight: 900, width: 22, height: 22,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px var(--clr-primary-glow)',
        }}>
          {qtyInCart}
        </span>
      )}

      {/* CSS Animation for badge and card pop */}
      <style>{`
        .badgePulseEvenClass {
          animation: badgePulseEven 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .badgePulseOddClass {
          animation: badgePulseOdd 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .cartPulseEvenClass {
          animation: cartPulseEven 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .cartPulseOddClass {
          animation: cartPulseOdd 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes badgePulseEven {
          0% { transform: scale(1); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        @keyframes badgePulseOdd {
          0% { transform: scale(1); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        @keyframes cartPulseEven {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes cartPulseOdd {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes cardPress {
          0% { transform: scale(1); }
          50% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        @keyframes buttonConfirmBounce {
          0% { transform: scale(1); }
          30% { transform: scale(0.9); }
          65% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Badge */}
      {badge && product.is_available && (
        <span style={{
          position: 'absolute', top: 6, right: 6, zIndex: 10,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
          color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
        }}>
          {badge}
        </span>
      )}

      {/* Image with Click to Zoom Lightbox */}
      <div
        style={{ width: '100%', aspectRatio: '1/1', background: 'var(--glass-bg-2)', position: 'relative', overflow: 'hidden', cursor: product.image_url ? 'zoom-in' : 'default' }}
        onClick={(e) => {
          if (product.image_url && onPreviewImage) {
            e.stopPropagation()
            onPreviewImage({ url: product.image_url, title: product.name })
          }
        }}
      >
        {product.image_url ? (
          <img
            src={optimizeImageUrl(product.image_url, 360, 80)}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
            decoding="async"
          />
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

        {/* Star Rating */}
        {rating && <StarRating rating={rating.avg} count={rating.count} />}

        {/* Price & Compact Add Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--clr-accent)' }}>
            {formatPrice(product.price)} <span style={{ fontSize: 9 }}>{currency}</span>
          </div>

          {product.is_available && (
            <button
              onClick={(e) => {
                e.currentTarget.style.animation = 'cardPress 0.2s ease-in-out';
                setTimeout(() => { if(e.currentTarget) e.currentTarget.style.animation = '' }, 200);
                onAdd();
              }}
              id={`add-btn-${product.id}`}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: isInCart 
                  ? 'var(--clr-primary)' 
                  : 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: isInCart ? '0 2px 8px var(--clr-primary-glow)' : '0 2px 8px var(--clr-primary-glow)',
                transition: 'all 0.2s ease',
              }}
            >
              {isInCart ? <Check size={16} /> : <Plus size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

/* ── Review Submission Sheet ── */
function ReviewSheet({ store, product, onClose }) {
  const { submitReview } = useReviewsStore()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [name, setName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fawri-customer-info') || '{}').name || '' } catch { return '' }
  })
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!rating) { toast.error('يرجى اختيار عدد النجوم'); return }
    if (!name.trim()) { toast.error('يرجى كتابة اسمك'); return }
    setSubmitting(true)
    try {
      await submitReview({
        storeId: store.id,
        productId: product?.id || null,
        customerName: name.trim(),
        rating,
        comment: comment.trim(),
      })
      setDone(true)
      toast.success('شكراً على تقييمك! 🌟')
    } catch {
      toast.error('تعذّر إرسال التقييم')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet title="قيّم تجربتك ⭐" onClose={onClose}>
      {done ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌟</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>شكراً على تقييمك!</div>
          <div style={{ fontSize: 13, color: 'var(--clr-text-3)' }}>رأيك يهمنا ويساعدنا على التحسين لك ولجميع زبائننا.</div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>إغلاق</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {product && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--glass-bg-2)', borderRadius: 10 }}>
              {product.image_url && <img src={product.image_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} />}
              <div style={{ fontWeight: 700, fontSize: 13 }}>{product.name}</div>
            </div>
          )}

          {/* Star Picker */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginBottom: 8 }}>انقر على النجوم للتقييم</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1,2,3,4,5].map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  style={{
                    fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: s <= (hovered || rating) ? '#f59e0b' : 'var(--clr-border)',
                    transform: s <= (hovered || rating) ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }}
                >★</button>
              ))}
            </div>
            {rating > 0 && (
              <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginTop: 4 }}>
                {['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'رائع! أحسنت الاختيار ❤️'][rating]}
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">اسمك *</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="محمد أحمد"
              style={{ minHeight: 38, fontSize: 13 }}
            />
          </div>

          <div className="input-group">
            <label className="input-label">تعليقك (اختياري)</label>
            <textarea
              className="input"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="شاركنا رأيك بالتفصيل..."
              rows={3}
              style={{ fontSize: 13 }}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleSubmit}
            disabled={submitting || !rating}
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال التقييم ⭐'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}


/* ── Product Options Sheet ── */
function ProductOptionsSheet({ product, currency, onClose, onAdd, onPreviewImage }) {
  const optionsList = useMemo(() => {
    if (!product?.options) return []
    let opts = product.options
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts) } catch { return [] }
    }
    if (!Array.isArray(opts) || opts.length === 0) return []
    // Normalize: flat string array ['S','M'] → [{label:'الخيار', values:['S','M']}]
    if (typeof opts[0] === 'string') {
      return [{ label: 'الخيار', required: true, values: opts.map(v => ({ name: v, price: 0, image_url: '' })) }]
    }
    // Already [{label, values}] format
    return opts.map(o => ({
      label: o.label || 'الخيار',
      required: o.required !== undefined ? !!o.required : true,
      values: Array.isArray(o.values)
        ? o.values.map(v => typeof v === 'string' ? { name: v, price: 0, image_url: '' } : { name: v.name || '', price: Number(v.price || 0), image_url: v.image_url || '' })
        : []
    }))
  }, [product?.options])

  const [selected, setSelected] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const allSelected = optionsList.length === 0 || optionsList.every((opt) => !opt.required || selected[opt.label])

  const currentTotalPrice = useMemo(() => {
    const base = parseFloat(product.price) || 0
    const extra = Object.values(selected).reduce((sum, opt) => sum + Number(opt.price || 0), 0)
    return base + extra
  }, [product.price, selected])

  // ── Dynamic Multi-image gallery state incorporating selected option images ──
  const baseImages = useMemo(() => {
    const imgs = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.image_url ? [product.image_url] : [])
    return imgs
  }, [product.images, product.image_url])

  // Combine product base images and any images attached to currently selected options
  const images = useMemo(() => {
    const combined = [...baseImages]
    Object.values(selected).forEach(val => {
      if (val.image_url && !combined.includes(val.image_url)) {
        combined.push(val.image_url)
      }
    })
    return combined
  }, [baseImages, selected])

  const [activeImg, setActiveImg] = useState(0)

  // Reset active image to 0 if the currently displayed image is removed (deselected)
  useEffect(() => {
    if (activeImg >= images.length || !images[activeImg]) {
      setActiveImg(0)
    }
  }, [images, activeImg])

  const imgStartX = useRef(null)

  const handleImgTouchStart = (e) => { imgStartX.current = e.touches[0].clientX }
  const handleImgTouchEnd = (e) => {
    if (imgStartX.current === null) return
    const diff = imgStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) setActiveImg(i => Math.min(i + 1, images.length - 1))
      else setActiveImg(i => Math.max(i - 1, 0))
    }
    imgStartX.current = null
  }

  // Shift gallery to option image when clicked
  const handleSelectOption = (optLabel, val) => {
    setSelected((s) => {
      const isDeselected = s[optLabel]?.name === val.name
      const newSelected = { ...s }
      if (isDeselected) {
        delete newSelected[optLabel]
      } else {
        newSelected[optLabel] = val
      }
      return newSelected
    })

    // If option has an image and is being selected, switch active gallery image
    if (val.image_url && selected[optLabel]?.name !== val.name) {
      // Find or predict index of this image in the upcoming images array
      const combinedList = [...baseImages]
      // Add existing selection images except this option label
      Object.entries(selected).forEach(([k, v]) => {
        if (k !== optLabel && v.image_url && !combinedList.includes(v.image_url)) {
          combinedList.push(v.image_url)
        }
      })
      if (!combinedList.includes(val.image_url)) {
        combinedList.push(val.image_url)
      }
      const idx = combinedList.indexOf(val.image_url)
      if (idx !== -1) {
        // Delay slightly to allow memoized images state to update
        setTimeout(() => setActiveImg(idx), 50)
      }
    }
  }

  const handleConfirmAdd = (e) => {
    if (e) e.stopPropagation()
    setAdded(true)
    onAdd(selected, quantity)
  }

  return (
    <BottomSheet title={product.name} onClose={onClose}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Multi-Image Swiper */}
        {images.length > 0 && (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', userSelect: 'none' }}>
            {product.badge && (
              <span style={{
                position: 'absolute', top: 10, right: 10, zIndex: 10,
                background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}>
                {product.badge}
              </span>
            )}
            <img
              src={images[activeImg]}
              alt={product.name}
              className={added ? 'image-fly-to-cart' : ''}
              onClick={() => onPreviewImage && onPreviewImage({ url: images[activeImg], title: product.name })}
              style={{ 
                width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block', borderRadius: 12,
                transition: 'all 0.3s ease', cursor: 'zoom-in'
              }}
              onTouchStart={handleImgTouchStart}
              onTouchEnd={handleImgTouchEnd}
            />
            {/* Dots */}
            {images.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 5,
              }}>
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    style={{
                      width: idx === activeImg ? 18 : 6, height: 6, borderRadius: 3,
                      background: idx === activeImg ? '#fff' : 'rgba(255,255,255,0.5)',
                      border: 'none', padding: 0, cursor: 'pointer',
                      transition: 'all 0.25s',
                    }}
                  />
                ))}
              </div>
            )}
            {/* Navigation arrows for non-touch */}
            {images.length > 1 && (
              <>
                <button onClick={() => setActiveImg(i => Math.max(i - 1, 0))} style={{
                  position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, color: '#fff', fontSize: 14, cursor: 'pointer',
                  display: activeImg > 0 ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                }}>›</button>
                <button onClick={() => setActiveImg(i => Math.min(i + 1, images.length - 1))} style={{
                  position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, color: '#fff', fontSize: 14, cursor: 'pointer',
                  display: activeImg < images.length - 1 ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                }}>‹</button>
              </>
            )}
          </div>
        )}

        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--clr-accent)' }}>
          {formatPrice(currentTotalPrice)} {currency}
        </div>

        {optionsList.map((opt) => (
          <div key={opt.label}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {opt.label} 
                <span style={{ fontSize: 10, color: opt.required ? 'var(--clr-accent)' : 'var(--clr-text-muted)', marginRight: 6 }}>
                  {opt.required ? '(إجباري)' : '(اختياري)'}
                </span>
              </div>
              {selected[opt.label] && <span style={{ color: 'var(--clr-primary)' }}>— {selected[opt.label].name}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {opt.values?.map((val) => (
                <button
                  key={val.name}
                  type="button"
                  className={`category-chip ${selected[opt.label]?.name === val.name ? 'active' : ''}`}
                  style={{ padding: '6px 14px', minHeight: 34, fontSize: 12, fontWeight: 700 }}
                  onClick={() => handleSelectOption(opt.label, val)}
                >
                  {val.name}
                  {val.price > 0 && ` (+${val.price} ${currency})`}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Dynamic Quantity Selector & Add Button Row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          {/* Quantity selector inside options sheet */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 12, 
            background: 'var(--glass-bg-2)', padding: '6px 12px', 
            borderRadius: 12, border: '1px solid var(--clr-border)',
            minHeight: 46
          }}>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              style={{ padding: '2px 8px', minHeight: 28, fontSize: 16, fontWeight: 900 }} 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={added}
            >
              −
            </button>
            <span style={{ fontWeight: 800, fontSize: 15, minWidth: 20, textAlign: 'center', color: 'var(--clr-text)' }}>
              {quantity}
            </span>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              style={{ padding: '2px 8px', minHeight: 28, fontSize: 16, fontWeight: 900 }} 
              onClick={() => setQuantity(q => q + 1)}
              disabled={added}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={`btn btn-full btn-lg ${added ? 'btn-success' : 'btn-primary'} animate-glow`}
            onClick={handleConfirmAdd}
            disabled={!allSelected}
            style={{ 
              flex: 1,
              background: added ? '#10B981' : undefined,
              borderColor: added ? '#10B981' : undefined,
              color: '#fff',
              animation: added ? 'buttonConfirmBounce 0.4s ease-in-out' : undefined,
              transition: 'all 0.3s ease',
              minHeight: 46,
            }}
          >
            {added ? '🎉 تمت الإضافة للسلة!' : allSelected ? `إضافة للسلة (${formatPrice(currentTotalPrice * quantity)} ${currency})` : 'اختر الخيارات أولاً'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}


/* ── Cart Drawer ── */
function CartDrawer({
  store, items, currency, cartTotal,
  couponCode, setCouponCode, appliedCoupon, setAppliedCoupon,
  discountAmount, finalTotal, freeShippingLimit, isFreeShippingEligible, onClose, onCheckout, onOpenSpinWheel
}) {
  const { addItem, updateQty, removeItem } = useCartStore()
  const { products } = useProductsStore()
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const inCartIds = new Set(items.map((i) => i.product.id))
  const recommendations = products
    .filter((p) => !inCartIds.has(p.id) && p.is_active !== false)
    .slice(0, 3)

  const playPopSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.1)
    } catch {}
  }

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

  // Calculate free shipping progress details
  const percent = freeShippingLimit ? Math.min((cartTotal / freeShippingLimit) * 100, 100) : 0
  const remaining = freeShippingLimit ? Math.max(0, freeShippingLimit - cartTotal) : 0

  return (
    <BottomSheet title="سلة التسوق 🛒" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🛒</div>
            <div className="empty-state-title" style={{ fontSize: 15, fontWeight: 700 }}>سلة التسوق فارغة</div>
            <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 4 }}>تصفح المنتجات وأضف ما يعجبك للسلة</div>
          </div>
        ) : (
          <>
            {/* Free Shipping Progress Indicator */}
            {freeShippingLimit !== null && (
              <div
                className={`glass ${isFreeShippingEligible ? 'free-shipping-container-celebrate' : ''}`}
                style={{
                  padding: '10px 14px', borderRadius: 14, border: '1px solid var(--clr-border)',
                  background: 'var(--glass-bg-2)', display: 'flex', flexDirection: 'column', gap: 6,
                  transition: 'all 0.3s ease',
                }}
              >
                <style>{`
                  @keyframes celebratePulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    50% { transform: scale(1.02); box-shadow: 0 0 15px 4px rgba(16, 185, 129, 0.6); border-color: #10B981 !important; }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                  }
                  @keyframes shinyGreen {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  .free-shipping-container-celebrate {
                    animation: celebratePulse 2s infinite ease-in-out;
                    border-color: #10B981 !important;
                  }
                  .free-shipping-bar-celebrate {
                    background: linear-gradient(270deg, #10B981, #34D399, #059669, #10B981) !important;
                    background-size: 400% 400% !important;
                    animation: shinyGreen 3s infinite ease-in-out !important;
                  }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                  {isFreeShippingEligible ? (
                    <span style={{ color: 'var(--clr-accent)', fontWeight: 800 }}>🎉 مبروك! لقد حصلت على توصيل مجاني!</span>
                  ) : (
                    <span>يتبقى لك <strong style={{ color: 'var(--clr-primary)' }}>{formatPrice(remaining)} {currency}</strong> للحصول على شحن مجاني 🚚</span>
                  )}
                  <span style={{ color: 'var(--clr-primary)', fontWeight: 900 }}>{percent.toFixed(0)}%</span>
                </div>
                {/* Progress bar track */}
                <div style={{ width: '100%', height: 7, background: 'var(--clr-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    className={isFreeShippingEligible ? 'free-shipping-bar-celebrate' : ''}
                    style={{
                      width: `${percent}%`, height: '100%',
                      background: isFreeShippingEligible
                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                        : 'linear-gradient(90deg, var(--clr-primary), var(--clr-accent))',
                      borderRadius: 4, transition: 'width 0.4s ease-out'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '42dvh', overflowY: 'auto', paddingLeft: 2, paddingRight: 2 }}>
              {items.map((item) => {
                // Find if any selected option has a custom image_url
                const optionWithImage = Object.values(item.selectedOptions || {}).find(opt => opt.image_url)
                const displayImage = optionWithImage ? optionWithImage.image_url : item.product.image_url
                const itemPrice = (Number(item.product.price) + Object.values(item.selectedOptions || {}).reduce((s, opt) => s + Number(opt.price || 0), 0)) * item.quantity

                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'center',
                      padding: 10, background: 'var(--glass-bg-2)',
                      borderRadius: 14, border: '1px solid var(--clr-border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    {/* Item Thumbnail */}
                    {displayImage ? (
                      <img src={displayImage} alt={item.product.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: '1px solid var(--clr-border)' }} />
                    ) : (
                      <div style={{ width: 52, height: 52, background: 'var(--clr-bg-surface)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📦</div>
                    )}

                    {/* Title & Options */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--clr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product.name}
                      </div>

                      {/* Options Tags */}
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {Object.entries(item.selectedOptions).map(([label, val]) => {
                            const isGenericLabel = !label || label === 'الخيارات المحددة' || label === 'الخيارات' || label === 'الخيار' || label === 'option' || label === 'options'
                            const valText = typeof val === 'object' ? (val.name || '') : String(val)
                            const priceText = typeof val === 'object' && val.price > 0 ? ` (+${val.price} ${currency})` : ''
                            const textToShow = isGenericLabel ? `${valText}${priceText}` : `${label}: ${valText}${priceText}`

                            return (
                              <span
                                key={label}
                                style={{
                                  background: 'rgba(255,255,255,0.08)',
                                  color: 'var(--clr-text-2)',
                                  fontSize: 10, fontWeight: 600,
                                  padding: '2px 7px', borderRadius: 6,
                                  border: '1px solid var(--clr-border)'
                                }}
                              >
                                {textToShow}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      <div style={{ fontWeight: 900, color: 'var(--clr-accent)', fontSize: 13, marginTop: 2 }}>
                        {formatPrice(itemPrice)} {currency}
                      </div>
                    </div>

                    {/* Quantity Control Pill */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'rgba(0,0,0,0.12)',
                      padding: '3px 5px', borderRadius: 10, border: '1px solid var(--clr-border)'
                    }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: 24, height: 24, padding: 0, minHeight: 0, fontSize: 14, fontWeight: 900, borderRadius: 6 }}
                        onClick={() => updateQty(item.key, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span style={{ fontWeight: 900, fontSize: 12, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: 24, height: 24, padding: 0, minHeight: 0, fontSize: 14, fontWeight: 900, borderRadius: 6 }}
                        onClick={() => updateQty(item.key, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    {/* Delete Icon Button */}
                    <button
                      onClick={() => removeItem(item.key)}
                      title="حذف من السلة"
                      style={{
                        color: 'var(--clr-danger, #ef4444)',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: 'none', borderRadius: 8, width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0, transition: 'transform 0.15s ease'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Recommendations / Upsell Carousel */}
            {recommendations.length > 0 && (
              <div style={{
                marginTop: 4, padding: '10px 0 2px', borderTop: '1px solid var(--clr-border)',
                direction: 'rtl'
              }}>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, color: 'var(--clr-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} style={{ color: '#f59e0b' }} />
                  <span>قد يعجبك أيضاً ✨</span>
                </div>
                <div style={{
                  display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6,
                  scrollbarWidth: 'none', msOverflowStyle: 'none'
                }}>
                  {recommendations.map((prod) => (
                    <div
                      key={prod.id}
                      style={{
                        flex: '0 0 130px', background: 'var(--glass-bg-2)', borderRadius: 12,
                        border: '1px solid var(--clr-border)', padding: 8,
                        display: 'flex', flexDirection: 'column', gap: 6, position: 'relative'
                      }}
                    >
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 8 }} />
                      ) : (
                        <div style={{ width: '100%', height: 72, background: 'var(--clr-bg-surface)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                          📦
                        </div>
                      )}
                      <div style={{
                        fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: 'var(--clr-text)'
                      }}>
                        {prod.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--clr-accent)' }}>
                          {formatPrice(prod.price)} {currency}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            addItem(prod)
                            playPopSound()
                            toast.success(`➕ تم إضافة ${prod.name}`, { duration: 1200 })
                          }}
                          style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                            color: '#fff', border: 'none', fontSize: 11, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon Code Section */}
            {store?.enable_coupons !== false && (
              <div style={{ padding: '8px 0', borderTop: '1px solid var(--clr-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ minHeight: 36, fontSize: 11, flex: 1, borderRadius: 10 }}
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
                    style={{ minHeight: 36, fontSize: 11, padding: '0 14px', borderRadius: 10 }}
                    onClick={handleApplyCoupon}
                    disabled={checkingCoupon}
                  >
                    {checkingCoupon ? 'جاري الفحص...' : 'تطبيق'}
                  </button>
                )}
              </div>
            )}

            {/* Spin Wheel Promo Banner in Cart */}
            {store?.enable_spin_wheel === true && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(16, 185, 129, 0.12))',
                border: '1px solid var(--clr-primary)', borderRadius: 12, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                marginTop: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24, animation: 'bounce 2s infinite' }}>🎡</div>
                  <div>
                    {cartTotal >= (store.wheel_min_amount || 50) ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--clr-text)' }}>
                          مبروك! تأهلت لتدوير عجلة الحظ 🎁
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--clr-accent)', fontWeight: 700 }}>
                          لُفّ العجلة واكسب خصمك الآن!
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--clr-text)' }}>
                          عجلة الجوائز والخصومات 🎡
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--clr-text-3)' }}>
                          يتبقى لك <strong style={{ color: 'var(--clr-primary)' }}>{formatPrice(Math.max(0, (store.wheel_min_amount || 50) - cartTotal))} {currency}</strong> لتأهل لتدوير العجلة
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {cartTotal >= (store.wheel_min_amount || 50) && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      onClose()
                      if (onOpenSpinWheel) onOpenSpinWheel()
                    }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, fontWeight: 900, flexShrink: 0 }}
                  >
                    لَفّ العجلة 🎡
                  </button>
                )}
              </div>
            )}

            {/* Glassmorphic Order Summary Card */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              background: 'var(--glass-bg-2)', padding: 12, borderRadius: 14,
              border: '1px solid var(--clr-border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--clr-text-3)' }}>
                <span>مجموع المنتجات:</span>
                <span style={{ fontWeight: 700 }}>{formatPrice(cartTotal)} {currency}</span>
              </div>
              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--clr-accent)' }}>
                  <span>خصم كوبون ({appliedCoupon.code}):</span>
                  <span style={{ fontWeight: 800 }}>-{formatPrice(discountAmount)} {currency}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--clr-border)', paddingTop: 8, marginTop: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>المجموع الإجمالي:</span>
                <span style={{ fontWeight: 900, fontSize: 17, color: 'var(--clr-accent)' }}>
                  {formatPrice(finalTotal)} {currency}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button className="btn btn-primary btn-full btn-lg animate-glow" onClick={onCheckout} id="cust-cart-checkout" style={{ marginTop: 2, borderRadius: 14 }}>
              <MessageCircle size={18} />
              <span>متابعة الشراء (إتمام الطلب) ⚡</span>
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
  finalTotal, customerInfo, onSaveCustomer, onClose, triggerConfetti, isFreeShippingEligible, onOrderSuccess
}) {
  const { clearCart, setCustomerInfo } = useCartStore()
  const [form, setForm] = useState({
    name: customerInfo?.name || '',
    phone: customerInfo?.phone || '',
    address: customerInfo?.address || '',
    notes: customerInfo?.notes || '',
    maps_link: customerInfo?.maps_link || '',
  })
  const [locating, setLocating] = useState(false)
  const [sending, setSending] = useState(false)
  const [savedOrder, setSavedOrder] = useState(null)   // {id, number, storeId} بعد تأكيد الطلب
  const [notifLoading, setNotifLoading] = useState(false)
  const pushSupported = 'Notification' in window && 'serviceWorker' in navigator

  const handleGetLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('خدمة تحديد الموقع (GPS) غير مدعومة على هذا الجهاز')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
        setForm(f => ({
          ...f,
          maps_link: mapsUrl,
          address: f.address && !f.address.includes('(')
            ? `${f.address} (${lat.toFixed(5)}, ${lng.toFixed(5)})`
            : `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }))
        setLocating(false)
        toast.success('📍 تم تحديد موقعك الجغرافي بنجاح!')
      },
      (err) => {
        setLocating(false)
        console.warn('Geolocation error:', err)
        toast.error('يرجى السماح بصلاحية الموقع في المتصفح لتحديد موقعك تلقائياً')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Default to first shipping option if available and none selected yet (excluding the internal free shipping threshold zone)
  useEffect(() => {
    const opts = (store?.shipping_options || []).filter(o => o.name !== '__free_shipping_threshold__')
    if (opts.length > 0 && !selectedShippingZone) {
      setSelectedShippingZone(opts[0])
    }
  }, [store?.shipping_options])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSend = async () => {
    if (!form.name) { toast.error('يرجى كتابة اسمك'); return }
    setSending(true)

    const info = { name: form.name, phone: form.phone, address: form.address, maps_link: form.maps_link }
    setCustomerInfo(info)
    onSaveCustomer?.(info)

    // Build discount and shipping detail objects (Set shipping cost to 0 if free shipping threshold is active)
    const discountObj = appliedCoupon ? { code: appliedCoupon.code, amount: discountAmount } : null
    
    const actualShippingCost = isFreeShippingEligible ? 0 : (selectedShippingZone ? parseFloat(selectedShippingZone.cost) : 0)
    const shippingObj = selectedShippingZone ? { name: selectedShippingZone.name, cost: actualShippingCost } : null

    // ── تجهيز تفاصيل المنتجات لقاعدة البيانات ──
    const dbItems = items.map(i => {
      const optionStr = Object.entries(i.selectedOptions || {})
        .map(([k, v]) => `${k}: ${v.name || v}${v.price > 0 ? ` (+${v.price} ${currency})` : ''}`)
        .join(' | ')
      const optionExtra = Object.values(i.selectedOptions || {}).reduce((s, opt) => s + Number(opt.price || 0), 0)
      return {
        product: { id: i.product.id, name: i.product.name, price: parseFloat(i.product.price) + optionExtra },
        quantity: i.quantity,
        selectedOptions: optionStr
      }
    })

    // إضافة الخصم كبند خاص في سلة الطلب بقاعدة البيانات
    if (appliedCoupon) {
      dbItems.push({
        product: { id: 'discount', name: `خصم كوبون (${appliedCoupon.code})`, price: -discountAmount },
        quantity: 1,
        isSpecial: true
      })
    }

    // إضافة الشحن كبند خاص في سلة الطلب بقاعدة البيانات
    if (selectedShippingZone) {
      dbItems.push({
        product: { id: 'shipping', name: `رسوم التوصيل (${selectedShippingZone.name})${isFreeShippingEligible ? ' — شحن مجاني 🎁' : ''}`, price: actualShippingCost },
        quantity: 1,
        isSpecial: true
      })
    }

    // ── حفظ الطلب في قاعدة بيانات Supabase ──
    const orderData = {
      store_id: store.id,
      customer_name: form.name,
      customer_phone: form.phone || '',
      customer_address: form.address || '',
      notes: form.notes || '',
      items: dbItems,
      total: finalTotal,
      status: 'new'
    }

    let orderNumber = null
    let orderSaved = null
    try {
      const saved = await useOrdersStore.getState().placeOrder(orderData)
      if (saved && saved.order_number) {
        orderNumber = saved.order_number
        if (saved.id) orderSaved = { id: saved.id, number: saved.order_number, storeId: store.id }
      }
    } catch (err) {
      console.error('Failed to save order to Supabase:', err)
      orderNumber = Math.floor(Math.random() * 9000) + 1000
    }

    const message = buildWhatsAppMessage({
      store,
      items,
      customer: form,
      total: finalTotal,
      discount: discountObj,
      shipping: shippingObj,
      orderNumber
    })

    const whatsappNumber = `${store.country_code || '+970'}${store.whatsapp}`.replace(/[^0-9]/g, '')
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

    // ── حفظ الطلب في localStorage للعميل ──
    const orderRecord = {
      id: orderNumber ? `#${orderNumber}` : `ORD-${Date.now()}`,
      storeId: store.id,
      storeName: store.name,
      date: new Date().toISOString(),
      customer: form,
      items: items.map(i => {
        const optionStr = Object.entries(i.selectedOptions || {})
          .map(([k, v]) => `${k}: ${v.name || v}${v.price > 0 ? ` (+${v.price} ${currency})` : ''}`)
          .join(' | ')
        const optionExtra = Object.values(i.selectedOptions || {}).reduce((s, opt) => s + Number(opt.price || 0), 0)
        return {
          product_id: i.product.id,
          name: i.product.name,
          qty: i.quantity,
          quantity: i.quantity,
          price: Number(i.product.price) + optionExtra,
          option: optionStr,
          selectedOptions: i.selectedOptions || {},
          product: i.product
        }
      }),
      total: finalTotal,
      currency,
    }
    try {
      const key = `fawri-orders-${store.id}`
      const prev = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify([orderRecord, ...prev].slice(0, 30)))
    } catch {}

    // ── تلقائي: تفعيل إشعارات التتبع إذا كان الإذن ممنوحاً مسبقاً ──
    const pushSupported = 'Notification' in window && 'serviceWorker' in navigator
    if (orderSaved && pushSupported && Notification.permission === 'granted') {
      subscribeCustomerToPush(orderSaved.id, orderSaved.storeId, orderSaved.number).catch(() => {})
    }

    // Trigger local confetti explosion!
    if (triggerConfetti) triggerConfetti()

    await new Promise(r => setTimeout(r, 600))
    if (store?.enable_whatsapp_redirect !== false) {
      window.open(url, '_blank')
    }
    clearCart()
    setSending(false)
    onClose()
    toast.success('🎉 تم إرسال طلبك وحفظه في سجل طلباتك!')
    if (onOrderSuccess) {
      const firstItem = items[0]?.product || null
      onOrderSuccess(firstItem)
    }
  }

  // Filter out the free shipping configuration limit option from zone selector dropdown
  const shippingOptions = (store?.shipping_options || []).filter(o => o.name !== '__free_shipping_threshold__')
  const hasSavedInfo = !!(customerInfo?.name)

  return (
    <BottomSheet title="بيانات التوصيل 📍" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── نموذج التوصيل ── */}
        {hasSavedInfo && (
          <div className="glass" style={{
            padding: 10, background: 'var(--clr-primary-glow)',
            border: '1px solid var(--clr-primary)', borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>
              👋 مرحباً بعودتك يا {customerInfo.name}! تم استرجاع بيانات التوصيل تلقائياً.
            </div>
          </div>
        )}

        <div className="input-group">
          <label className="input-label"><User size={12} /> الاسم الكامل *</label>
          <input className="input" style={{ minHeight: 38, fontSize: 13 }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="محمد أحمد" required id="cust-order-name" />
        </div>
        <div className="input-group">
          <label className="input-label"><Phone size={12} /> رقم الهاتف</label>
          <input className="input" style={{ minHeight: 38, fontSize: 13, direction: 'ltr' }} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0599123456" type="tel" id="cust-order-phone" />
        </div>
        <div className="input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="input-label" style={{ margin: 0 }}><MapPin size={12} /> عنوان التوصيل</label>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={handleGetLocation}
              disabled={locating}
              style={{ fontSize: 11, color: 'var(--clr-accent)', gap: 4, padding: '2px 8px', fontWeight: 700 }}
              title="تحديد الموقع عبر GPS"
            >
              {locating ? '📍 جاري التحديد...' : '📍 موقعي الحالي (GPS)'}
            </button>
          </div>
          <input className="input" style={{ minHeight: 38, fontSize: 13 }} value={form.address} onChange={e => set('address', e.target.value)} placeholder="المدينة — الشارع — تفاصيل البناية" id="cust-order-address" />
          {form.maps_link && (
            <div style={{ fontSize: 11, color: 'var(--clr-accent)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span>✅ تم إرفاق إحداثيات GPS:</span>
              <a href={form.maps_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--clr-primary)', fontWeight: 700 }}>
                عرض الموقع 🗺️
              </a>
            </div>
          )}
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
                  {opt.name} {isFreeShippingEligible ? `(مجاني 🎁 بدلاً من +${opt.cost} ${currency})` : `(+${opt.cost} ${currency})`}
                </option>
              ))}
            </select>
            {isFreeShippingEligible && (
              <span style={{ fontSize: 11, color: 'var(--clr-accent)', fontWeight: 700, marginTop: 4 }}>
                🎉 مبروك! طلبك مؤهل للشحن المجاني التلقائي.
              </span>
            )}
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
          إرسال الطلب الآن ({formatPrice(finalTotal)} {currency}) 💬
        </button>
      </div>
    </BottomSheet>
  )
}

function MyOrdersSheet({ store, onClose, onTrack, products = [], onOpenCart }) {
  const { addItem } = useCartStore()
  const { products: storeProducts } = useProductsStore()
  const { cancelOrder } = useOrdersStore()
  const [orders, setOrders] = useState([])
  const [cancelling, setCancelling] = useState(null) // orderId being cancelled

  const catalogProducts = (products && products.length > 0) ? products : storeProducts

  useEffect(() => {
    try {
      const key = `fawri-orders-${store.id}`
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      setOrders(saved)
    } catch {
      setOrders([])
    }
  }, [store.id])

  const handleReorder = (order) => {
    if (!order?.items || order.items.length === 0) {
      toast.error('لا توجد عناصر في هذا الطلب لإعادتها')
      return
    }

    let addedCount = 0

    order.items.forEach(item => {
      // 1. Try to find the original product in the active catalog
      const cleanItemName = (item.name || '').trim().toLowerCase()
      const foundProduct = catalogProducts.find(p => {
        if (!p) return false
        if (item.product_id && p.id === item.product_id) return true
        if (item.product && item.product.id && p.id === item.product.id) return true
        const pName = (p.name || '').trim().toLowerCase()
        if (pName && cleanItemName && (pName === cleanItemName || cleanItemName.includes(pName) || pName.includes(cleanItemName))) return true
        return false
      })

      // 2. Parse quantity safely
      const quantity = Math.max(1, parseInt(item.quantity || item.qty || 1, 10))

      // 3. Parse options safely
      let selectedOpts = {}
      if (item.selectedOptions && typeof item.selectedOptions === 'object' && Object.keys(item.selectedOptions).length > 0) {
        selectedOpts = item.selectedOptions
      } else if (item.option && typeof item.option === 'string' && item.option.trim()) {
        selectedOpts = { 'الخيارات المحددة': { name: item.option, price: 0 } }
      }

      if (foundProduct) {
        // Product matched in catalog! Use real catalog product (has image_url, price, description, etc.)
        addItem(foundProduct, selectedOpts, quantity)
        addedCount++
      } else {
        // Fallback for legacy order or deleted product
        const fallbackProduct = item.product || {
          id: item.product_id || `reorder-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: item.name || 'منتج غير معرف',
          price: Number(item.price) || 0,
          image_url: item.image_url || '',
          description: ''
        }
        addItem(fallbackProduct, selectedOpts, quantity)
        addedCount++
      }
    })

    if (addedCount > 0) {
      toast.success('✅ تم نقل جميع عناصر الطلب إلى السلة بنجاح!')
      onClose()
      if (onOpenCart) onOpenCart()
    } else {
      toast.error('تعذّر إعادة إضافة عناصر الطلب')
    }
  }

  const handleCancelOrder = async (order) => {
    if (!confirm(`هل أنت متأكد من إلغاء الطلب ${order.id}؟`)) return
    setCancelling(order.id)
    try {
      const result = await cancelOrder(order.id, store.id)
      if (result.success) {
        // Update localStorage to reflect cancellation
        const key = `fawri-orders-${store.id}`
        const saved = JSON.parse(localStorage.getItem(key) || '[]')
        const updated = saved.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o)
        localStorage.setItem(key, JSON.stringify(updated))
        setOrders(updated)
        toast.success('✅ تم إلغاء الطلب بنجاح')
      } else if (result.reason === 'already_processing') {
        toast.error('❌ لا يمكن الإلغاء — الطلب بدأ التجهيز بالفعل')
      } else {
        toast.error('❌ تعذّر إلغاء الطلب، تواصل مع المتجر مباشرة')
      }
    } catch {
      toast.error('❌ حدث خطأ، حاول مرة أخرى')
    } finally {
      setCancelling(null)
    }
  }

  const handleClearOrders = () => {
    const key = `fawri-orders-${store.id}`
    localStorage.removeItem(key)
    setOrders([])
    toast.success('تم مسح السجل')
  }

  const getOrderStatusBadge = (status) => {
    const map = {
      new: { label: 'جديد', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
      preparing: { label: 'قيد التجهيز', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
      out_for_delivery: { label: 'خرج للتوصيل', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
      done: { label: 'تم التسليم ✅', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      cancelled: { label: 'ملغي ❌', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    }
    return map[status] || map.new
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
          {orders.map((order) => {
            const badge = getOrderStatusBadge(order.status)
            const isCancelled = order.status === 'cancelled'
            const isDone = order.status === 'done'
            const canCancel = !isCancelled && !isDone && order.status !== 'out_for_delivery'
            const isCancellingThis = cancelling === order.id
            return (
              <div key={order.id} className="glass" style={{ borderRadius: 12, padding: 12, opacity: isCancelled ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{order.id}</div>
                    <div style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>
                      {new Date(order.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--clr-accent)' }}>
                      {formatPrice(order.total)} {order.currency}
                    </span>
                    {order.status && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  {!isCancelled && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onTrack(order)}
                      style={{ fontSize: 11, flex: 1, gap: 4 }}
                    >
                      🚚 تتبع الطلب
                    </button>
                  )}
                  {!isCancelled && !isDone && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleReorder(order)}
                      style={{ fontSize: 11, flex: 1 }}
                    >
                      🔄 إعادة طلب
                    </button>
                  )}
                  {canCancel && (
                    <button
                      className="btn btn-sm"
                      onClick={() => handleCancelOrder(order)}
                      disabled={isCancellingThis}
                      style={{
                        fontSize: 11,
                        background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                        flexShrink: 0,
                      }}
                    >
                      {isCancellingThis ? '⏳' : '❌ إلغاء'}
                    </button>
                  )}
                  {isCancelled && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleReorder(order)}
                      style={{ fontSize: 11, flex: 1 }}
                    >
                      🔄 طلب مجدداً
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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

/* ── Live Order Tracker Component ── */
function OrderStatusTracker({ store, order, onClose }) {
  const [status, setStatus] = useState('new')
  const [loading, setLoading] = useState(true)
  const [dbOrder, setDbOrder] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [permission, setPermission] = useState(Notification.permission || 'default')

  // Clean numerical ID if it starts with #
  const orderNumberStr = order.id.replace('#', '')
  const orderNumber = parseInt(orderNumberStr, 10)

  useEffect(() => {
    let active = true

    const fetchInitialStatus = async () => {
      if (isNaN(orderNumber)) {
        setStatus('new')
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status')
          .eq('store_id', store.id)
          .eq('order_number', orderNumber)
          .single()
        if (error) throw error
        if (data && active) {
          setStatus(data.status || 'new')
          setDbOrder(data)
          
          // Check if already subscribed to this order
          const { count } = await supabase
            .from('customer_push_subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('order_id', data.id)
          setSubscribed((count || 0) > 0)
        }
      } catch (err) {
        console.warn('Could not fetch real order status, defaulting:', err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchInitialStatus()

    // ── Live Supabase Realtime Subscription ──
    let channel
    if (!isNaN(orderNumber) && supabase && typeof supabase.channel === 'function') {
      channel = supabase
        .channel(`order-tracker-${orderNumber}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `store_id=eq.${store.id}`,
          },
          (payload) => {
            if (payload.new && payload.new.order_number === orderNumber && active) {
              setStatus(payload.new.status)
              toast.success(`⚡ تحديث حالة الطلب: ${getStatusLabel(payload.new.status)}`)
            }
          }
        )
        .subscribe()
    }

    // ── Local Simulation for Demo Stores/Offline Testing ──
    let demoTimer
    if (store.id.startsWith('demo-store-') || isNaN(orderNumber)) {
      setLoading(false)
      const stages = ['new', 'preparing', 'shipping', 'done']
      let currentStageIdx = 0
      
      demoTimer = setInterval(() => {
        currentStageIdx++
        if (currentStageIdx < stages.length) {
          if (active) {
            setStatus(stages[currentStageIdx])
            toast.success(`⚡ (تحديث تجريبي) حالة الطلب: ${getStatusLabel(stages[currentStageIdx])}`)
          }
        } else {
          clearInterval(demoTimer)
        }
      }, 7000) // Advances order stage every 7 seconds in demo mode
    }

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
      if (demoTimer) clearInterval(demoTimer)
    }
  }, [order.id, store.id, orderNumber])

  const getStatusLabel = (s) => {
    switch (s) {
      case 'new': return 'تم الاستلام 📝'
      case 'preparing': return 'قيد التجهيز 🍳'
      case 'shipping':
      case 'delivering':
      case 'out_for_delivery': return 'جاري التوصيل 🚚'
      case 'completed':
      case 'done': return 'تم التسليم 🎉'
      default: return 'تم الاستلام 📝'
    }
  }

  const stages = [
    { key: 'new', label: 'تم الاستلام', desc: 'تم استلام الطلب وبانتظار الموافقة', icon: '📝' },
    { key: 'preparing', label: 'قيد التجهيز', desc: 'يتم تحضير طلبك الآن في المتجر', icon: '🍳' },
    { key: 'out_for_delivery', label: 'جاري التوصيل', desc: 'طلبك في الطريق مع سائق التوصيل', icon: '🚚' },
    { key: 'done', label: 'تم التسليم', desc: 'استلمت طلبك بنجاح، بالهناء والشفاء!', icon: '🎉' }
  ]

  // Map database status string to stage keys
  const getActiveStageIndex = () => {
    if (status === 'preparing') return 1
    if (status === 'shipping' || status === 'delivering' || status === 'out_for_delivery') return 2
    if (status === 'completed' || status === 'done') return 3
    return 0 // default 'new'
  }

  const activeIdx = getActiveStageIndex()

  return (
    <BottomSheet title={`تتبع الطلب ${order.id} 🚚`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>⏳ جاري تحميل حالة الطلب...</div>
        ) : (
          <>
            {/* Visual Header Summary */}
            <div className="glass" style={{
              padding: 14, borderRadius: 12, textAlign: 'center',
              background: 'var(--glass-bg-2)', border: '1px solid var(--clr-border)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>الحالة الحالية</span>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--clr-accent)', marginTop: 4 }}>
                {getStatusLabel(status)}
              </h3>
              {store.id.startsWith('demo-store-') && (
                <div style={{ fontSize: 10, color: 'var(--clr-text-3)', marginTop: 6 }}>
                  💡 (محاكاة تلقائية نشطة للطلب التجريبي)
                </div>
              )}
            </div>

            {/* ── بنر تفعيل إشعارات التتبع للزبون (غير مزعج واختياري) ── */}
            {dbOrder && permission !== 'denied' && !subscribed && (
              <div className="glass" style={{
                padding: '12px 14px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10,
                background: 'var(--clr-primary-glow)', border: '1px solid var(--clr-primary)',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>🔔</span>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--clr-text)' }}>إشعارات التتبع التلقائية</div>
                    <div style={{ fontSize: 11, color: 'var(--clr-text-3)', marginTop: 2, lineHeight: 1.4 }}>
                      تلقى إشعارات فورية على هذا الجهاز عند تجهيز طلبك أو شحنه
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    setSubscribing(true)
                    try {
                      const res = await Notification.requestPermission()
                      setPermission(res)
                      if (res === 'granted') {
                        await subscribeCustomerToPush(dbOrder.id, store.id, orderNumber)
                        setSubscribed(true)
                        toast.success('🔔 تم تفعيل إشعارات التتبع بنجاح!')
                      } else {
                        toast.error('تم رفض إذن الإشعارات من المتصفح')
                      }
                    } catch (err) {
                      toast.error(err.message || 'تعذّر تفعيل الإشعارات')
                    } finally {
                      setSubscribing(false)
                    }
                  }}
                  disabled={subscribing}
                  style={{ alignSelf: 'flex-end', fontSize: 11, height: 32, minHeight: 32, padding: '0 14px' }}
                >
                  {subscribing ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
                </button>
              </div>
            )}
            
            {subscribed && (
              <div className="glass" style={{
                padding: '10px 14px', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center',
                background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <span style={{ color: 'var(--clr-accent)', fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text)' }}>
                  إشعارات التتبع نشطة على هذا الجهاز 📱
                </span>
              </div>
            )}

            {/* Stepper Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 6px', position: 'relative' }}>
              {/* Connecting line behind icons */}
              <div style={{
                position: 'absolute', right: 23, top: 24, bottom: 24, width: 2,
                background: 'var(--clr-border)', zIndex: 0
              }} />

              {stages.map((stage, idx) => {
                const isPassed = idx <= activeIdx
                const isCurrent = idx === activeIdx
                
                return (
                  <div key={stage.key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', zIndex: 1 }}>
                    {/* Circle Indicator */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isCurrent
                        ? 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))'
                        : isPassed
                          ? 'var(--clr-accent)'
                          : 'var(--clr-bg-surface)',
                      border: isPassed ? 'none' : '2px solid var(--clr-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 12px var(--clr-accent-glow)' : 'none',
                      transition: 'all 0.3s ease',
                    }}>
                      {stage.icon}
                    </div>
                    
                    {/* Label Details */}
                    <div>
                      <h4 style={{
                        fontSize: 13, fontWeight: 800,
                        color: isCurrent ? 'var(--clr-accent)' : isPassed ? 'var(--clr-text)' : 'var(--clr-text-3)'
                      }}>
                        {stage.label}
                      </h4>
                      <p style={{ fontSize: 11, color: 'var(--clr-text-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Close Button */}
            <button className="btn btn-ghost btn-full" onClick={onClose} style={{ marginTop: 6 }}>
              إغلاق
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function StoreNotFound() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'var(--clr-bg)', direction: 'rtl', position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient Orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div className="glass" style={{ maxWidth: 420, width: '100%', padding: '40px 32px', textAlign: 'center', borderRadius: 24, position: 'relative' }}>
        {/* Animated 404 */}
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 8, filter: 'drop-shadow(0 4px 24px rgba(139,92,246,0.3))' }}>
          🔍
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16, lineHeight: 1 }}>
          404
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--clr-text)', marginBottom: 8 }}>
          المتجر غير موجود
        </h1>
        <p style={{ fontSize: 14, color: 'var(--clr-text-3)', lineHeight: 1.6, marginBottom: 28, maxWidth: 300, margin: '0 auto 28px' }}>
          الرابط الذي فتحته غير صحيح أو أن هذا المتجر لم يعد متاحاً. تحقق من الرابط وحاول مرة أخرى.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px' }}>
            🏠 العودة للصفحة الرئيسية
          </a>
          <a href="/auth?mode=signup" className="btn btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
            ⚡ أنشئ متجرك الخاص مجاناً
          </a>
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--clr-text-muted)', paddingTop: 16, borderTop: '1px solid var(--clr-border)' }}>
          فوري (Fawri) — المنصة الأولى للطلب عبر الواتساب ⚡
        </div>
      </div>
    </div>
  )
}

function StoreExpired({ storeName }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'var(--clr-bg)', direction: 'rtl',
    }}>
      <div className="glass" style={{ maxWidth: 360, width: '100%', padding: 32, textAlign: 'center', borderRadius: 20 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>⏸️</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--clr-text)', marginBottom: 8 }}>
          {storeName || 'المتجر'} معطّل مؤقتاً
        </h2>
        <p style={{ fontSize: 13, color: 'var(--clr-text-3)', lineHeight: 1.7, marginBottom: 24 }}>
          انتهت فترة الاشتراك لهذا المتجر.
          <br />
          إذا كنت صاحب المتجر، يرجى تجديد اشتراكك للمتابعة.
        </p>
        <a
          href={`https://wa.me/970569922257?text=مرحبا، أريد تجديد اشتراك متجر: ${encodeURIComponent(storeName || '')}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff', padding: '12px 24px', borderRadius: 12,
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}
        >
          📱 تواصل للتجديد
        </a>
        <div style={{ marginTop: 16 }}>
          <a href="/" style={{ fontSize: 12, color: 'var(--clr-text-3)' }}>العودة للرئيسية</a>
        </div>
      </div>
    </div>
  )
}

function CompactSkeleton({ logoUrl, storeName }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--clr-bg, #0d0d12)',
      color: '#fff',
      direction: 'rtl',
      gap: 20,
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt={storeName || 'logo'} style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'cover', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--clr-primary, #7c3aed), var(--clr-accent, #10b981))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
          }}>
            ⚡
          </div>
        )}
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: 28,
          border: '3px solid transparent',
          borderTopColor: 'var(--clr-accent, #10b981)',
          borderRightColor: 'var(--clr-primary, #7c3aed)',
          animation: 'spin 1s linear infinite',
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--clr-text, #fff)', marginBottom: 4 }}>
          {storeName ? `جاري تحميل ${storeName}...` : 'جاري تحميل المتجر...'}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--clr-text-3, #999)' }}>
          جاري تجهيز وتحديث المنتجات ⚡
        </p>
      </div>
    </div>
  )
}
