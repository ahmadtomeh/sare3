import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../stores/useThemeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-label="تبديل الثيم"
    >
      {theme === 'dark'
        ? <Sun size={18} />
        : <Moon size={18} />
      }
    </button>
  )
}
