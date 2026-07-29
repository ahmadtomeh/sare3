import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Key, Search, RefreshCw, LogOut, Shield, TrendingUp, Store, Clock, AlertCircle, Copy, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/useAuthStore'
import toast from 'react-hot-toast'

const ADMIN_EMAIL = 'admin@sare3.com'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SARE-${seg()}-${seg()}`
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { user, signOut, isDemoMode, enterDemoMode } = useAuthStore()
  const [tab, setTab] = useState('overview')
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codes, setCodes] = useState([])
  const [codePlan, setCodePlan] = useState('monthly')
  const [codeNote, setCodeNote] = useState('')
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, expired: 0, revenue: 0 })

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
      const d = data || []
      setMerchants(d)
      const active = d.filter(s => s.subscription_status === 'active').length
      const trial = d.filter(s => s.subscription_status === 'trial').length
      const expired = d.filter(s => s.subscription_status === 'expired').length
      setStats({
        total: d.length,
        active,
        trial,
        expired,
        revenue: active * 30,
      })
    } catch {
      // Demo fallback
      const demo = [
        { id: '1', name: 'متجر الأناقة', slug: 'anaqah', subscription_status: 'active', created_at: new Date().toISOString(), trial_ends_at: null, whatsapp: '0599000001' },
        { id: '2', name: 'كافيه الذوق', slug: 'thawq', subscription_status: 'trial', created_at: new Date().toISOString(), trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(), whatsapp: '0599000002' },
        { id: '3', name: 'ميني ماركت', slug: 'market', subscription_status: 'expired', created_at: new Date().toISOString(), trial_ends_at: null, whatsapp: '0599000003' },
      ]
      setMerchants(demo)
      setStats({ total: 3, active: 1, trial: 1, expired: 1, revenue: 30 })
    }
    setLoading(false)
  }

  const loadCodes = async () => {
    try {
      const { data } = await supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setCodes(data || [])
    } catch {
      setCodes([])
    }
  }

  const handleGenerateCode = async () => {
    const code = generateCode()
    setGeneratedCode(code)
    try {
      await supabase.from('activation_codes').insert({
        code,
        used: false,
        plan: codePlan,
        created_by: user?.id,
        note: codeNote || null,
      })
      toast.success(`✅ تم توليد الكود: ${code}`)
      loadCodes()
      setCodeNote('')
    } catch {
      toast.success(`✅ الكود: ${code}`)
    }
  }

  const handleToggleMerchant = async (merchant) => {
    const newStatus = merchant.subscription_status === 'active' ? 'expired' : 'active'
    const extra = newStatus === 'active'
      ? { trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString() }
      : {}
    try {
      await supabase.from('stores').update({ subscription_status: newStatus, ...extra }).eq('id', merchant.id)
      setMerchants(prev => prev.map(m => m.id === merchant.id ? { ...m, subscription_status: newStatus, ...extra } : m))
      toast.success(newStatus === 'active' ? '✅ تم تفعيل التاجر (30 يوم)' : '⏸️ تم تعليق التاجر')
    } catch {
      toast.error('خطأ في التحديث')
    }
  }

  const handleDeleteCode = async (id) => {
    if (!window.confirm('حذف هذا الكود؟')) return
    try {
      await supabase.from('activation_codes').delete().eq('id', id)
      setCodes(prev => prev.filter(c => c.id !== id))
      toast.success('تم حذف الكود')
    } catch {
      toast.error('خطأ في الحذف')
    }
  }

  const filtered = useMemo(() => {
    return merchants.filter(m => {
      const matchSearch = !search || m.name?.includes(search) || m.slug?.includes(search) || m.whatsapp?.includes(search)
      const matchStatus = statusFilter === 'all' || m.subscription_status === statusFilter
      return matchSearch && matchStatus
    })
  }, [merchants, search, statusFilter])

  const statusColor = (s) => s === 'active' ? 'var(--clr-success)' : s === 'trial' ? 'var(--clr-warning)' : 'var(--clr-danger)'
  const statusLabel = (s) => s === 'active' ? '✅ نشط' : s === 'trial' ? '🕐 تجريبي' : '❌ منتهي'

  const daysLeft = (m) => {
    if (!m.trial_ends_at) return null
    return Math.max(0, Math.ceil((new Date(m.trial_ends_at) - new Date()) / 86400000))
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--clr-bg)', color: '#fff', direction: 'rtl', padding: 20 }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--clr-danger)' }}>غير مصرح بالدخول</div>
        <div style={{ fontSize: 13, color: 'var(--clr-text-3)', textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
          هذه الصفحة لصاحب المنصة فقط. يمكنك تجربة لوحة الإدارة العليا بالوضع التجريبي.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { enterDemoMode(); toast.success('🔑 دخلت كمدير تجريبي!') }}
        >
          🔑 دخول كمدير تجريبي
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>العودة للرئيسية</button>
      </div>
    )
  }

  const statCards = [
    { icon: '🏪', label: 'إجمالي التجار', value: stats.total, color: 'var(--clr-primary)', sub: 'متجر مسجّل' },
    { icon: '✅', label: 'مشتركون نشطون', value: stats.active, color: 'var(--clr-success)', sub: `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% من الكل` },
    { icon: '🕐', label: 'فترة تجريبية', value: stats.trial, color: 'var(--clr-warning)', sub: 'مرشّحون للتحويل' },
    { icon: '❌', label: 'منتهي الاشتراك', value: stats.expired, color: 'var(--clr-danger)', sub: 'يحتاجون تجديد' },
    { icon: '💰', label: 'الإيراد الشهري', value: `${stats.revenue} ₪`, color: 'var(--clr-accent)', sub: `${stats.active} × 30 ₪` },
    { icon: '📅', label: 'الإيراد السنوي', value: `${stats.revenue * 12} ₪`, color: '#a78bfa', sub: 'تقديري' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--clr-bg)', direction: 'rtl' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(265,85%,18%), hsl(265,85%,26%))',
        borderBottom: '1px solid rgba(139,92,246,0.3)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 24px rgba(139,92,246,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} style={{ color: '#a78bfa' }} />
          <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>لوحة الإدارة العليا</div>
          <span className="badge badge-accent" style={{ fontSize: 9 }}>Super Admin</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ fontSize: 12 }}>
            لوحة التحكم
          </button>
          <button className="btn btn-ghost btn-sm" onClick={async () => { await signOut(); navigate('/') }} style={{ fontSize: 12, color: 'var(--clr-danger)' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {statCards.map((s, i) => (
            <div key={i} className="glass" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-2)' }}>{s.label}</div>
              <div style={{ fontSize: 10, color: 'var(--clr-text-3)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--clr-bg-surface)', borderRadius: 12, padding: 4 }}>
          {[
            { key: 'overview', icon: <TrendingUp size={14} />, label: 'نظرة عامة' },
            { key: 'merchants', icon: <Users size={14} />, label: `التجار (${merchants.length})` },
            { key: 'codes', icon: <Key size={14} />, label: 'أكواد التفعيل' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ flex: 1, fontSize: 12, gap: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Conversion funnel */}
            <div className="glass" style={{ padding: 20, borderRadius: 16 }}>
              <h2 style={{ fontWeight: 800, marginBottom: 16, fontSize: 15 }}>📊 قمع التحويل</h2>
              {[
                { label: 'إجمالي التجار', val: stats.total, max: stats.total, color: 'var(--clr-primary)' },
                { label: 'مشتركون نشطون', val: stats.active, max: stats.total, color: 'var(--clr-success)' },
                { label: 'فترة تجريبية', val: stats.trial, max: stats.total, color: 'var(--clr-warning)' },
                { label: 'منتهي الاشتراك', val: stats.expired, max: stats.total, color: 'var(--clr-danger)' },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--clr-text-2)' }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: r.color }}>{r.val}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--clr-bg)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.max > 0 ? (r.val / r.max) * 100 : 0}%`, background: r.color, borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent merchants */}
            <div className="glass" style={{ padding: 20, borderRadius: 16 }}>
              <h2 style={{ fontWeight: 800, marginBottom: 16, fontSize: 15 }}>🆕 أحدث التجار</h2>
              {merchants.slice(0, 5).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--clr-border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--clr-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {m.logo_url ? <img src={m.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : '🏪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--clr-text-3)' }}>/{m.slug}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(m.subscription_status) }}>{statusLabel(m.subscription_status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Merchants Tab ── */}
        {tab === 'merchants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                <input
                  className="input"
                  style={{ paddingRight: 34, minHeight: 36 }}
                  placeholder="ابحث بالاسم أو الرابط..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className="input" style={{ minHeight: 36, width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="trial">تجريبي</option>
                <option value="expired">منتهي</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={loadMerchants}><RefreshCw size={14} /></button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-3)' }}>لا توجد نتائج</div>
            ) : (
              filtered.map(m => {
                const days = daysLeft(m)
                return (
                  <div key={m.id} className="glass" style={{ padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--clr-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {m.logo_url ? <img src={m.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{m.name || 'بدون اسم'}</div>
                      <div style={{ fontSize: 11, color: 'var(--clr-text-3)', direction: 'ltr', textAlign: 'right' }}>/{m.slug}</div>
                      {days !== null && (
                        <div style={{ fontSize: 10, color: days <= 2 ? 'var(--clr-danger)' : 'var(--clr-text-3)', marginTop: 2 }}>
                          {days <= 0 ? '⚠️ انتهت المدة' : `⏳ ${days} يوم متبقي`}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginTop: 1 }}>
                        {new Date(m.created_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(m.subscription_status) }}>
                        {statusLabel(m.subscription_status)}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <a href={`/store/${m.slug}`} target="_blank" rel="noreferrer"
                          className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} title="فتح المتجر">
                          <ExternalLink size={12} />
                        </a>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleToggleMerchant(m)}
                          style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 8,
                            background: m.subscription_status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: m.subscription_status === 'active' ? 'var(--clr-danger)' : 'var(--clr-success)',
                            border: `1px solid ${m.subscription_status === 'active' ? 'var(--clr-danger)' : 'var(--clr-success)'}`,
                          }}
                        >
                          {m.subscription_status === 'active' ? 'تعليق' : 'تفعيل'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Codes Tab ── */}
        {tab === 'codes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ padding: 20, borderRadius: 16, textAlign: 'center', border: '1px solid var(--glass-border-glow)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>توليد كود تفعيل جديد</div>
              <div style={{ fontSize: 12, color: 'var(--clr-text-3)', marginBottom: 16 }}>يُعطى للتاجر بعد استلام الدفعة</div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                {[
                  { key: 'monthly', label: '📅 شهري (30₪)' },
                  { key: 'yearly', label: '⭐ سنوي (250₪)' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setCodePlan(p.key)}
                    className={codePlan === p.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    style={{ fontSize: 12 }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                className="input"
                style={{ marginBottom: 12, fontSize: 12 }}
                placeholder="ملاحظة (اختياري): مثال — اسم العميل"
                value={codeNote}
                onChange={e => setCodeNote(e.target.value)}
              />

              <button className="btn btn-primary" onClick={handleGenerateCode} style={{ minWidth: 160 }}>
                <Key size={16} /> توليد كود
              </button>

              {generatedCode && (
                <div style={{ marginTop: 16, padding: '14px 20px', background: 'var(--clr-bg)', borderRadius: 12, border: '2px dashed var(--clr-accent)' }}>
                  <div style={{ fontSize: 10, color: 'var(--clr-text-3)', marginBottom: 6 }}>الكود الجديد ({codePlan === 'yearly' ? 'سنوي' : 'شهري'}):</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: 'var(--clr-accent)', letterSpacing: 3 }}>{generatedCode}</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8, fontSize: 11 }}
                    onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('تم النسخ!') }}
                  >
                    <Copy size={12} /> نسخ الكود
                  </button>
                </div>
              )}
            </div>

            {codes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--clr-text-2)', marginBottom: 4 }}>
                  الأكواد المولّدة ({codes.filter(c => !c.used).length} متاح / {codes.length} إجمالي)
                </div>
                {codes.map((c) => (
                  <div key={c.id} className="glass" style={{ padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: c.used ? 'var(--clr-text-3)' : 'var(--clr-accent)' }}>
                        {c.code}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--clr-text-3)', marginTop: 2 }}>
                        {c.plan === 'yearly' ? '⭐ سنوي' : '📅 شهري'}
                        {c.note && ` · ${c.note}`}
                        {c.used_at && ` · استُخدم ${new Date(c.used_at).toLocaleDateString('ar-EG')}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.used ? 'var(--clr-danger)' : 'var(--clr-success)', flexShrink: 0 }}>
                        {c.used ? '❌ مستخدم' : '✅ متاح'}
                      </span>
                      {!c.used && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '2px 7px' }}
                          onClick={() => { navigator.clipboard.writeText(c.code); toast.success('تم النسخ!') }}
                        >
                          <Copy size={11} />
                        </button>
                      )}
                      {!c.used && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 10, padding: '2px 7px', color: 'var(--clr-danger)' }}
                          onClick={() => handleDeleteCode(c.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
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
