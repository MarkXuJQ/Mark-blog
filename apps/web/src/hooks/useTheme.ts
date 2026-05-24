import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'system' | 'dark'

const THEME_TRANSITION_CLASS = 'theme-switching'
const THEME_TRANSITION_DURATION = 280

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('theme-mode')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved
      }
    }
    return 'system'
  })

  useEffect(() => {
    const root = window.document.documentElement
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (!prefersReducedMotion) {
      root.classList.add(THEME_TRANSITION_CLASS)
    }

    root.classList.remove('light', 'dark')

    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(mode)
    }

    localStorage.setItem('theme-mode', mode)

    if (prefersReducedMotion) return

    const timeoutId = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS)
    }, THEME_TRANSITION_DURATION)

    return () => {
      window.clearTimeout(timeoutId)
      root.classList.remove(THEME_TRANSITION_CLASS)
    }
  }, [mode])

  return { mode, setMode }
}
