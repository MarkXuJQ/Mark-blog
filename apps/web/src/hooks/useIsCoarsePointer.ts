import { useEffect, useState } from 'react'

const COARSE_POINTER_QUERY = '(pointer: coarse)'

function getInitialIsCoarsePointer() {
  if (typeof window === 'undefined' || !('matchMedia' in window)) {
    return false
  }

  return window.matchMedia(COARSE_POINTER_QUERY).matches
}

export function useIsCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    getInitialIsCoarsePointer
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      return
    }

    const mediaQuery = window.matchMedia(COARSE_POINTER_QUERY)
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void
      removeListener?: (listener: () => void) => void
    }
    const syncIsCoarsePointer = () => {
      setIsCoarsePointer(mediaQuery.matches)
    }

    syncIsCoarsePointer()

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', syncIsCoarsePointer)
      return () =>
        mediaQuery.removeEventListener('change', syncIsCoarsePointer)
    }

    legacyMediaQuery.addListener?.(syncIsCoarsePointer)
    return () => legacyMediaQuery.removeListener?.(syncIsCoarsePointer)
  }, [])

  return isCoarsePointer
}
