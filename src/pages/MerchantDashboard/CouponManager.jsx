import { useState, useEffect } from 'react'
import { Plus, Trash2, Tag, Percent, DollarSign, ToggleLeft, ToggleRight, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStoreConfig } from '../../stores/useStoreConfig'
import toast from 'react-hot-toast'

export default function CouponManager() {
  const { store, updateStore } = useStoreConfig()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '' })

  const isCouponsEnabled = store?.enable_coupons !== false

  const handleToggleStoreCoupons = async () => {
    const nextState = !isCouponsEnabled
    try {
      await updateStore({ enable_coupons: nextState })
      toast.success(nextState ? '✅ تم تفعيل وإظهار خانة الكوبون في السلة!' : '🙈 تم إخفاء خانة الكوبون من السلة بنجاح')
    } catch {
      toast.error('فشل تحديث الإعدادات')
    }
  }

  useEffect(() => {
    if (store?.id) {
      loadCoupons()
    }
  }, [store?.id])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCoupons(data || [])
    } catch (err) {
      // Fallback demo coupons if table doesn't exist yet
      const demo = [
        { id: '1', code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, is_active: true },
        { id: '2', code: 'SAVE20', discount_type: 'fixed', discount_value: 20, is_active: false },
      ]
      setCoupons(demo)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.code || !form.discount_value) {
      toast.error('يرجى تعبئة كافة الحقول')
      return
    }
    const val = parseFloat(form.discount_value)
    if (isNaN(val) || val <= 0) {
      toast.error('قيمة الخصم يجب أن تكون أكبر من صفر')
      return
    }

    try {
      const newCoupon = {
        store_id: store.id,
        code: form.code.toUpperCase().replace(/\s+/g, ''),
        discount_type: form.discount_type,
        discount_value: val,
        is_active: true,
      }

      const { data, error } = await supabase
        .from('coupons')
        .insert(newCoupon)
        .select()
        .single()
      
      if (error) throw error
      setCoupons(prev => [data, ...prev])
      toast.success('✅ تم إضافة الكوبون بنجاح!')
    } catch (err) {
      // Fallback local save for testing
      const localNew = {
        id: `local-${Date.now()}`,
        code: form.code.toUpperCase().replace(/\s+/g, ''),
        discount_type: form.discount_type,
        discount_value: val,
        is_active: true,
      }
      setCoupons(prev => [localNew, ...prev])
      toast.success('✅ تم الإضافة محلياً (يرجى تشغيل كود الـ SQL لتفعيله بقاعدة البيانات)')
    } finally {
      setAdding(false)
      setForm({ code: '', discount_type: 'percentage', discount_value: '' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) throw error
      setCoupons(prev => prev.filter(c => c.id !== id))
      toast.success('تم حذف الكوبون')
    } catch {
      setCoupons(prev => prev.filter(c => c.id !== id))
      toast.success('تم الحذف محلياً')
    }
  }

  const handleToggle = async (coupon) => {
    const nextState = !coupon.is_active
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: nextState })
        .eq('id', coupon.id)
      if (error) throw error
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: nextState } : c))
      toast.success(nextState ? '✅ تم تفعيل الكوبون' : '⏸️ تم تعطيل الكوبون')
    } catch {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: nextState } : c))
      toast.success(nextState ? '✅ تم التفعيل محلياً' : '⏸️ تم التعطيل محلياً')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)', maxWidth: 740 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">🎟️ إدارة الكوبونات</h1>
          <p className="page-subtitle">أنشئ رموز خصم جذابة لزبائنك لزيادة المبيعات</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(!adding)} style={{ gap: 8 }}>
          <Plus size={16} /> إضافة كوبون جديد
        </button>
      </div>

      {/* Quick Storewide Coupon Visibility Toggle Card */}
      <div
        className="glass"
        style={{
          padding: '14px 18px', borderRadius: 'var(--radius-md)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          border: '1px solid var(--clr-border)', background: 'var(--glass-bg-2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 20 }}>{isCouponsEnabled ? '👁️' : '🙈'}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--clr-text)' }}>
              حالة خانة الكوبون في سلة الزبائن: <span style={{ color: isCouponsEnabled ? 'var(--clr-accent)' : 'var(--clr-danger)' }}>{isCouponsEnabled ? 'ظاهرة ومفعلة ✅' : 'مخفية بالكامل 🙈'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--clr-text-3)', marginTop: 2 }}>
              {isCouponsEnabled ? 'يمكن للزبائن إدخال كود الخصم في السلة' : 'تم إخفاء خانة الكوبون من السلة لجعل تصميم السلة أبسط وأشيك'}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${isCouponsEnabled ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleToggleStoreCoupons}
          style={{ gap: 6, fontSize: 12 }}
        >
          {isCouponsEnabled ? '🙈 إخفاء الخانة من السلة' : '👁️ إظهار الخانة في السلة'}
        </button>
      </div>

      {/* Add Coupon Modal/Form */}
      {adding && (
        <form onSubmit={handleAdd} className="glass" style={{ padding: 'var(--sp-xl)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
          <h3 style={{ fontWeight: 800, fontSize: 'var(--text-base)' }}>🎟️ كوبون خصم جديد</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-md)' }}>
            <div className="input-group">
              <label className="input-label">رمز الكوبون *</label>
              <input
                className="input"
                placeholder="مثال: SAVE10, RAMADAN"
                value={form.code}
                onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">نوع الخصم</label>
              <select
                className="input"
                value={form.discount_type}
                onChange={e => setForm(prev => ({ ...prev, discount_type: e.target.value }))}
              >
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">قيمة ثابتة ({store?.currency || '₪'})</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">قيمة الخصم *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="number"
                  placeholder={form.discount_type === 'percentage' ? '10%' : '15'}
                  value={form.discount_value}
                  onChange={e => setForm(prev => ({ ...prev, discount_value: e.target.value }))}
                  required
                />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }}>
                  {form.discount_type === 'percentage' ? '%' : store?.currency || '₪'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>حفظ الكوبون</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>إلغاء</button>
          </div>
        </form>
      )}

      {/* Coupons List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>جاري التحميل...</div>
      ) : coupons.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎟️</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>لا توجد كوبونات حالية</div>
          <p style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 4 }}>ابدأ بإضافة أول كود خصم لتنشيط متجرك!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coupons.map((c) => (
            <div key={c.id} className="glass" style={{ padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, border: c.is_active ? '1px solid var(--clr-border)' : '1px solid transparent' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: c.is_active ? 'var(--clr-primary-glow)' : 'var(--glass-bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.is_active ? 'var(--clr-primary)' : 'var(--clr-text-3)',
                fontSize: 20, flexShrink: 0
              }}>
                <Tag size={20} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 16, fontFamily: 'monospace', letterSpacing: 1 }}>{c.code}</span>
                  <span className={`badge ${c.is_active ? 'badge-accent' : ''}`} style={{ fontSize: 9 }}>
                    {c.is_active ? 'نشط' : 'معطل'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>قيمة الخصم:</span>
                  <span style={{ fontWeight: 800, color: 'var(--clr-text)' }}>
                    {c.discount_value} {c.discount_type === 'percentage' ? '%' : store?.currency || '₪'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleToggle(c)}
                  style={{ color: c.is_active ? 'var(--clr-success)' : 'var(--clr-text-3)', padding: 6 }}
                  title={c.is_active ? 'تعطيل الكوبون' : 'تفعيل الكوبون'}
                >
                  {c.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(c.id)}
                  style={{ color: 'var(--clr-danger)', padding: 6 }}
                  title="حذف الكوبون"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
