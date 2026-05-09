import { useEffect, useRef, type ReactNode } from 'react'
import { ReactLenis, type LenisRef } from 'lenis/react'
import { useLocation } from 'react-router-dom'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const lenisRef = useRef<LenisRef>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    lenisRef.current?.lenis?.resize()
  }, [location.pathname, location.hash])

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        autoRaf: true,
        autoResize: true,
        smoothWheel: !prefersReducedMotion,
        // Native touch scrolling is more resilient on mobile when the homepage
        // already has several scroll-linked motion scenes running.
        syncTouch: false,
        lerp: prefersReducedMotion ? 0.18 : 0.085,
        duration: prefersReducedMotion ? 0.9 : 1.15,
        wheelMultiplier: 0.92,
        touchMultiplier: 1.04,
        overscroll: false,
        allowNestedScroll: true,
        anchors: { offset: -96 },
        stopInertiaOnNavigate: true,
      }}
    >
      {children}
    </ReactLenis>
  )
}
