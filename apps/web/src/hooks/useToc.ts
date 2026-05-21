import { useState, useEffect } from 'react'
import { setupTocTree } from '@/lib/toc'

export function useToc(
  mainRef: React.RefObject<HTMLElement>,
  pathname: string,
  options: { trackActive?: boolean; refreshKey?: string | number | boolean } = {}
) {
  const { trackActive = true, refreshKey = '' } = options
  const isBlogPost = pathname.startsWith('/blog/')
  const [toc, setToc] = useState<
    Array<{ id: string; text: string; level: number }>
  >([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let observer: MutationObserver | undefined
    let raf = 0
    let attempts = 0
    const maxAttempts = 12

    const clearRaf = () => {
      if (raf) {
        window.cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const teardown = () => {
      clearRaf()
      if (observer) {
        observer.disconnect()
        observer = undefined
      }
      if (cleanup) {
        cleanup()
        cleanup = undefined
      }
    }

    const buildToc = () => {
      if (!mainRef.current) return false
      if (cleanup) {
        cleanup()
        cleanup = undefined
      }
      const { flat, destroy } = setupTocTree(
        mainRef.current,
        (id) => setActiveId(id),
        { topOffset: 120, trackActive } // Adjusted offset for better experience
      )
      if (flat.length === 0) {
        destroy()
        return false
      }
      setToc(flat)
      cleanup = destroy
      attempts = 0
      return true
    }

    const requestBuild = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        if (buildToc()) return
        attempts += 1
        if (attempts >= maxAttempts) {
          setToc([])
          setActiveId('')
        }
      })
    }

    if (isBlogPost && mainRef.current) {
      requestBuild()
      observer = new MutationObserver(() => {
        requestBuild()
      })
      observer.observe(mainRef.current, {
        childList: true,
        subtree: true,
      })
    } else {
      setToc([])
      setActiveId('')
    }

    return () => {
      teardown()
    }
  }, [pathname, mainRef, isBlogPost, trackActive, refreshKey]) // Use pathname instead of isBlogPost to refresh on route change

  return { toc, activeId }
}
