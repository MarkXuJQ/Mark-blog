import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'system' | 'dark'
export type ThemeTone = 'light' | 'dark'

const THEME_TRANSITION_CLASS = 'theme-switching'
const THEME_TRANSITION_DURATION = 1000

export function resolveThemeModeTone(
  mode: ThemeMode,
  prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
): ThemeTone {
  if (mode === 'system') return prefersDark ? 'dark' : 'light'
  return mode
}

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
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)')
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    let timeoutId: number | null = null

    const applyResolvedTheme = () => {
      const currentTone: ThemeTone = root.classList.contains('dark')
        ? 'dark'
        : 'light'
      const nextTone = resolveThemeModeTone(mode, systemPreference.matches)
      const shouldTransition =
        !prefersReducedMotion && currentTone !== nextTone

      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }

      root.classList.toggle(THEME_TRANSITION_CLASS, shouldTransition)
      root.classList.remove('light', 'dark')
      root.classList.add(nextTone)

      if (shouldTransition) {
        timeoutId = window.setTimeout(() => {
          root.classList.remove(THEME_TRANSITION_CLASS)
          timeoutId = null
        }, THEME_TRANSITION_DURATION)
      }
    }

    applyResolvedTheme()
    localStorage.setItem('theme-mode', mode)

    if (mode === 'system') {
      systemPreference.addEventListener('change', applyResolvedTheme)
    }

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId)
      systemPreference.removeEventListener('change', applyResolvedTheme)
      root.classList.remove(THEME_TRANSITION_CLASS)
    }
  }, [mode])

  return { mode, setMode }
}
