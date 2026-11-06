import { useEffect, useRef, useState } from 'react'

/**
 * Pinned-scroll progress for a section that hosts a sticky stage.
 *
 * Returns 0 when the section's top is at/above the viewport bottom start (i.e.
 * it has just scrolled into view from below) and 1 once the section's bottom
 * has reached the top of the viewport — i.e. the scroll track has fully passed.
 * A value near 0.5 corresponds to the stage being centered in the viewport,
 * which is where a scroll-driven 2D -> 3D morph should sit.
 */
export function useSectionScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      return
    }

    let raf = 0
    const update = () => {
      raf = 0
      const rect = element.getBoundingClientRect()
      const viewport = window.innerHeight
      const height = rect.height || 1
      // 0 as the section enters from the bottom, 1 as its bottom reaches the
      // top of the viewport (the sticky track has scrolled fully through).
      const entered = viewport - rect.top
      const clamped = Math.max(0, Math.min(1, entered / height))
      setProgress(clamped)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return { ref, progress }
}