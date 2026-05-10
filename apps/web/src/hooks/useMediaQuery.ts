import { useEffect, useState } from 'react'

function supportsMatchMedia() {
  return typeof window !== 'undefined' && 'matchMedia' in window
}

function getInitialMatch(query: string) {
  if (!supportsMatchMedia()) {
    return false
  }

  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getInitialMatch(query))

  useEffect(() => {
    if (!supportsMatchMedia()) {
      return
    }

    const mediaQuery = window.matchMedia(query)
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void
      removeListener?: (listener: () => void) => void
    }
    const syncMatch = () => {
      setMatches(mediaQuery.matches)
    }

    syncMatch()

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', syncMatch)
      return () => mediaQuery.removeEventListener('change', syncMatch)
    }

    legacyMediaQuery.addListener?.(syncMatch)
    return () => legacyMediaQuery.removeListener?.(syncMatch)
  }, [query])

  return matches
}
