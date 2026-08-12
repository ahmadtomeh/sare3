import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── تسجيل الـ Service Worker الأساسي للإشعارات والـ PWA ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('✅ ServiceWorker registered:', reg.scope))
      .catch((err) => console.warn('❌ ServiceWorker registration failed:', err))
  })
}

// ── طلب تخزين دائم لمنع Chrome من حذف التطبيق تلقائياً ──
if ('storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persist().then((granted) => {
    if (granted) console.log('✅ Persistent storage granted - PWA won\'t be auto-removed')
  })
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
