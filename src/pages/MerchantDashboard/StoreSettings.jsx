import { useState, useEffect, useRef } from 'react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import { useProductsStore } from '../../stores/useProductsStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { supabase } from '../../lib/supabase'
import { Download, Upload, Plus, Trash2, X, Image } from 'lucide-react'
import { compressImage } from '../../utils/imageCompressor'
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
    logo_url: '', banner_url: '',
    telegram_chat_id: '',
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
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        telegram_chat_id: store.telegram_chat_id || '',
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

  const logoRef = useRef()
  const bannerRef = useRef()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const handleImageUpload = async (file, field, setUploading) => {
    if (!file) return
    setUploading(true)
    try {
      // Compress image client-side to max 800px & ~40KB quality for instant storefront loading
      const compressedUrl = await compressImage(file, 800, 800, 0.75)
      set(field, compressedUrl)

      // Try uploading to Supabase storage bucket in background if available
      try {
        const ext = file.name.split('.').pop()
        const path = `${field}/${store?.id || 'unknown'}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(path)
          if (urlData?.publicUrl) {
            set(field, urlData.publicUrl)
          }
        }
      } catch (storageErr) {
        console.warn('Storage bucket upload fallback:', storageErr)
      }

      toast.success('✅ تم رفع وتصغير الصورة بنجاح! اضغط حفظ التغييرات بالأسفل للتأكيد 💾')
    } catch {
      toast.error('فشل رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

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

    // Prepare clean form payload (strip form-only state fields)
    const { free_shipping_limit, ...cleanForm } = form
    const payload = {
      ...cleanForm,
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
    a.download = `fawri-backup-${store.slug || 'store'}-${new Date().toLocaleDateString('en-CA')}.json`
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
    ? `${window.location.origin}/${store.slug}`
    : 'أنشئ متجرك أولاً'


  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)', flex: 1, minWidth: 280, maxWidth: 680 }}>
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
              <span style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)', flexShrink: 0, whiteSpace: 'nowrap' }}>fawri.shop/</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>أحرف إنجليزية وأرقام وشرطات فقط</p>
          </div>
        </div>
      </div>

      {/* ── هوية المتجر البصرية ── */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>هوية المتجر البصرية 🎨</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>

          {/* Logo */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>شعار المتجر (Logo)</label>
            <div style={{ display: 'flex', gap: 'var(--sp-md)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div
                className="upload-area"
                onClick={() => logoRef.current?.click()}
                style={{ width: 120, height: 120, minHeight: 'unset', cursor: 'pointer', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', padding: 0 }}
              >
                {form.logo_url ? (
                  <img src={form.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--clr-text-3)', gap: 4 }}>
                    <Image size={28} />
                    <span style={{ fontSize: 10 }}>الشعار</span>
                  </div>
                )}
                {uploadingLogo && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                    <span style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', lineHeight: 1.5 }}>
                  يظهر في واجهة متجرك وعلى معاينة الرابط (WhatsApp/Facebook).
                  <br />مقاس مثالي: 400×400 بكسل، PNG أو JPG.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => logoRef.current?.click()}>
                    <Upload size={14} /> رفع شعار
                  </button>
                  {form.logo_url && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--clr-danger)' }} onClick={() => set('logo_url', '')}>
                      <X size={14} /> إزالة
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files[0], 'logo_url', setUploadingLogo)} />
          </div>

          {/* Banner */}
          <div>
            <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>صورة غلاف المتجر (Banner)</label>
            <div
              className="upload-area"
              onClick={() => bannerRef.current?.click()}
              style={{ cursor: 'pointer', width: '100%', minHeight: 120, position: 'relative' }}
            >
              {form.banner_url ? (
                <img src={form.banner_url} alt="banner" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--clr-text-3)', gap: 6 }}>
                  <Image size={28} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>صورة الغلاف — تظهر في أعلى صفحة متجرك</span>
                  <span style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>1200×300 بكسل مثالي</span>
                </div>
              )}
              {uploadingBanner && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit' }}>
                  <span style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
            {form.banner_url && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, color: 'var(--clr-danger)' }} onClick={() => set('banner_url', '')}>
                <X size={14} /> إزالة الغلاف
              </button>
            )}
            <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files[0], 'banner_url', setUploadingBanner)} />
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

      {/* Telegram Notifications */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 4, fontSize: 'var(--text-lg)' }}>إشعارات تيليجرام ✈️</h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-md)', lineHeight: 1.6 }}>
          احصل على إشعار فوري على تيليجرام عند ورود كل طلب جديد — حتى بدون فتح المتصفح!<br />
          أرسل رسالة لـ <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{ color: 'var(--clr-accent)' }}>@userinfobot</a> على تيليجرام لمعرفة رقم Chat ID الخاص بك.
        </p>
        <div className="input-group">
          <label className="input-label">Telegram Chat ID</label>
          <input
            className="input"
            value={form.telegram_chat_id || ''}
            onChange={e => set('telegram_chat_id', e.target.value.trim())}
            placeholder="مثال: 123456789"
            style={{ direction: 'ltr' }}
            id="telegram-chat-id-input"
          />
        </div>
        {form.telegram_chat_id && (
          <div className="glass" style={{ padding: '10px 14px', marginTop: 10, borderRadius: 10, background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.3)', fontSize: 12 }}>
            ✅ سيتم إرسال إشعارات الطلبات الجديدة إلى تيليجرام ID: <strong style={{ direction: 'ltr', display: 'inline-block' }}>{form.telegram_chat_id}</strong>
          </div>
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

    {/* Sticky Mock Phone Preview Column */}
    <div className="settings-preview-col" style={{
      position: 'sticky',
      top: 'calc(var(--header-h, 54px) + 16px)',
      width: 320,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--clr-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>👁️ معاينة مباشرة للتغييرات</span>
      </div>
      
      {/* Mock Phone Body */}
      <div style={{
        width: 320, height: 580,
        background: form.selected_theme === 'classic' ? '#f9fafb' : (form.selected_theme === 'luxury' ? '#09090b' : '#0a0a14'),
        border: '10px solid #1f2937',
        borderRadius: 36,
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        color: form.selected_theme === 'classic' ? '#111827' : '#fafafa',
        fontFamily: 'system-ui, sans-serif',
        direction: 'rtl'
      }}>
        {/* Speaker Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 110, height: 16, background: '#1f2937',
          borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ width: 40, height: 3, background: '#4b5563', borderRadius: 2 }} />
        </div>

        {/* Status Bar */}
        <div style={{ height: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px 0', fontSize: 10, fontWeight: 700, opacity: 0.7, zIndex: 10 }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 4, direction: 'ltr' }}>
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Miniature Store Header */}
        <div style={{
          height: 48, borderBottom: `1px solid ${form.selected_theme === 'classic' ? '#e5e7eb' : '#27272a'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
          background: form.selected_theme === 'classic' ? 'rgba(255,255,255,0.8)' : (form.selected_theme === 'luxury' ? 'rgba(24,24,27,0.8)' : 'rgba(15,15,25,0.85)'),
          backdropFilter: 'blur(10px)',
          zIndex: 5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800
            }}>
              🏪
            </div>
            <div style={{ overflow: 'hidden', maxWidth: 110 }}>
              <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.name || 'اسم المتجر'}</div>
              <div style={{ fontSize: 7, color: form.accent_color, fontWeight: 700 }}>مفتوح 🟢</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span>🔍</span>
            <span style={{ position: 'relative' }}>
              🛒
              <span style={{
                position: 'absolute', top: -4, right: -4, background: form.accent_color, color: '#fff',
                fontSize: 7, padding: '0 3px', borderRadius: '50%', fontWeight: 900
              }}>2</span>
            </span>
          </div>
        </div>

        {/* Mini Banner/Info */}
        <div style={{ padding: '12px 12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: form.selected_theme === 'classic' ? '#6b7280' : '#a1a1aa', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {form.description || 'وصف المتجر هنا...'}
          </div>
        </div>

        {/* Category List Mockup */}
        <div style={{ display: 'flex', gap: 6, padding: '0 12px 6px', overflowX: 'hidden' }}>
          <span style={{
            fontSize: 9, padding: '4px 10px', borderRadius: 20,
            background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`, color: '#fff', fontWeight: 800
          }}>الكل</span>
          {['جديد 🔥', 'الأكثر طلباً'].map(cat => (
            <span key={cat} style={{
              fontSize: 9, padding: '4px 10px', borderRadius: 20,
              background: form.selected_theme === 'classic' ? '#e5e7eb' : '#27272a',
              color: form.selected_theme === 'classic' ? '#374151' : '#d4d4d8',
              fontWeight: 700
            }}>{cat}</span>
          ))}
        </div>

        {/* Mini Product Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12, flex: 1, overflowY: 'hidden', alignContent: 'start'
        }}>
          {[
            { id: 1, name: 'منتج تجريبي 1', price: 99 },
            { id: 2, name: 'منتج تجريبي 2', price: 150 }
          ].map(prod => (
            <div key={prod.id} style={{
              borderRadius: 10, overflow: 'hidden',
              background: form.selected_theme === 'classic' ? '#fff' : (form.selected_theme === 'luxury' ? '#18181b' : 'rgba(255,255,255,0.03)'),
              border: `1px solid ${form.selected_theme === 'classic' ? '#e5e7eb' : '#27272a'}`,
              display: 'flex', flexDirection: 'column', padding: 6
            }}>
              <div style={{ width: '100%', aspectRatio: '1/1', background: form.selected_theme === 'classic' ? '#f3f4f6' : '#27272a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                🛍️
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, margin: '4px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: form.accent_color }}>{prod.price} {form.currency}</span>
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 900
                }}>+</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Checkout Bar */}
        <div style={{
          padding: '8px 12px 16px',
          borderTop: `1px solid ${form.selected_theme === 'classic' ? '#e5e7eb' : '#27272a'}`,
          background: form.selected_theme === 'classic' ? '#fff' : (form.selected_theme === 'luxury' ? '#18181b' : 'rgba(10,10,20,0.9)')
        }}>
          <div style={{
            height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px',
            color: '#fff', fontSize: 10, fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <span>السلة (2)</span>
            <span>249 {form.currency} ←</span>
          </div>
        </div>
      </div>
    </div>

    <style>{`
      @media (max-width: 1024px) {
        .settings-preview-col { display: none !important; }
      }
    `}</style>
  </div>
  )
}
