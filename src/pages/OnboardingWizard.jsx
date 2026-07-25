import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Check, Store, Phone, Package, ChevronLeft } from 'lucide-react'
import { useStoreConfig } from '../stores/useStoreConfig'
import { useAuthStore } from '../stores/useAuthStore'
import { useProductsStore } from '../stores/useProductsStore'
import { DEMO_PRESETS } from '../utils/demoData'
import toast from 'react-hot-toast'

const STEPS = [
  { num: 1, icon: <Store size={24} />, title: 'معلومات المتجر', desc: 'أضف اسم متجرك ورقم الواتساب' },
  { num: 2, icon: <Package size={24} />, title: 'فئاتك ومنتجاتك', desc: 'اختر نوع متجرك أو أضف منتجاتك' },
  { num: 3, icon: <Check size={24} />, title: 'المتجر جاهز!', desc: 'شارك رابطك واستقبل الطلبات' },
]

const COUNTRY_CODES = ['+972', '+970', '+962', '+966', '+20', '+971']

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', whatsapp: '', country_code: '+972', currency: '₪', slug: '',
  })
  const [selectedPreset, setSelectedPreset] = useState(null)
  const { createStore } = useStoreConfig()
  const { addCategory, addProduct } = useProductsStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!form.name || !form.whatsapp) { toast.error('يرجى تعبئة الاسم والواتساب'); return }
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30) + '-' + Date.now().toString().slice(-4)
    set('slug', slug)
    setStep(2)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const store = await createStore({
        ...form,
        owner_id: user?.id,
        is_active: true,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      })

      // Load rich preset data if a template was selected
      if (selectedPreset && selectedPreset !== 'empty' && store?.id && DEMO_PRESETS[selectedPreset]) {
        const preset = DEMO_PRESETS[selectedPreset]
        // Add categories
        for (const cat of preset.categories) {
          await addCategory(store.id, { name: cat.name, emoji: cat.emoji, sort_order: 0 })
        }
        // Add products
        for (const prod of preset.products) {
          await addProduct(store.id, {
            name: prod.name,
            description: prod.description,
            price: prod.price,
            is_available: prod.in_stock,
            image_url: prod.image_url,
            options: prod.options,
            is_featured: prod.is_featured,
          })
        }
      }

      setStep(3)
      toast.success('🎉 متجرك جاهز مع كل المنتجات!')
    } catch (e) {
      toast.error('حدث خطأ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const storeUrl = form.slug ? `${window.location.origin}/store/${form.slug}` : ''

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--sp-lg)', background: 'var(--clr-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div className="navbar-logo" style={{ justifyContent: 'center', fontSize: 'var(--text-2xl)' }}>
            <Zap size={30} />سريع
          </div>
          <p style={{ color: 'var(--clr-text-3)', marginTop: 4 }}>أنشئ متجرك في دقيقتين ⚡</p>
        </div>

        {/* Steps Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {STEPS.map((s, i) => (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div className={`onboarding-step ${step > s.num ? 'done' : step === s.num ? 'active' : ''}`}>
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <div style={{ fontSize: 10, color: step === s.num ? 'var(--clr-primary)' : 'var(--clr-text-3)', whiteSpace: 'nowrap' }}>
                  {s.title}
                </div>
              </div>
              {i < STEPS.length - 1 && <div className={`onboarding-line ${step > s.num ? 'done' : ''}`} />}
            </>
          ))}
        </div>

        {/* Step 1 — Store Info */}
        {step === 1 && (
          <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
            <h2 style={{ fontWeight: 800, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-xl)' }}>
              🏪 معلومات متجرك
            </h2>
            <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
              <div className="input-group">
                <label className="input-label">اسم المتجر *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="مثال: بوتيك نور، كافيه لحظة..." id="onboard-name" />
              </div>
              <div className="input-group">
                <label className="input-label">وصف مختصر (اختياري)</label>
                <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="أفضل المنتجات بأسعار مميزة" id="onboard-desc" />
              </div>
              <div className="input-group">
                <label className="input-label">رقم الواتساب *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="input" style={{ width: 'auto', flexShrink: 0 }} value={form.country_code} onChange={e => set('country_code', e.target.value)} id="onboard-cc">
                    {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="input" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value.replace(/[^0-9]/g, ''))} placeholder="0599123456" required style={{ direction: 'ltr' }} id="onboard-wa" />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">العملة</label>
                <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)} id="onboard-currency">
                  {[['₪', '🇵🇸 شيكل (₪)'], ['$', '🇺🇸 دولار ($)'], ['JOD', '🇯🇴 دينار (JOD)'], ['SAR', '🇸🇦 ريال (SAR)'], ['EGP', '🇪🇬 جنيه (EGP)']].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" id="onboard-next-1">
                التالي ←
              </button>
            </form>
          </div>
        )}

        {/* Step 2 — Preset or Empty */}
        {step === 2 && (
          <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
            <h2 style={{ fontWeight: 800, marginBottom: 8, fontSize: 'var(--text-xl)' }}>🎁 ابدأ بنموذج جاهز</h2>
            <p style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-lg)' }}>
              اختر نوع متجرك لإضافة منتجات تجريبية جاهزة — يمكنك تعديلها لاحقاً
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-lg)' }}>
              {Object.entries(DEMO_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`glass-2 ${selectedPreset === key ? 'animate-pulse-glow' : ''}`}
                  style={{
                    padding: 'var(--sp-md)', textAlign: 'right', cursor: 'pointer', width: '100%',
                    border: selectedPreset === key ? '1px solid var(--clr-primary)' : '1px solid var(--clr-border)',
                    borderRadius: 'var(--radius-md)', background: selectedPreset === key ? 'var(--clr-primary-glow)' : 'var(--glass-bg-2)',
                    transition: 'all var(--tr-base)',
                  }}
                  onClick={() => setSelectedPreset(selectedPreset === key ? null : key)}
                  id={`preset-${key}`}
                >
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{preset.label}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginTop: 2 }}>منتجات وفئات تجريبية جاهزة</div>
                </button>
              ))}
              <button
                className={`glass-2 ${selectedPreset === 'empty' ? 'animate-pulse-glow' : ''}`}
                style={{
                  padding: 'var(--sp-md)', textAlign: 'right', cursor: 'pointer', width: '100%',
                  border: selectedPreset === 'empty' ? '1px solid var(--clr-primary)' : '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius-md)', background: selectedPreset === 'empty' ? 'var(--clr-primary-glow)' : 'var(--glass-bg-2)',
                  transition: 'all var(--tr-base)',
                }}
                onClick={() => setSelectedPreset('empty')}
                id="preset-empty"
              >
                <div style={{ fontWeight: 600 }}>🚀 ابدأ فارغاً وأضف منتجاتي</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginTop: 2 }}>سأضيف منتجاتي يدوياً</div>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} id="onboard-back-2">← رجوع</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleFinish}
                disabled={!selectedPreset || loading}
                id="onboard-finish"
              >
                {loading ? '⏳ جاري الإنشاء...' : '🎉 إنشاء متجري!'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done! */}
        {step === 3 && (
          <div className="glass" style={{ padding: 'var(--sp-xl)', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--sp-md)', animation: 'float 2s ease-in-out infinite' }}>🎉</div>
            <h2 style={{ fontWeight: 900, fontSize: 'var(--text-2xl)', marginBottom: 'var(--sp-sm)' }}>
              متجرك جاهز! 🚀
            </h2>
            <p style={{ color: 'var(--clr-text-3)', marginBottom: 'var(--sp-xl)', lineHeight: 1.7 }}>
              تهانينا! متجرك الإلكتروني {form.name} أصبح حياً الآن.
              شاركه مع زبائنك وابدأ استقبال الطلبات فوراً!
            </p>

            {storeUrl && (
              <div style={{ background: 'var(--glass-bg-2)', border: '1px solid var(--clr-accent)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-md)', marginBottom: 'var(--sp-lg)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 4 }}>رابط متجرك</div>
                <div style={{ fontWeight: 700, color: 'var(--clr-accent)', fontSize: 'var(--text-sm)', direction: 'ltr', wordBreak: 'break-all' }}>
                  🔗 {storeUrl}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/dashboard')} id="onboard-go-dashboard">
                الذهاب للوحة التحكم →
              </button>
              {storeUrl && (
                <a href={storeUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-full" id="onboard-preview-store">
                  👁️ معاينة متجري
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
