import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { signIn, signUp, user, enterDemoMode } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user || useAuthStore.getState().isDemoMode) {
      const isAdmin = user?.email === 'admin@fawri.shop' || user?.user_metadata?.role === 'super_admin'
      navigate(isAdmin ? '/admin' : '/dashboard')
    }
  }, [user])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp({ email: form.email, password: form.password, name: form.name })
        // Auto sign-in immediately after signup (email confirmation is disabled)
        try {
          const res = await signIn({ email: form.email, password: form.password })
          const isAdmin = res?.user?.email === 'admin@fawri.shop' || res?.user?.user_metadata?.role === 'super_admin'
          toast.success(isAdmin ? 'أهلاً بك يا مدير المنصة! 👑' : 'مرحباً بك! أنشئ متجرك الآن ⚡')
          navigate(isAdmin ? '/admin' : '/dashboard')
        } catch {
          toast.success('تم إنشاء حسابك — سجّل دخولك الآن')
          setMode('signin')
        }
      } else {
        const res = await signIn({ email: form.email, password: form.password })
        const isAdmin = res?.user?.email === 'admin@fawri.shop' || res?.user?.user_metadata?.role === 'super_admin'
        toast.success(isAdmin ? 'مرحباً بعودتك يا مدير المنصة! 👑' : 'أهلاً بك مجدداً! 👋')
        navigate(isAdmin ? '/admin' : '/dashboard')
      }
    } catch (err) {
      const msgMap = {
        'Invalid login credentials': 'البريد أو كلمة المرور غير صحيحة',
        'Email not confirmed': 'يرجى تفعيل حسابك من البريد الإلكتروني',
        'User already registered': 'البريد الإلكتروني مسجّل بالفعل',
      }
      toast.error(msgMap[err.message] || err.message || 'حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  // Demo mode: skip auth
  const handleDemo = () => {
    enterDemoMode()
    navigate('/dashboard')
    toast.success('أهلاً بوضع التجربة! 🎮 يمكنك استكشاف جميع الميزات')
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 'var(--sp-lg)',
      background: 'var(--clr-bg)',
    }}>
      {/* Bg orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'var(--clr-primary)', opacity: 0.12, filter: 'blur(80px)', top: -100, right: -100 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'var(--clr-accent)', opacity: 0.1, filter: 'blur(80px)', bottom: -100, left: -100 }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Back */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/')}
          style={{ marginBottom: 'var(--sp-lg)', display: 'flex', gap: 6 }}
        >
          <ArrowLeft size={16} />
          الرئيسية
        </button>

        <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
          {/* Logo */}
          <div className="text-center" style={{ marginBottom: 'var(--sp-xl)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-sm)' }}>
              <Zap size={40} style={{ color: 'var(--clr-primary)', display: 'inline' }} />
            </div>
            <h1 className="gradient-text" style={{ fontSize: 'var(--text-2xl)', fontWeight: 900 }}>فوري</h1>
            <p style={{ color: 'var(--clr-text-3)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
              {mode === 'signup' ? 'أنشئ حسابك وابدأ مجاناً' : 'مرحباً بعودتك'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="live-switcher" style={{ marginBottom: 'var(--sp-xl)', width: '100%' }}>
            <button
              className={`live-switcher-btn ${mode === 'signin' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setMode('signin')}
              id="auth-signin-tab"
            >
              تسجيل الدخول
            </button>
            <button
              className={`live-switcher-btn ${mode === 'signup' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setMode('signup')}
              id="auth-signup-tab"
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
            {mode === 'signup' && (
              <div className="input-group">
                <label className="input-label">الاسم الكامل</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                  <input
                    name="name"
                    type="text"
                    className="input"
                    placeholder="محمد أحمد"
                    value={form.name}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: 44 }}
                    id="auth-name-input"
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                <input
                  name="email"
                  type="email"
                  className="input"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: 44, direction: 'ltr', textAlign: 'right' }}
                  id="auth-email-input"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  style={{ paddingRight: 44, paddingLeft: 44, direction: 'ltr' }}
                  id="auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'signup' && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)' }}>6 أحرف على الأقل</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              id="auth-submit-btn"
              style={{ marginTop: 'var(--sp-sm)' }}
            >
              {loading ? (
                <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block' }} />
              ) : (
                <>
                  <Zap size={16} />
                  {mode === 'signup' ? 'إنشاء الحساب مجاناً' : 'تسجيل الدخول'}
                </>
              )}
            </button>
          </form>

          <div style={{ position: 'relative', margin: 'var(--sp-lg) 0', textAlign: 'center' }}>
            <div className="divider" />
            <span style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--glass-bg)', padding: '0 12px',
              fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)',
            }}>أو</span>
          </div>

          <button
            className="btn btn-full"
            onClick={handleDemo}
            id="auth-demo-btn"
            style={{
              border: '1px dashed var(--clr-accent)',
              background: 'rgba(16,185,129,0.08)',
              color: 'var(--clr-accent)',
              fontWeight: 800,
            }}
          >
            🎮 جرب بدون حساب (وضع التجربة)
          </button>

          {mode === 'signup' && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-3)', textAlign: 'center', marginTop: 'var(--sp-md)', lineHeight: 1.6 }}>
              بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
