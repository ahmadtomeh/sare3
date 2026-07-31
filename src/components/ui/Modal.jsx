import { X } from 'lucide-react'
import { useEffect } from 'react'

export function Modal({ children, onClose, title, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal glass ${size === 'lg' ? 'modal-lg' : ''}`} style={size === 'lg' ? { maxWidth: 720 } : {}}>
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="modal-close" onClick={onClose} aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function BottomSheet({ children, onClose, title }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet glass" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />
        {title && (
          <div className="modal-header" style={{ padding: '0 4px 16px' }}>
            <h3 className="modal-title">{title}</h3>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        )}
        {children}
      </div>
    </>
  )
}
