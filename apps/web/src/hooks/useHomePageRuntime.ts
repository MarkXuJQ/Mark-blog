import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { useLenis } from 'lenis/react'
import { requestPageTransition } from '@/lib/transitions/pageTransitionBus'

function getInitialIsDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function useIsDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const syncTheme = () => {
      setIsDarkMode(root.classList.contains('dark'))
    }

    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return isDarkMode
}

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
  const nameClickCountRef = useRef(0)
  const lastNameClickMsRef = useRef(0)

  useLenisPageResize(pageRef)

  const handleNameClick = () => {
    const now = Date.now()
    const isWithinWindow = now - lastNameClickMsRef.current <= 600

    if (!isWithinWindow) {
      nameClickCountRef.current = 0
    }

    lastNameClickMsRef.current = now
    nameClickCountRef.current += 1

    if (nameClickCountRef.current >= 7) {
      nameClickCountRef.current = 0
      lastNameClickMsRef.current = 0
      requestPageTransition('/about')
    }
  }

  const handleNameKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      requestPageTransition('/about')
    }
  }

  return {
    handleNameClick,
    handleNameKeyDown,
    isDarkMode,
  }
}
