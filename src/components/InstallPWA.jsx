import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function InstallPWA({ appName, logoUrl }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already running as installed app (PWA standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setIsStandalone(standalone)
    if (standalone) return

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    // Capture Android/Desktop PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('sare3-pwa-dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show iOS guide if mobile iOS and not dismissed
    if (ios && !localStorage.getItem('sare3-pwa-dismissed')) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('sare3-pwa-dismissed', 'true')
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 16,
      right: 16,
      maxWidth: 420,
      margin: '0 auto',
      zIndex: 9999,
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div className="glass animate-glow" style={{
        padding: '14px 16px',
        borderRadius: 16,
        border: '1px solid var(--clr-primary)',
        background: 'linear-gradient(135deg, hsla(265, 85%, 15%, 0.95), hsla(240, 20%, 10%, 0.95))',
        boxShadow: '0 12px 32px rgba(124, 58, 237, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        direction: 'rtl',
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--clr-primary)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontSize: 22,
          flexShrink: 0,
          boxShadow: '0 4px 12px var(--clr-primary-glow)',
          overflow: 'hidden'
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={appName || 'logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            '📲'
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', marginBottom: 2 }}>
            {appName ? `ثبّت تطبيق "${appName}"` : 'ثبّت التطبيق على هاتفك'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--clr-text-3)', lineHeight: 1.3 }}>
            {isIOS
              ? 'اضغط زر المشاركة ⎋ ثم اختر (إضافة إلى الشاشة الرئيسية ➕)'
              : 'احصل على تجربة تطبيق سريعة وبدون إنترنت'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!isIOS && deferredPrompt && (
            <button
              className="btn btn-primary btn-sm animate-glow"
              onClick={handleInstallClick}
              style={{ fontSize: 11, padding: '6px 12px', minHeight: 32, gap: 4 }}
            >
              <Download size={14} /> تثبيت
            </button>
          )}

          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 26,
              height: 26,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
