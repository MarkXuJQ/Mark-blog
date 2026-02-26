import { useState, useEffect } from 'react'
import { setupTocTree } from '../utils/toc'

export function useToc(mainRef: React.RefObject<HTMLElement>, pathname: string) {
  const isBlogPost = pathname.startsWith('/blog/')
  const [toc, setToc] = useState<Array<{ id: string; text: string; level: number }>>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let timer: ReturnType<typeof setTimeout>

    if (isBlogPost && mainRef.current) {
      // Delay to ensure DOM is ready after navigation
      timer = setTimeout(() => {
        if (!mainRef.current) return
        const { flat, destroy } = setupTocTree(
          mainRef.current,
          (id) => setActiveId(id),
          { topOffset: 120 } // Adjusted offset for better experience
        )
        setToc(flat)
        cleanup = destroy
      }, 100)
    } else {
      setToc([])
      setActiveId('')
    }
    
    return () => {
      clearTimeout(timer)
      if (cleanup) cleanup()
    }
  }, [pathname, mainRef]) // Use pathname instead of isBlogPost to refresh on route change

  return { toc, activeId }
}
