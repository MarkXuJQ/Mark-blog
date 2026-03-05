import { useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'light' | 'system' | 'dark'

const THEME_STORAGE_KEY = 'theme-mode'
const THEME_CHANGE_EVENT = 'theme-mode-change'

export function useTheme() {
  const [mode, setModeInternal] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved as ThemeMode
      }
    }
    return 'system'
  })

  const applyTheme = useCallback((newMode: ThemeMode) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (newMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(newMode)
    }
    
    localStorage.setItem(THEME_STORAGE_KEY, newMode)
  }, [])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeInternal(newMode)
    applyTheme(newMode)
    // 通知同一页面上的其他组件（因为它们在不同的岛屿中）
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: newMode }))
  }, [applyTheme])

  useEffect(() => {
    // 监听同一页面上的主题变更
    const handleThemeChange = (e: any) => {
      const newMode = e.detail as ThemeMode
      if (newMode !== mode) {
        setModeInternal(newMode)
      }
    }

    // 监听其他标签页的主题变更
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const newMode = e.newValue as ThemeMode
        if (newMode === 'light' || newMode === 'dark' || newMode === 'system') {
          setModeInternal(newMode)
          applyTheme(newMode)
        }
      }
    }

    // 监听系统主题变更（如果处于 system 模式）
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (mode === 'system') {
        applyTheme('system')
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.addEventListener('storage', handleStorageChange)
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      window.removeEventListener('storage', handleStorageChange)
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [mode, applyTheme])

  return { mode, setMode }
}
