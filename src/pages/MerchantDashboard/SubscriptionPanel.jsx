import { useState } from 'react'
import { Check, Star, Zap, Phone } from 'lucide-react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function SubscriptionPanel() {
  const { store, setStore } = useStoreConfig()
  const [licenseKey, setLicenseKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [tab, setTab] = useState('plans') // 'plans' | 'activate'

  const daysLeft = store?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(store.trial_ends_at) - new Date()) / 86400000))
    : 0

  const handleActivate = async () => {
    if (!licenseKey.trim()) { toast.error('يرجى إدخال كود التفعيل'); return }
    const key = licenseKey.trim().toUpperCase()
    if (!key.startsWith('FAWRI-')) { toast.error('كود التفعيل غير صالح — يجب أن يبدأ بـ FAWRI-'); return }

    if (!store?.id) {
      toast.error('خطأ: لم يتم العثور على متجرك')
      return
    }

    setActivating(true)
    try {
      // 1. استدعاء الدالة الآمنة في قاعدة البيانات لتفعيل الكود
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('redeem_activation_code', {
        input_code: key,
        target_store_id: store.id,
      })

      if (rpcErr) {
        // Fallback في حال لم يتم تشغيل الـ migration بعد
        console.warn('RPC failed, trying direct activation:', rpcErr)
        const { data: keyData, error: keyError } = await supabase
          .from('activation_codes')
          .select('*')
          .eq('code', key)
          .single()

        if (keyError || !keyData) {
          toast.error('❌ الكود غير موجود — تأكد من صحة الكود أو تواصل معنا')
          setActivating(false)
          return
        }

        if (keyData.used) {
          toast.error('❌ هذا الكود تم استخدامه مسبقاً')
          setActivating(false)
          return
        }

        const durationDays = keyData.plan === 'yearly' ? 365 : 30
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + durationDays)

        const { data: updatedStore, error: storeError } = await supabase
          .from('stores')
          .update({
            subscription_status: 'active',
            trial_ends_at: expiresAt.toISOString(),
          })
          .eq('id', store.id)
          .select()
          .single()

        if (storeError) throw storeError

        await supabase
          .from('activation_codes')
          .update({ used: true, used_by: store.id, used_at: new Date().toISOString() })
          .eq('id', keyData.id)

        setStore(updatedStore)
        toast.success(`🎉 تم تفعيل الاشتراك! ينتهي في ${expiresAt.toLocaleDateString('ar-EG')}`, { duration: 5000 })
        setLicenseKey('')
        setTab('plans')
        setActivating(false)
        return
      }

      if (!rpcRes?.success) {
        toast.error(rpcRes?.error || '❌ فشل تفعيل الكود')
        setActivating(false)
        return
      }

      // جلب بيانات المتجر المحدثة
      const { data: updatedStore } = await supabase
        .from('stores')
        .select('*')
        .eq('id', store.id)
        .single()

      if (updatedStore) setStore(updatedStore)

      const expDate = new Date(rpcRes.expires_at)
      toast.success(`🎉 تم تفعيل الاشتراك بنجاح! ينتهي في ${expDate.toLocaleDateString('ar-EG')}`, { duration: 5000 })
      setLicenseKey('')
      setTab('plans')
    } catch (err) {
      console.error('Activation error:', err)
      toast.error('حدث خطأ أثناء التفعيل — حاول مرة أخرى')
    }
    setActivating(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)', maxWidth: 740 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">الاشتراك والدفع 💳</h1>
          <p className="page-subtitle">إدارة اشتراكك ومتابعة حالة الحساب</p>
        </div>
      </div>

      {/* Current Status */}
      <div className="glass" style={{
        padding: 'var(--sp-xl)',
        border: store?.subscription_status === 'active' ? '1px solid var(--clr-success)' : '1px solid var(--clr-warning)',
        background: store?.subscription_status === 'active' ? 'hsla(142,72%,50%,0.06)' : 'hsla(42,95%,60%,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '3rem' }}>
            {store?.subscription_status === 'active' ? '✅' : '🕐'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--text-xl)' }}>
              {store?.subscription_status === 'active' ? 'اشتراك نشط' : 'فترة تجريبية'}
            </div>
            <div style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              {store?.subscription_status === 'trial'
                ? `متبقٍ ${daysLeft} يوم من التجربة المجانية`
                : 'اشتراكك نشط وجميع المميزات متاحة'
              }
            </div>
          </div>
          {store?.subscription_status === 'trial' && (
            <div className="progress-bar" style={{ width: 120 }}>
              <div className="progress-fill" style={{ width: `${(daysLeft / 7) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="live-switcher" style={{ alignSelf: 'flex-start' }}>
        <button className={`live-switcher-btn ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')} id="tab-plans">
          📦 الباقات
        </button>
        <button className={`live-switcher-btn ${tab === 'activate' ? 'active' : ''}`} onClick={() => setTab('activate')} id="tab-activate">
          🔑 تفعيل كود
        </button>
      </div>

      {tab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
          {/* Plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-md)' }}>
            <div className="glass pricing-card">
              <div className="badge badge-ghost" style={{ marginBottom: 'var(--sp-md)' }}>شهري</div>
              <div className="pricing-price">30 <span className="pricing-currency" style={{ fontSize: 'var(--text-lg)' }}>₪</span></div>
              <div className="pricing-period" style={{ marginBottom: 'var(--sp-lg)' }}>/ كل 30 يوم</div>
              {['منتجات غير محدودة', 'طلبات غير محدودة', 'رابط مخصص + QR', 'إحصائيات المبيعات'].map(f => (
                <div key={f} className="pricing-feature" style={{ marginBottom: 6 }}>
                  <Check size={14} />{f}
                </div>
              ))}
              <button className="btn btn-ghost btn-full" style={{ marginTop: 'var(--sp-lg)' }} onClick={() => setTab('activate')} id="select-monthly-btn">
                اختيار الشهري
              </button>
            </div>

            <div className="glass pricing-card featured">
              <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-md)' }}>
                <div className="badge badge-primary">سنوي</div>
                <div className="badge badge-warning"><Star size={10} /> الأوفر</div>
              </div>
              <div className="pricing-price gradient-text">250 <span className="pricing-currency" style={{ fontSize: 'var(--text-lg)' }}>₪</span></div>
              <div className="pricing-period" style={{ marginBottom: 'var(--sp-lg)' }}>/ سنة كاملة</div>
              {['كل مميزات الشهري', 'توفير 110 ₪ (شهرين مجاناً)', 'أولوية دعم فني', 'تقارير متقدمة', 'مميزات قادمة مجاناً'].map(f => (
                <div key={f} className="pricing-feature" style={{ marginBottom: 6 }}>
                  <Check size={14} />{f}
                </div>
              ))}
              <button className="btn btn-primary btn-full" style={{ marginTop: 'var(--sp-lg)' }} onClick={() => setTab('activate')} id="select-yearly-btn">
                <Zap size={16} /> اختيار السنوي
              </button>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--sp-md)', fontSize: 'var(--text-lg)' }}>
              💳 كيفية الدفع (المرحلة الأولى)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
              {[
                { step: '1', icon: '📱', title: 'أرسل المبلغ عبر Reflect', desc: 'أرسل المبلغ إلى حساب فوري على Reflect (سيتم تحديث الرقم قريباً)' },
                { step: '2', icon: '📸', title: 'أرسل صورة الإيصال', desc: 'أرسل لقطة شاشة للحوالة على الواتساب أو البريد الإلكتروني' },
                { step: '3', icon: '🔑', title: 'استلم كود التفعيل', desc: 'سيتم إرسال كود التفعيل خلال دقائق بعد التحقق من الدفع' },
                { step: '4', icon: '✅', title: 'فعّل اشتراكك', desc: 'أدخل الكود في قسم "تفعيل كود" وانطلق!' },
              ].map((s) => (
                <div key={s.step} style={{ display: 'flex', gap: 'var(--sp-md)', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: 'var(--clr-primary-glow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--clr-primary)', flexShrink: 0,
                  }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.icon} {s.title}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="https://wa.me/970569922257?text=مرحبا، أريد الاشتراك في فوري"
              target="_blank"
              rel="noreferrer"
              className="btn btn-full"
              style={{
                marginTop: 'var(--sp-xl)',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff', padding: 14, borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontWeight: 700,
              }}
              id="contact-payment-btn"
            >
              <Phone size={18} />
              تواصل معنا للاشتراك عبر الواتساب
            </a>

            <div className="glass-2" style={{ padding: 'var(--sp-md)', marginTop: 'var(--sp-md)', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>
              🔜 قريباً: الدفع الإلكتروني الفوري عبر Reflect Business / Lahza
            </div>
          </div>
        </div>
      )}

      {tab === 'activate' && (
        <div className="glass" style={{ padding: 'var(--sp-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>🔑 إدخال كود التفعيل</h3>
          <div className="input-group">
            <label className="input-label">كود التفعيل (License Key)</label>
            <input
              className="input"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="FAWRI-XXXX-XXXX-XXXX"
              style={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 'var(--text-lg)', letterSpacing: 2 }}
              id="license-key-input"
            />
          </div>
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleActivate}
            disabled={activating}
            id="activate-btn"
          >
            {activating ? (
              <span className="animate-spin" style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block' }} />
            ) : (
              <><Zap size={18} /> تفعيل الاشتراك</>
            )}
          </button>

          <div className="glass-2" style={{ padding: 'var(--sp-md)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>💡</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', lineHeight: 1.7 }}>
              لم تحصل على كودك؟ تأكد أنك أرسلت إيصال الدفع على الواتساب أو راسلنا مباشرةً.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
