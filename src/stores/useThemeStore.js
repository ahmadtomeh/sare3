import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.setAttribute('data-theme', next)
      },
      initTheme: () => {
        const t = get().theme
        document.documentElement.setAttribute('data-theme', t)
      },
    }),
    { name: 'sare3-theme' }
  )
)
