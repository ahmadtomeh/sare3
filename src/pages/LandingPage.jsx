import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, MessageSquare, QrCode, ShieldCheck,
  Sparkles, Check, Rocket, ChevronDown, Smartphone
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import toast from 'react-hot-toast'

export default function LandingPage() {
  const navigate = useNavigate()
  const [activeFaq, setActiveFaq] = useState(null)
  const [mockCat, setMockCat] = useState('all')
  const [mockCartCount, setMockCartCount] = useState(1)

  const MOCK_PRODUCTS = [
    { id: 1, name: 'قميص قطني فاخر', cat: 'clothes', price: '89 ₪', img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&q=80' },
    { id: 2, name: 'ساعة يد عصرية', cat: 'tech', price: '210 ₪', img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=150&q=80' },
  ]

  const filteredMockProducts = MOCK_PRODUCTS.filter(p => mockCat === 'all' || p.cat === mockCat)

  const handleAddMock = (p) => {
    setMockCartCount(c => c + 1)
    toast.success(`🛒 أضيف ${p.name} للسلة التجريبية!`, { duration: 1200 })
  }

  const handleSendMockWhatsApp = () => {
    toast.success(`💬 تم تجهيز إرسال الطلب (${mockCartCount} منتج) للواتساب!`, { duration: 2000 })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--clr-bg)', position: 'relative', overflowX: 'hidden' }}>

      {/* ── Ambient Background Glow Orbs ── */}
      <div className="ambient-glow">
        <div className="ambient-orb-1" style={{ opacity: 0.15 }} />
        <div className="ambient-orb-2" style={{ opacity: 0.12 }} />
      </div>

      {/* ── Header ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 54,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 var(--sp-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} style={{ color: '#fff' }} />
          </div>
          <span className="gradient-text" style={{ fontSize: 'var(--text-xl)', fontWeight: 900 }}>سريع</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-xs)' }}>
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth')} id="nav-login-btn">
            تسجيل الدخول
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?mode=signup')} id="nav-signup-btn">
            <Sparkles size={14} /> ابدأ مجاناً
          </button>
        </div>
      </nav>

      {/* ── Hero Section (Compact) ── */}
      <section style={{
        paddingTop: 'calc(54px + var(--sp-lg))',
        paddingBottom: 'var(--sp-xl)',
        paddingLeft: 'var(--sp-md)',
        paddingRight: 'var(--sp-md)',
        maxWidth: 1140,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--sp-xl)',
          alignItems: 'center',
        }}>

          {/* Copywriting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--glass-bg-2)', border: '1px solid var(--glass-border-glow)', borderRadius: 'var(--radius-full)', width: 'fit-content' }}>
              <span style={{ fontSize: 12 }}>🇵🇸 🇪🇬 🇸🇦 🇯🇴</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-accent)' }}>
                متجرك الإلكتروني السريع للطلب عبر الواتساب
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, lineHeight: 1.15 }}>
              حول زبائنك إلى <span className="gradient-text">مبيعات فورية</span> على الواتساب ⚡
            </h1>

            <p style={{ fontSize: 'var(--text-base)', color: 'var(--clr-text-2)', lineHeight: 1.6, maxWidth: 480 }}>
              أنشئ كتالوج منتجاتك في دقيقتين واستقبل طلبيات زبائنك المنسقة مباشرة على رقمك بدون أي عمولات.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-lg animate-glow"
                onClick={() => navigate('/auth?mode=signup')}
                id="hero-start-btn"
                style={{ flex: 1, minWidth: 200 }}
              >
                <Rocket size={18} />
                أنشئ متجرك مجاناً
              </button>
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => document.getElementById('demo-showcase')?.scrollIntoView({ behavior: 'smooth' })}
                id="hero-demo-btn"
              >
                🎮 تجربة حية
              </button>
            </div>

            {/* Micro Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-sm)', paddingTop: 'var(--sp-sm)', borderTop: '1px solid var(--clr-border)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--clr-accent)' }}>0%</div>
                <div style={{ fontSize: 10, color: 'var(--clr-text-3)' }}>عمولات مبيعات</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--clr-primary)' }}>2 دقيقة</div>
                <div style={{ fontSize: 10, color: 'var(--clr-text-3)' }}>زمن الإعداد</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: '#38bdf8' }}>100%</div>
                <div style={{ fontSize: 10, color: 'var(--clr-text-3)' }}>تحكم بالطلبات</div>
              </div>
            </div>
          </div>

          {/* Rich Interactive Phone Frame */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <InteractivePhonePreview />
          </div>

        </div>
      </section>

      {/* ── 3 Core Features (Compact Grid) ── */}
      <section style={{ padding: 'var(--sp-xl) var(--sp-md)', background: 'var(--glass-bg-2)', borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-md)' }}>
            {[
              { icon: <MessageSquare size={22} />, title: 'طلب واتساب منسق', desc: 'استقبل الطلبات مجهزة بالكميات، الخيارات، وعنوان التوصيل بنقرة واحدة.', color: 'var(--clr-accent)' },
              { icon: <QrCode size={22} />, title: 'رمز QR ورابط خاص', desc: 'احصل على رابط مخصص sare3.app/store/your-name ورمز QR جاهز للطباعة.', color: 'var(--clr-primary)' },
              { icon: <ShieldCheck size={22} />, title: '0% عمولات مجاناً', desc: 'كل الإيرادات تذهب لحسابك المباشر دون أي اقتطاعات أو عمولات مخفية.', color: '#38bdf8' },
            ].map((f, i) => (
              <div key={i} className="glass glass-interactive" style={{ padding: 'var(--sp-md)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--glass-bg-2)', border: '1px solid var(--clr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, marginBottom: 2 }}>{f.title}</h3>
                  <p style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demo Stores Showcase ── */}
      <section id="demo-showcase" style={{ padding: 'var(--sp-xl) var(--sp-md)', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-lg)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900 }}>متاجر تجريبية حية 🎮</h2>
          <p style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            جرّب تجربة الزبون الحقيقية في 3 أنواع متاجر مختلفة — بدون تسجيل
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-md)' }}>
          {[
            {
              slug: 'demo-cafe',
              emoji: '☕',
              name: 'كافيه الذوق',
              desc: 'مشروبات ساخنة، حلويات، وجبات خفيفة مع خيارات الحجم',
              color: '#92400e',
              gradient: 'linear-gradient(135deg, #92400e, #c2410c)',
              badge: '🔥 الأكثر زيارة',
            },
            {
              slug: 'demo-clothes',
              emoji: '👔',
              name: 'متجر الأناقة',
              desc: 'ملابس رجالية وحقائب جلدية بمقاسات متعددة',
              color: '#7c3aed',
              gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              badge: null,
            },
            {
              slug: 'demo-market',
              emoji: '🛒',
              name: 'ميني ماركت الجوار',
              desc: 'مياه وعصائر ومنتجات يومية بكميات متعددة',
              color: '#065f46',
              gradient: 'linear-gradient(135deg, #065f46, #047857)',
              badge: null,
            },
          ].map((s) => (
            <a
              key={s.slug}
              href={`/store/${s.slug}`}
              id={`demo-store-${s.slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="glass glass-interactive" style={{
                padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 10,
                border: `1px solid ${s.color}40`, borderRadius: 'var(--radius-xl)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer', height: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: s.gradient, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 22,
                    boxShadow: `0 4px 14px ${s.color}50`,
                  }}>
                    {s.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--clr-text)' }}>{s.name}</div>
                    {s.badge && <span style={{ fontSize: 9, background: s.gradient, color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{s.badge}</span>}
                  </div>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: s.color }}>
                  <Smartphone size={14} />
                  افتح المتجر التجريبي ←
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Pricing Section (Streamlined) ── */}
      <section style={{ padding: 'var(--sp-xl) var(--sp-md)', maxWidth: 840, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-lg)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 900 }}>خطط بسيطة وشفافة 💎</h2>
          <p style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-xs)', marginTop: 2 }}>ابدأ مجاناً لمدة 7 أيام ثم اختر الخطة المناسبة لك</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-md)' }}>
          {/* Free Trial / Starter */}
          <div className="glass" style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--clr-text-2)' }}>الفترة التجريبية</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--clr-text)', marginTop: 4 }}>
                0 ₪ <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--clr-text-3)' }}>/ لمدة 7 أيام</span>
              </div>
            </div>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--clr-text-2)', padding: 0, margin: 0, listStyle: 'none' }}>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} style={{ color: 'var(--clr-accent)' }} /> منتجات وطلبات غير محدودة</li>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} style={{ color: 'var(--clr-accent)' }} /> رابط مخصص + رمز QR</li>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} style={{ color: 'var(--clr-accent)' }} /> تصدير تقارير Excel</li>
            </ul>

            <button className="btn btn-ghost btn-full btn-sm" onClick={() => navigate('/auth?mode=signup')}>
              ابدأ مجاناً الآن
            </button>
          </div>

          {/* Monthly Pro Plan */}
          <div className="glass animate-glow" style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--glass-border-glow)' }}>
            <span className="badge badge-accent" style={{ alignSelf: 'flex-start', fontSize: 9 }}>🔥 الأكثر طلباً</span>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--clr-accent)' }}>الاشتراك الشهري</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, color: 'var(--clr-text)', marginTop: 4 }}>
                30 ₪ <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--clr-text-3)' }}>/ شهرياً</span>
              </div>
            </div>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--clr-text-2)', padding: 0, margin: 0, listStyle: 'none' }}>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} style={{ color: 'var(--clr-accent)' }} /> كل مميزات التجربة المجانية</li>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} style={{ color: 'var(--clr-accent)' }} /> 0% عمولات على جميع مبيعاتك</li>
              <li style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Check size={14} style={{ color: 'var(--clr-accent)' }} /> دعم فني مباشر عبر الواتساب</li>
            </ul>

            <button className="btn btn-primary btn-full btn-sm" onClick={() => navigate('/auth?mode=signup')}>
              اشترك بـ 30 ₪ فقط
            </button>
          </div>
        </div>
      </section>

      {/* ── Compact FAQ ── */}
      <section style={{ padding: 'var(--sp-lg) var(--sp-md)', maxWidth: 700, margin: '0 auto' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>أسئلة شائعة 💬</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { q: 'هل أحتاج لخبرة برمجية لإنشاء المتجر؟', a: 'أبداً! العملية تتم في دقيقتين عبر إضافة اسم المتجر والمنتجات مباشرة.' },
            { q: 'كيف أستلم أموال مبيعاتي؟', a: 'تستلم أموالك مباشرة من زبائنك بالطريقة التي تفضلها (كاش عند التسليم، Reflect، أو تحويل بنكي).' },
            { q: 'هل توجد عمولات على المبيعات؟', a: 'لا، 0% عمولات على جميع مبيعاتك.' },
          ].map((item, i) => (
            <div key={i} className="glass" style={{ borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                style={{ width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: 'var(--clr-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'right' }}
              >
                <span>{item.q}</span>
                <ChevronDown size={14} style={{ transform: activeFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {activeFaq === i && (
                <div style={{ padding: '0 14px 10px', fontSize: 11, color: 'var(--clr-text-3)', lineHeight: 1.5 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Compact Footer ── */}
      <footer style={{ padding: '16px var(--sp-md)', borderTop: '1px solid var(--clr-border)', textAlign: 'center', fontSize: 11, color: 'var(--clr-text-3)' }}>
        © 2026 سريع (Sare3) • جميع الحقوق محفوظة — المنصة الأولى للتجار ⚡
      </footer>

    </div>
  )
}

/* ── Interactive Phone Preview Component ── */
function InteractivePhonePreview() {
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [showWaChat, setShowWaChat] = useState(false)
  const [cart, setCart] = useState([
    { id: 1, name: 'قميص قطني فاخر', price: 89, qty: 1, option: 'L' }
  ])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [chosenOption, setChosenOption] = useState('M')

  const PRODUCTS = [
    { id: 1, name: 'قميص قطني فاخر', cat: 'clothes', price: 89, img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&q=80', options: ['S', 'M', 'L', 'XL'] },
    { id: 2, name: 'ساعة يد كلاسيك', cat: 'watches', price: 210, img: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=150&q=80', options: ['أسود', 'ذهبي'] },
    { id: 3, name: 'حذاء رياضي أنيق', cat: 'shoes', price: 150, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80', options: ['41', '42', '43'] },
    { id: 4, name: 'حقيبة جلدية', cat: 'clothes', price: 130, img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=150&q=80', options: [] },
  ]

  const filtered = PRODUCTS.filter((p) => {
    const mCat = cat === 'all' || p.cat === cat
    const mSearch = !search || p.name.includes(search)
    return mCat && mSearch
  })

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

  const handleAddToCart = (product, opt = null) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id && i.option === opt)
      if (existing) {
        return prev.map((i) => i.id === product.id && i.option === opt ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, option: opt }]
    })
    toast.success(`🛒 أضيف ${product.name} للسلة!`)
    setSelectedProduct(null)
  }

  const handleSimulatedWhatsAppClick = () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة!')
      return
    }
    setShowWaChat(true)
    toast.success('💬 تم فتح محاكاة الواتساب التفاعلية!')
  }

  const itemsText = cart.map((i) => `• ${i.qty}x ${i.name} ${i.option ? `(${i.option})` : ''} — ${i.price * i.qty} ₪`).join('\n')

  return (
    <div className="phone-mockup animate-glow" style={{ width: 280, height: 530, borderRadius: 34, padding: 8, position: 'relative' }}>
      <div className="phone-screen" style={{ borderRadius: 26, position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--clr-bg)', overflow: 'hidden' }}>

        {/* ── Simulated WhatsApp Chat View inside Phone ── */}
        {showWaChat ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 80, background: '#0b141a', display: 'flex', flexDirection: 'column' }}>
            {/* WA Header */}
            <div style={{ background: '#128c7e', padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}>
              <button
                type="button"
                onClick={() => setShowWaChat(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, padding: '2px 4px', fontWeight: 900 }}
              >
                ← العودة للمتجر
              </button>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                🛍️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>متجر الأناقة السريع</div>
                <div style={{ fontSize: 8, opacity: 0.85 }}>متصل الآن 🟢</div>
              </div>
            </div>

            {/* WA Chat Body */}
            <div style={{ flex: 1, padding: 8, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ alignSelf: 'center', background: '#1f2c34', color: '#8696a0', fontSize: 8, padding: '2px 8px', borderRadius: 6, margin: '2px 0' }}>
                الرسائل مشفرة تماماً بين الطرفين 🔒
              </div>

              {/* Outgoing Message (Customer Order) */}
              <div style={{ alignSelf: 'flex-start', maxWidth: '92%', background: '#005c4b', color: '#e9edef', padding: '8px 10px', borderRadius: '8px 8px 8px 0px', fontSize: 9, lineHeight: 1.45, whiteSpace: 'pre-line', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {`🛍️ *طلب جديد من متجر الأناقة السريع*\n-------------------------------\n${itemsText}\n-------------------------------\n💰 *الإجمالي:* ${cartTotal} ₪\n📍 *الاسم:* زبون تجريبي\n📍 *العنوان:* رام الله - الشارع الرئيسي\n⚡ *مرسل عبر سريع*`}
                <div style={{ textAlign: 'left', fontSize: 7, color: '#8696a0', marginTop: 3 }}>22:21 ✓✓</div>
              </div>

              {/* Automated Store Reply */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '88%', background: '#202c33', color: '#e9edef', padding: '8px 10px', borderRadius: '8px 8px 0px 8px', fontSize: 9, lineHeight: 1.4, boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                أهلاً بك! 🌸 تم استلام طلبك بنجاح وجاري تجهيزه للتوصيل. شكراً لتسوقك معنا! 🙏
                <div style={{ textAlign: 'left', fontSize: 7, color: '#8696a0', marginTop: 3 }}>22:21</div>
              </div>
            </div>

            {/* WA Input Bar */}
            <div style={{ padding: '6px 8px', background: '#1f2c34', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, background: '#2a3942', borderRadius: 16, padding: '4px 10px', color: '#8696a0', fontSize: 9 }}>
                اكتب رسالة...
              </div>
              <button
                type="button"
                onClick={() => setShowWaChat(false)}
                style={{ background: '#00a884', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: '50%', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                ✓
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Store Header inside Phone */}
            <div style={{ padding: '12px 10px 8px', background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  🛍️
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 11 }}>متجر الأناقة السريع</div>
                  <div style={{ fontSize: 9, opacity: 0.9 }}>نشط الآن 🟢 (نسخة تجريبية حية)</div>
                </div>
              </div>
            </div>

            {/* Mini Search & Banner */}
            <div style={{ padding: '6px 8px 0' }}>
              <input
                className="input"
                style={{ minHeight: 26, padding: '2px 8px', fontSize: 10, borderRadius: 8 }}
                placeholder="🔍 ابحث عن قميص، ساعة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Categories */}
            <div style={{ padding: '6px 8px', display: 'flex', gap: 4, overflowX: 'auto' }}>
              <button type="button" className={`category-chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')} style={{ fontSize: 9, padding: '2px 8px', minHeight: 22 }}>الكل</button>
              <button type="button" className={`category-chip ${cat === 'clothes' ? 'active' : ''}`} onClick={() => setCat('clothes')} style={{ fontSize: 9, padding: '2px 8px', minHeight: 22 }}>👔 ملابس</button>
              <button type="button" className={`category-chip ${cat === 'watches' ? 'active' : ''}`} onClick={() => setCat('watches')} style={{ fontSize: 9, padding: '2px 8px', minHeight: 22 }}>⌚ ساعات</button>
              <button type="button" className={`category-chip ${cat === 'shoes' ? 'active' : ''}`} onClick={() => setCat('shoes')} style={{ fontSize: 9, padding: '2px 8px', minHeight: 22 }}>👠 أحذية</button>
            </div>

            {/* Products Grid inside Phone */}
            <div style={{ padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', alignContent: 'start', alignItems: 'start', gap: 6, flex: 1, overflowY: 'auto', paddingBottom: 48 }}>
              {filtered.map((p) => (
                <div key={p.id} className="glass" style={{ borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column' }}>
                  <img src={p.img} alt={p.name} style={{ width: '100%', height: 65, objectFit: 'cover', borderRadius: 6 }} />
                  <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--clr-accent)', marginTop: 1 }}>{p.price} ₪</div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-full"
                    onClick={() => {
                      if (p.options.length > 0) {
                        setSelectedProduct(p)
                        setChosenOption(p.options[0])
                      } else {
                        handleAddToCart(p)
                      }
                    }}
                    style={{ marginTop: 'auto', padding: '2px 0', fontSize: 8, minHeight: 20 }}
                  >
                    🛒 + إضافة
                  </button>
                </div>
              ))}
            </div>

            {/* Option Selection Sheet inside Phone */}
            {selectedProduct && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 50,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                borderRadius: 24, padding: 8,
              }}>
                <div className="glass" style={{ padding: 10, borderRadius: 14, background: 'var(--clr-bg-surface)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 4 }}>اختر المقاس / اللون:</div>
                  <div style={{ fontSize: 10, color: 'var(--clr-text-2)', marginBottom: 8 }}>{selectedProduct.name} ({selectedProduct.price} ₪)</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {selectedProduct.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`category-chip ${chosenOption === opt ? 'active' : ''}`}
                        onClick={() => setChosenOption(opt)}
                        style={{ fontSize: 9, padding: '2px 8px', minHeight: 22 }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)} style={{ flex: 1, fontSize: 9, minHeight: 24 }}>إلغاء</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAddToCart(selectedProduct, chosenOption)} style={{ flex: 1, fontSize: 9, minHeight: 24 }}>تأكيد والإضافة</button>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Simulated WhatsApp Button */}
            {cartCount > 0 && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 40 }}>
                <button
                  type="button"
                  onClick={handleSimulatedWhatsAppClick}
                  className="animate-glow"
                  style={{
                    width: '100%', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    color: '#fff', padding: '8px 10px',
                    borderRadius: 10, fontWeight: 900, fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(37,211,102,0.5)',
                  }}
                >
                  <span>💬 إرسال عبر الواتساب ({cartCount})</span>
                  <span>{cartTotal} ₪ ←</span>
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
