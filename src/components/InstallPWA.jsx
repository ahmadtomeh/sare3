import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPWA({ appName, logoUrl }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  const [displayName, setDisplayName] = useState(appName || '')
  const [displayLogo, setDisplayLogo] = useState(logoUrl || '')

  useEffect(() => {
    const updateName = () => {
      if (appName) {
        setDisplayName(appName)
      } else {
        const title = typeof document !== 'undefined' && document.title ? document.title.split('—')[0].trim() : ''
        if (title && title !== 'سريع') {
          setDisplayName(title)
        }
      }
      if (logoUrl) setDisplayLogo(logoUrl)
    }

    updateName()
    const timer = setInterval(updateName, 500)
    return () => clearInterval(timer)
  }, [appName, logoUrl])

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setIsStandalone(standalone)
    if (standalone) return

    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const dismissed = localStorage.getItem('sare3-pwa-dismissed')
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if (ios && !localStorage.getItem('sare3-pwa-dismissed')) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
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
      zIndex: 99999,
      background: 'rgba(15, 17, 26, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: 16,
      padding: '12px 14px',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--clr-primary-glow)',
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
        {displayLogo ? (
          <img src={displayLogo} alt={displayName || 'logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          '📲'
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', marginBottom: 2 }}>
          {`ثبّت تطبيق "${displayName || 'المتجر'}"`}
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
  )
}
