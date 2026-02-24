import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'system' | 'dark'

export function useTheme() {
  // 从 localStorage 读取保存的主题，如果没有则默认为 'system'
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
    // 移除之前的类名，防止冲突
    root.classList.remove('light', 'dark')

    if (mode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(mode)
    }
    
    // 保存设置到 localStorage
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  return { mode, setMode }
}
