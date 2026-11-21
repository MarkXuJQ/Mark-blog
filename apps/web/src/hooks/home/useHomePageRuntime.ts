import { useEffect, type RefObject } from 'react'
import { useLenis } from 'lenis/react'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { requestPageTransition } from '@/lib/transitions/pageTransitionBus'

function useLenisPageResize(pageRef: RefObject<HTMLDivElement | null>) {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    const pageNode = pageRef.current
    let frameId = 0

    const scheduleResize = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        lenis.resize()
      })
    }

    scheduleResize()
    window.addEventListener('load', scheduleResize)

    if (!pageNode || typeof ResizeObserver === 'undefined') {
      return () => {
        cancelAnimationFrame(frameId)
        window.removeEventListener('load', scheduleResize)
      }
    }

    const observer = new ResizeObserver(scheduleResize)
    observer.observe(pageNode)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('load', scheduleResize)
    }
  }, [lenis, pageRef])
}

export function useHomePageRuntime(pageRef: RefObject<HTMLDivElement | null>) {
  const isDarkMode = useIsDarkMode()

  useLenisPageResize(pageRef)

  const handleNameUnlock = () => {
    requestPageTransition('/about')
  }

  return {
    handleNameUnlock,
    isDarkMode,
  }
}
