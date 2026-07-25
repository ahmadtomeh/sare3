import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useStoreConfig } from '../../stores/useStoreConfig'
import toast from 'react-hot-toast'

export default function QRGenerator() {
  const { store } = useStoreConfig()
  const qrRef = useRef()

  const storeUrl = store?.slug
    ? `${window.location.origin}/store/${store.slug}`
    : 'https://sare3.app/store/my-store'

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl)
    toast.success('✅ تم نسخ الرابط!')
  }

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 440
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 440)

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 20, 20, 360, 360)
      ctx.fillStyle = '#1a1a2e'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(store?.name || 'متجري على سريع', 200, 420)

      const link = document.createElement('a')
      link.download = `qr-${store?.slug || 'store'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    toast.success('✅ تم تنزيل QR Code!')
  }

  const shareOnWhatsApp = () => {
    const msg = `🛍️ تسوق من متجري الإلكتروني ${store?.name || ''}\n\n👇 انقر الرابط وتصفح المنتجات:\n${storeUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)', maxWidth: 600 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">الرابط والـ QR Code 🔗</h1>
          <p className="page-subtitle">شارك متجرك مع زبائنك بسهولة</p>
        </div>
      </div>

      {/* Store URL */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>رابط متجرك المباشر 🔗</h2>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'center', background: 'var(--glass-bg-2)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
          <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--clr-accent)', direction: 'ltr', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {storeUrl}
          </span>
          <button className="btn btn-primary btn-sm" onClick={copyLink} id="copy-url-btn">
            نسخ
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 'var(--sp-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={shareOnWhatsApp} id="share-wa-btn" style={{ color: '#25D366' }}>
            📱 مشاركة عبر الواتساب
          </button>
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            id="open-store-btn"
          >
            👁️ فتح المتجر
          </a>
        </div>
      </div>

      {/* QR Code */}
      <div className="glass" style={{ padding: 'var(--sp-xl)', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-lg)', fontSize: 'var(--text-lg)' }}>رمز QR Code للطباعة 🖨️</h2>

        <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-lg)' }}>
          <div className="qr-container" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <QRCodeSVG
              value={storeUrl}
              size={240}
              bgColor="#ffffff"
              fgColor="#1a1a2e"
              level="H"
              includeMargin={true}
            />
            <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
              {store?.name || 'متجري'}
              <br />
              <span style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>
                امسح للتسوق 🛍️
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={downloadQR} id="download-qr-btn">
            ⬇️ تنزيل QR Code (PNG)
          </button>
        </div>

        <div className="glass-2" style={{ marginTop: 'var(--sp-xl)', padding: 'var(--sp-md)', textAlign: 'right' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 نصائح للاستخدام:</div>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-3)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>✓ اطبعه وعلّقه في واجهة محلك</li>
            <li>✓ ضعه على بطاقة العمل الخاصة بك</li>
            <li>✓ انشره في قصص الإنستغرام والفيسبوك</li>
            <li>✓ أضفه في bio الإنستغرام كرابط مباشر</li>
          </ul>
        </div>
      </div>

      {/* Social Share Links */}
      <div className="glass" style={{ padding: 'var(--sp-xl)' }}>
        <h2 style={{ fontWeight: 700, marginBottom: 'var(--sp-md)', fontSize: 'var(--text-lg)' }}>مشاركة سريعة 📤</h2>
        <div style={{ display: 'flex', gap: 'var(--sp-md)', flexWrap: 'wrap' }}>
          {[
            {
              label: 'واتساب', color: '#25D366', emoji: '💬',
              url: `https://wa.me/?text=${encodeURIComponent(`🛍️ تسوق من ${store?.name || 'متجري'}\n${storeUrl}`)}`,
            },
            {
              label: 'تيليغرام', color: '#2AABEE', emoji: '✈️',
              url: `https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(`🛍️ تسوق من ${store?.name || 'متجري'}`)}`,
            },
            {
              label: 'فيسبوك', color: '#1877F2', emoji: '📘',
              url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`,
            },
          ].map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ color: s.color, borderColor: s.color + '40', flex: 1, minWidth: 120, justifyContent: 'center' }}
            >
              {s.emoji} {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
