import { useState, useEffect, useRef } from 'react'

export function useScrollVisibility(threshold = 10) {
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY

        // Always show if at the top
        if (currentScrollY < threshold) {
          setIsVisible(true)
          lastScrollY.current = currentScrollY
          return
        }

        // Determine scroll direction
        if (currentScrollY > lastScrollY.current) {
          // Scrolling down
          setIsVisible(false)
        } else {
          // Scrolling up
          setIsVisible(true)
        }

        lastScrollY.current = currentScrollY
      }
    }

    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          controlNavbar()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return isVisible
}
