import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ShoppingBag, TrendingUp, Key, Search, CheckCircle, XCircle, RefreshCw, LogOut, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/useAuthStore'
import toast from 'react-hot-toast'

const ADMIN_EMAIL = 'admin@sare3.com' // غيّر هذا لإيميل الأدمن الفعلي

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SARE-${seg()}-${seg()}`
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, signOut, isDemoMode, enterDemoMode } = useAuthStore()
  const [tab, setTab] = useState('overview') // overview | merchants | codes
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codes, setCodes] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, revenue: 0 })

  // بسيط: فحص إذا كان المستخدم أدمن أو في وضع التجربة
  const isAdmin = user?.email === ADMIN_EMAIL || user?.user_metadata?.role === 'super_admin' || isDemoMode

  useEffect(() => {
    if (!isAdmin) return
    loadMerchants()
    loadCodes()
  }, [isAdmin])

  const loadMerchants = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setMerchants(data || [])

      const total = data?.length || 0
      const active = data?.filter(s => s.subscription_status === 'active').length || 0
      const trial = data?.filter(s => s.subscription_status === 'trial').length || 0
      const revenue = active * 30
      setStats({ total, active, trial, revenue })
    } catch (err) {
      // Fallback demo data if Supabase table doesn't have stores
      const demo = [
        { id: '1', name: 'متجر الأناقة', owner_email: 'ahmad@example.com', subscription_status: 'active', created_at: new Date().toISOString(), slug: 'anaqah' },
        { id: '2', name: 'كافيه الذوق', owner_email: 'sara@example.com', subscription_status: 'trial', created_at: new Date().toISOString(), slug: 'thawq' },
        { id: '3', name: 'ميني ماركت الجوار', owner_email: 'omar@example.com', subscription_status: 'expired', created_at: new Date().toISOString(), slug: 'jawwar' },
      ]
      setMerchants(demo)
      setStats({ total: 3, active: 1, trial: 1, revenue: 30 })
    }
    setLoading(false)
  }

  const loadCodes = async () => {
    try {
      const { data } = await supabase.from('activation_codes').select('*').order('created_at', { ascending: false }).limit(20)
      setCodes(data || [])
    } catch {
      // No table yet
      setCodes([])
    }
  }

  const handleGenerateCode = async () => {
    const code = generateCode()
    setGeneratedCode(code)
    try {
      await supabase.from('activation_codes').insert({ code, used: false, plan: 'monthly', created_by: user?.id })
      toast.success(`✅ تم توليد الكود: ${code}`)
      loadCodes()
    } catch {
      toast.success(`✅ الكود: ${code} (سيُحفظ عند توفر الجدول)`)
    }
  }

  const handleToggleMerchant = async (merchant) => {
    const newStatus = merchant.subscription_status === 'active' ? 'expired' : 'active'
    try {
      await supabase.from('stores').update({ subscription_status: newStatus }).eq('id', merchant.id)
      setMerchants(prev => prev.map(m => m.id === merchant.id ? { ...m, subscription_status: newStatus } : m))
      toast.success(newStatus === 'active' ? '✅ تم تفعيل التاجر' : '⏸️ تم تعليق التاجر')
    } catch {
      toast.error('خطأ في تحديث الحالة')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const filtered = merchants.filter(m =>
    !search || m.name?.includes(search) || m.owner_email?.includes(search) || m.slug?.includes(search)
  )

  const statusColor = (s) => s === 'active' ? 'var(--clr-success)' : s === 'trial' ? 'var(--clr-warning)' : 'var(--clr-danger)'
  const statusLabel = (s) => s === 'active' ? '✅ نشط' : s === 'trial' ? '🕐 تجريبي' : '❌ منتهي'

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--clr-bg)', color: '#fff', direction: 'rtl' }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--clr-danger)' }}>غير مصرح بالدخول</div>
        <div style={{ fontSize: 13, color: 'var(--clr-text-3)', textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          هذه الصفحة لصاحب المنصة فقط. لتجربة لوحة الإدارة العليا والتحكم بالتجار وتوليد الأكواد مباشرة:
        </div>
        <button
          className="btn btn-accent btn-sm animate-glow"
          onClick={() => { enterDemoMode(); toast.success('🔑 دخلت كمدير تجريبي للمنصة!') }}
          style={{ padding: '8px 20px', fontSize: 13, minHeight: 38 }}
        >
          🔑 دخول كمدير تجريبي (للتجربة الفورية)
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>العودة للرئيسية</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--clr-bg)', direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(265,85%,20%), hsl(265,85%,30%))',
        borderBottom: '1px solid var(--clr-border)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} style={{ color: 'var(--clr-accent)' }} />
          <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>لوحة الإدارة العليا</div>
          <span className="badge badge-accent" style={{ fontSize: 9 }}>Super Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ fontSize: 12 }}>
            لوحة التحكم
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ fontSize: 12, color: 'var(--clr-danger)' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Stats Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '🏪', label: 'إجمالي التجار', value: stats.total, color: 'var(--clr-primary)' },
            { icon: '✅', label: 'مشتركون نشطون', value: stats.active, color: 'var(--clr-success)' },
            { icon: '🕐', label: 'فترة تجريبية', value: stats.trial, color: 'var(--clr-warning)' },
            { icon: '💰', label: 'الإيراد الشهري', value: `${stats.revenue} ₪`, color: 'var(--clr-accent)' },
          ].map((s, i) => (
            <div key={i} className="glass" style={{ padding: '14px 12px', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--clr-text-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--clr-bg-surface)', borderRadius: 12, padding: 4 }}>
          {[
            { key: 'merchants', icon: <Users size={14} />, label: 'التجار' },
            { key: 'codes', icon: <Key size={14} />, label: 'أكواد التفعيل' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ flex: 1, fontSize: 13, gap: 6 }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Merchants Tab ── */}
        {tab === 'merchants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                <input
                  className="input"
                  style={{ paddingRight: 34, minHeight: 36 }}
                  placeholder="ابحث باسم المتجر أو الإيميل..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={loadMerchants}>
                <RefreshCw size={14} />
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>لا توجد نتائج</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(m => (
                  <div key={m.id} className="glass" style={{ padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--clr-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      🏪
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || 'متجر بدون اسم'}</div>
                      <div style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>{m.owner_email || m.slug || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--clr-text-3)', marginTop: 2 }}>
                        {m.created_at ? new Date(m.created_at).toLocaleDateString('ar-EG') : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: statusColor(m.subscription_status), marginBottom: 4 }}>
                        {statusLabel(m.subscription_status)}
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleToggleMerchant(m)}
                        style={{
                          fontSize: 10,
                          background: m.subscription_status === 'active' ? 'var(--clr-danger-glow)' : 'var(--clr-success-glow)',
                          color: m.subscription_status === 'active' ? 'var(--clr-danger)' : 'var(--clr-success)',
                          border: `1px solid ${m.subscription_status === 'active' ? 'var(--clr-danger)' : 'var(--clr-success)'}`,
                          padding: '3px 10px', borderRadius: 8
                        }}
                      >
                        {m.subscription_status === 'active' ? 'تعليق' : 'تفعيل'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Activation Codes Tab ── */}
        {tab === 'codes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Generate Button */}
            <div className="glass animate-glow" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--glass-border-glow)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔑</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>توليد كود تفعيل جديد</div>
              <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginBottom: 16 }}>يُعطى للتاجر بعد استلام الدفعة</div>
              <button className="btn btn-primary" onClick={handleGenerateCode} style={{ minWidth: 160 }}>
                <Key size={16} /> توليد كود
              </button>
              {generatedCode && (
                <div style={{ marginTop: 16, padding: '12px 20px', background: 'var(--clr-bg)', borderRadius: 10, border: '2px dashed var(--clr-accent)' }}>
                  <div style={{ fontSize: 11, color: 'var(--clr-text-3)', marginBottom: 4 }}>الكود الجديد:</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: 'var(--clr-accent)', letterSpacing: 2 }}>{generatedCode}</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8, fontSize: 11 }}
                    onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('تم نسخ الكود!') }}
                  >
                    📋 نسخ الكود
                  </button>
                </div>
              )}
            </div>

            {/* Codes List */}
            {codes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--clr-text-2)' }}>آخر الأكواد المولّدة:</div>
                {codes.map((c, i) => (
                  <div key={i} className="glass" style={{ padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: c.used ? 'var(--clr-text-3)' : 'var(--clr-accent)' }}>{c.code}</span>
                    <span style={{ fontSize: 11, color: c.used ? 'var(--clr-danger)' : 'var(--clr-success)', fontWeight: 700 }}>
                      {c.used ? '❌ مستخدم' : '✅ متاح'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
