import { useState, useEffect, useRef } from 'react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { useProductsStore } from '../../stores/useProductsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { Download, Upload, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CURRENCIES = [
  { value: '₪', label: 'شيكل (₪)', flag: '🇵🇸' },
  { value: '$', label: 'دولار ($)', flag: '🇺🇸' },
  { value: 'JOD', label: 'دينار أردني (JOD)', flag: '🇯🇴' },
  { value: 'SAR', label: 'ريال سعودي (SAR)', flag: '🇸🇦' },
  { value: 'EGP', label: 'جنيه مصري (EGP)', flag: '🇪🇬' },
]

const COUNTRY_CODES = [
  { value: '+972', label: '+972 🇵🇸 فلسطين' },
  { value: '+970', label: '+970 🇵🇸 فلسطين' },
  { value: '+962', label: '+962 🇯🇴 الأردن' },
  { value: '+966', label: '+966 🇸🇦 السعودية' },
  { value: '+20',  label: '+20 🇪🇬 مصر' },
  { value: '+971', label: '+971 🇦🇪 الإمارات' },
  { value: '+965', label: '+965 🇰🇼 الكويت' },
]

export default function StoreSettings() {
  const { store, updateStore } = useStoreConfig()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    name: '', description: '', whatsapp: '', country_code: '+972',
    currency: '₪', primary_color: '#8B5CF6', accent_color: '#10B981',
    shipping_options: [], selected_theme: 'neon',
    working_hours_start: '09:00', working_hours_end: '23:00',
    free_shipping_limit: '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef(null)
  const { categories, products } = useProductsStore()

  useEffect(() => {
    if (store) {
      // Find and extract free shipping limit if exists in options
      const rawOptions = store.shipping_options || []
      const limitOpt = rawOptions.find(o => o.name === '__free_shipping_threshold__')
      const cleanOptions = rawOptions.filter(o => o.name !== '__free_shipping_threshold__')

      setForm({
        name: store.name || '',
        description: store.description || '',
        whatsapp: store.whatsapp || '',
        country_code: store.country_code || '+972',
        currency: store.currency || '₪',
        primary_color: store.primary_color || '#8B5CF6',
        accent_color: store.accent_color || '#10B981',
        slug: store.slug || '',
        shipping_options: cleanOptions,
        selected_theme: store.selected_theme || 'neon',
        working_hours_start: store.working_hours_start || '09:00',
        working_hours_end: store.working_hours_end || '23:00',
        free_shipping_limit: limitOpt ? limitOpt.cost : '',
      })
    }
  }, [store])

  const [newZone, setNewZone] = useState({ name: '', cost: '' })

  const handleAddZone = () => {
    if (!newZone.name || !newZone.cost) return
    const costNum = parseFloat(newZone.cost)
    if (isNaN(costNum)) return
    const updated = [...(form.shipping_options || []), { name: newZone.name, cost: costNum }]
    set('shipping_options', updated)
    setNewZone({ name: '', cost: '' })
    toast.success('تم إضافة منطقة الشحن')
  }

  const handleRemoveZone = (index) => {
    const updated = (form.shipping_options || []).filter((_, i) => i !== index)
    set('shipping_options', updated)
    toast.success('تم حذف منطقة الشحن')
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.whatsapp) {
      toast.error('يرجى إدخال اسم المتجر ورقم الواتساب')
      return
    }
    setLoading(true)

    // Build the final shipping options list including the free shipping threshold if set
    let finalShipping = [...(form.shipping_options || [])]
    const limitNum = parseFloat(form.free_shipping_limit)
    if (!isNaN(limitNum) && limitNum > 0) {
      finalShipping.push({
        name: '__free_shipping_threshold__',
        cost: limitNum
      })
    }

    // Prepare clean form payload
    const payload = {
      ...form,
      shipping_options: finalShipping
    }

    try {
      await updateStore(payload)
      toast.success('✅ تم حفظ إعدادات المتجر')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      toast.error('حدث خطأ: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportJSON = () => {
    if (!store) { toast.error('لا يوجد متجر لتصديره'); return }
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      store: { ...store },
      categories: categories || [],
      products: products || [],
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sare3-backup-${store.slug || 'store'}-${new Date().toLocaleDateString('en-CA')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('✅ تم تصدير النسخة الاحتياطية بنجاح!')
  }

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.store || !backup.version) throw new Error('ملف غير صالح')
      if (!window.confirm('⚠️ سيتم استبدال بيانات المتجر بالنسخة المستوردة. هل أنت متأكد؟')) {
        setImporting(false)
        return
      }
      const { name, description, whatsapp, country_code, currency, primary_color, accent_color } = backup.store
      await updateStore({ name, description, whatsapp, country_code, currency, primary_color, accent_color })
      toast.success('✅ تمت استعادة إعدادات المتجر بنجاح!')
      toast('ملاحظة: المنتجات والفئات محفوظة في الملف — ستحتاج لإضافتها يدوياً', { icon: 'ℹ️', duration: 5000 })
    } catch (err) {
      toast.error('حدث خطأ في الاستيراد: ' + err.message)
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  const storeUrl = store?.slug
    ? `${window.location.origin}/store/${store.slug}`
    : 'أنشئ متجرك أولاً'


  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)', maxWidth: 680 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">إعدادات المتجر ⚙️</h1>
          <p className="page-subtitle">اضبط معلومات متجرك وهويته البصرية</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} id="save-settings-btn">
          {loading ? '⏳ جاري الحفظ...' : saved ? '✅ تم الحفظ!' : '💾 حفظ التغييرات'}
        </button>
      </div>

      {/* Store Link */}
      {store?.slug && (
        <div className="glass" style={{ padding: 'var(--sp-md)', display: 'flex', gap: 'var(--sp-md)', alignItems: 'center', flexWrap: 'wrap', borderColor: 'var(--clr-accent-glow)', borderWidth: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 2 }}>رابط متجرك</div>
            <div style={{ fontWeight: 700, color: 'var(--clr-accent)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🔗 {storeUrl}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { navigator.clipboard.writeText(storeUrl); toast.success('تم نسخ الرابط!') }}
            id="copy-store-link-btn"
          >
            نسخ الرابط
          </button>
        </div>
      )}

      {/* Basic Info */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>المعلومات الأساسية 📋</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
          <div className="input-group">
            <label className="input-label">اسم المتجر *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="مثال: بوتيك نور" id="store-name-input" />
          </div>
          <div className="input-group">
            <label className="input-label">وصف المتجر</label>
            <textarea className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر لمتجرك..." rows={2} id="store-desc-input" />
          </div>
          <div className="input-group">
            <label className="input-label">الرابط المخصص للمتجر</label>
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center', direction: 'ltr' }}>
              <input
                className="input"
                value={form.slug || ''}
                onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-'))}
                placeholder="my-store"
                style={{ direction: 'ltr', flex: 1 }}
                id="store-slug-input"
              />
              <span style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)', flexShrink: 0, whiteSpace: 'nowrap' }}>sare3.app/store/</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>أحرف إنجليزية وأرقام وشرطات فقط</p>
          </div>
        </div>
      </div>

      {/* Working Hours Settings */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>ساعات العمل ⏰</h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-md)' }}>
          حدد ساعات فتح وإغلاق المتجر ليتم إشعار الزبائن تلقائياً بحالة عمل متجرك
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
          <div className="input-group">
            <label className="input-label">من الساعة (الافتتاح)</label>
            <input type="time" className="input" value={form.working_hours_start} onChange={e => setForm(prev => ({ ...prev, working_hours_start: e.target.value }))} id="working-hours-start" />
          </div>
          <div className="input-group">
            <label className="input-label">إلى الساعة (الإغلاق)</label>
            <input type="time" className="input" value={form.working_hours_end} onChange={e => setForm(prev => ({ ...prev, working_hours_end: e.target.value }))} id="working-hours-end" />
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>رقم الواتساب 💬</h2>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <select
            className="input"
            value={form.country_code}
            onChange={e => set('country_code', e.target.value)}
            style={{ width: 'auto', flexShrink: 0 }}
            id="country-code-select"
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            className="input"
            value={form.whatsapp}
            onChange={e => set('whatsapp', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0599123456"
            required
            style={{ direction: 'ltr' }}
            id="whatsapp-input"
          />
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginTop: 6 }}>
          ⚠️ تأكد من صحة الرقم — ستُرسل جميع الطلبات إليه مباشرةً
        </p>
        {form.whatsapp && (
          <a
            href={`https://wa.me/${form.country_code.replace('+', '')}${form.whatsapp.replace(/^0/, '')}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10, color: '#25D366' }}
          >
            ✅ اختبر الرقم
          </a>
        )}
      </div>

      {/* Currency */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>العملة والإعدادات المالية 💰</h2>
        <div className="input-group">
          <label className="input-label">العملة الرئيسية</label>
          <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)} id="currency-select">
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipping Zones Manager */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>خيارات الشحن والتوصيل 📦</h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-md)' }}>
          أضف خيارات ومناطق الشحن وتكلفة كل منها ليختار منها الزبون عند الطلب
        </p>

        {/* Add Zone Inline Form */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-md)' }}>
          <input
            className="input"
            style={{ flex: 2, minHeight: 38 }}
            placeholder="اسم المنطقة (مثال: الضفة الغربية)"
            value={newZone.name}
            onChange={e => setNewZone(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="input"
            style={{ flex: 1, minHeight: 38, direction: 'ltr' }}
            type="number"
            placeholder="السعر"
            value={newZone.cost}
            onChange={e => setNewZone(prev => ({ ...prev, cost: e.target.value }))}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAddZone} style={{ padding: '0 16px' }}>
            <Plus size={16} /> إضافة
          </button>
        </div>

        {/* Zones List */}
        {(form.shipping_options || []).length === 0 ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', textAlign: 'center', padding: 12, background: 'var(--glass-bg-2)', borderRadius: 8 }}>
            لا توجد مناطق شحن مضافة حالياً (سيظهر التوصيل كمجاني أو يتم الاتفاق عليه)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(form.shipping_options || []).map((zone, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--glass-bg-2)', borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{zone.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--clr-accent)' }}>{zone.cost} {form.currency}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRemoveZone(idx)} style={{ color: 'var(--clr-danger)', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: 'var(--clr-border)', margin: '16px 0' }} />

        {/* Free Shipping Urgency Threshold Setting */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🚚 حد الشحن المجاني (اختياري)</span>
          </label>
          <input
            className="input"
            style={{ minHeight: 38, fontSize: 13 }}
            type="number"
            placeholder="مثال: 150 (سيصبح الشحن مجاناً عند وصول السلة لهذا المبلغ)"
            value={form.free_shipping_limit || ''}
            onChange={e => set('free_shipping_limit', e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>
            إذا ترك فارغاً، لن يتم تطبيق ميزة الشحن المجاني التلقائي.
          </span>
        </div>
      </div>

      {/* Brand Colors & Themes */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>الهوية البصرية والقوالب 🎨</h2>
        
        {/* Theme Picker */}
        <div className="input-group" style={{ marginBottom: 'var(--sp-lg)' }}>
          <label className="input-label">قالب المتجر (Theme)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { id: 'neon', name: 'النيون الزجاجي ⚡', desc: 'أضواء نيون وخلفية زجاجية داكنة' },
              { id: 'classic', name: 'الكلاسيكي النظيف ☕', desc: 'مظهر أبيض ناصع ومريح للعين' },
              { id: 'luxury', name: 'الفخامة الداكنة 👑', desc: 'تدرجات الأسود الفخم والذهبي' }
            ].map(t => (
              <div
                key={t.id}
                onClick={() => set('selected_theme', t.id)}
                style={{
                  padding: 12, borderRadius: 12, cursor: 'pointer',
                  border: form.selected_theme === t.id ? '2px solid var(--clr-primary)' : '1px solid var(--clr-border)',
                  background: form.selected_theme === t.id ? 'var(--clr-primary-glow)' : 'var(--glass-bg-2)',
                  transition: 'all var(--tr-base)'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: 'var(--clr-text-3)', lineHeight: 1.3 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
          <div className="input-group">
            <label className="input-label">اللون الرئيسي</label>
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center' }}>
              <input
                type="color"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                style={{ width: 48, height: 44, padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)', cursor: 'pointer', background: 'none' }}
                id="primary-color-picker"
              />
              <input
                className="input"
                value={form.primary_color}
                onChange={e => set('primary_color', e.target.value)}
                style={{ direction: 'ltr', fontFamily: 'monospace' }}
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">لون التمييز</label>
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center' }}>
              <input
                type="color"
                value={form.accent_color}
                onChange={e => set('accent_color', e.target.value)}
                style={{ width: 48, height: 44, padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)', cursor: 'pointer', background: 'none' }}
                id="accent-color-picker"
              />
              <input
                className="input"
                value={form.accent_color}
                onChange={e => set('accent_color', e.target.value)}
                style={{ direction: 'ltr', fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div style={{ marginTop: 'var(--sp-md)', padding: 'var(--sp-md)', borderRadius: 'var(--radius-md)', background: 'var(--glass-bg-2)', display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)' }}>معاينة:</div>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: form.primary_color }} />
          <div style={{ width: 32, height: 32, borderRadius: 8, background: form.accent_color }} />
          <div style={{
            padding: '6px 14px', borderRadius: 20,
            background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`,
            color: '#fff', fontSize: 12, fontWeight: 600,
          }}>
            {form.name || 'متجرك'}
          </div>
        </div>
      </div>

      {/* ── Backup & Restore Section ── */}
      <div className="glass" style={{ padding: 'var(--sp-xl)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--clr-border)' }}>
        <h2 style={{ fontWeight: 800, fontSize: 'var(--text-lg)', marginBottom: 4 }}>💾 نسخ احتياطية واستعادة</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-lg)' }}>
          صدّر كل بيانات متجرك كملف JSON أو استعدها من نسخة سابقة
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportJSON}
            style={{ gap: 8, flex: 1, minWidth: 140 }}
            id="export-json-btn"
          >
            <Download size={16} /> تصدير JSON
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => importRef.current?.click()}
            disabled={importing}
            style={{ gap: 8, flex: 1, minWidth: 140, border: '1px dashed var(--clr-border)' }}
            id="import-json-btn"
          >
            <Upload size={16} /> {importing ? 'جاري الاستيراد...' : 'استيراد JSON'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportJSON}
          />
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--clr-text-3)', lineHeight: 1.6 }}>
          ❌ المنتجات والفئات محفوظة في الملف — ستحتاج لإضافتها يدوياً بعد الاستيراد.
        </div>
      </div>

      {/* Save Button (sticky on mobile) */}
      <div style={{
        position: 'sticky', bottom: 16,
        background: 'var(--clr-bg)',
        padding: '12px 0',
        borderTop: '1px solid var(--clr-border)',
        marginTop: 'var(--sp-sm)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="save-settings-bottom-btn">
          {loading ? '⏳ جاري الحفظ...' : saved ? '✅ تم الحفظ!' : '💾 حفظ إعدادات المتجر'}
        </button>
      </div>
    </form>
  )
}
