import { Eye, LayoutDashboard } from 'lucide-react'

export default function LiveViewSwitcher({ view, onChange }) {
  return (
    <div className="live-switcher">
      <button
        className={`live-switcher-btn ${view === 'dashboard' ? 'active' : ''}`}
        onClick={() => onChange('dashboard')}
        id="switcher-dashboard"
      >
        <LayoutDashboard size={14} />
        لوحة التحكم
      </button>
      <button
        className={`live-switcher-btn ${view === 'storefront' ? 'active' : ''}`}
        onClick={() => onChange('storefront')}
        id="switcher-storefront"
      >
        <Eye size={14} />
        معاينة المتجر
      </button>
    </div>
  )
}
