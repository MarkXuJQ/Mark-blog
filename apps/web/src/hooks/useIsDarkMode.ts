import { useEffect, useState } from 'react'

/**
 * Tracks whether the site is currently in dark mode by observing the
 * `dark` class on <html>. Driven by the same source of truth as
 * `useTheme` (RootLayout toggles `documentElement.classList`).
 */
export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}