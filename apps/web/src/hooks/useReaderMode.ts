import { useEffect, useState } from 'react'

const READER_MODE_STORAGE_KEY = 'blog-reader-mode'

/**
 * Shared simple-reading state for every blog layout. The attribute is what the
 * global styles use; localStorage keeps the choice across navigations.
 */
export function useReaderMode() {
  const [isMounted, setIsMounted] = useState(false)
  const [simpleMode, setSimpleMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(READER_MODE_STORAGE_KEY) === 'simple'
  })

  useEffect(() => {
    if (window.__PRERENDER__) return
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    document.documentElement.toggleAttribute('data-simple-reading', simpleMode)
    window.localStorage.setItem(
      READER_MODE_STORAGE_KEY,
      simpleMode ? 'simple' : 'rich'
    )

    return () => {
      document.documentElement.removeAttribute('data-simple-reading')
    }
  }, [isMounted, simpleMode])

  return { isMounted, simpleMode, setSimpleMode }
}
