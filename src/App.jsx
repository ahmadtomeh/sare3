import { Component, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useThemeStore } from './stores/useThemeStore'
import Toast from './components/ui/Toast'
import InstallPWA from './components/InstallPWA'

import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import OnboardingWizard from './pages/OnboardingWizard'
import MerchantDashboard from './pages/MerchantDashboard'
import CustomerStorefront from './pages/CustomerStorefront'
import AdminPanel from './pages/AdminPanel'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          padding: 20,
          background: 'var(--clr-bg, #0d0d12)',
          color: '#fff',
          textAlign: 'center',
          direction: 'rtl',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>حدث خطأ مفاجئ</h2>
          <p style={{ fontSize: 13, color: 'var(--clr-text-3, #999)', marginBottom: 20, maxWidth: 360 }}>
            {this.state.error?.message || 'تم تحديث التطبيق — أعد التحميل للمتابعة'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', borderRadius: 12, fontWeight: 700 }}
          >
            🔄 إعادة تحميل التطبيق
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppLoader() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid var(--clr-primary-glow, rgba(124,58,237,0.3))',
          borderTop: '3px solid var(--clr-primary, #7c3aed)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)' }}>جاري التحميل...</div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { loading } = useAuthStore()
  if (loading) return <AppLoader />
  return children
}

function AppRoutes() {
  const { init } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
    init()
  }, [])

  return (
    <Routes>
      <Route path="/"              element={<LandingPage />} />
      <Route path="/auth"          element={<AuthPage />} />
      <Route path="/onboarding"    element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
      <Route path="/dashboard"     element={<ProtectedRoute><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/*"   element={<ProtectedRoute><MerchantDashboard /></ProtectedRoute>} />
      <Route path="/admin"         element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/:slug"         element={<CustomerStorefront />} />
      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <Toast />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
