import { useState, useEffect } from 'react'

export function useScrollToTop() {
  const [showTopBtn, setShowTopBtn] = useState<boolean>(false)

  const scrollToTop = () => {
    // Try to scroll main if it's scrollable
    const rootMain = document.querySelector('main')
    const isMainScrollable = rootMain && window.getComputedStyle(rootMain).overflowY === 'auto'
    
    if (isMainScrollable) {
      rootMain.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const rootMain = document.querySelector('main')
    
    const onScroll = () => {
      const mainScroll = rootMain ? rootMain.scrollTop : 0
      const windowScroll = window.scrollY
      // Use whichever is greater, or prioritize based on layout knowledge
      // Since we might switch layouts, checking both is safer
      const top = Math.max(mainScroll, windowScroll)
      setShowTopBtn(top > 200)
    }

    onScroll()
    
    // Attach to both
    if (rootMain) rootMain.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    
    return () => {
      if (rootMain) rootMain.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return { showTopBtn, scrollToTop }
}
