import { useEffect } from 'react'
import { X, ZoomIn } from 'lucide-react'

export default function ImageLightboxModal({ imageUrl, title, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!imageUrl) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'lightboxFadeIn 0.25s ease-out'
      }}
    >
      <style>{`
        @keyframes lightboxFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Top Header with Close Button */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        left: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
          {title || 'معاينة الصورة 🔍'}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Centered High-Res Image */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
        }}
      >
        <img
          src={imageUrl}
          alt={title || 'Product Full Preview'}
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '82vh',
            objectFit: 'contain',
            borderRadius: 16
          }}
        />
      </div>
    </div>
  )
}
