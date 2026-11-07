import { useState, useEffect } from 'react'
import { setupTocTree } from '@/lib/article/toc'

const BLOG_TOC_HEADING_SELECTOR =
  '[data-article-content="true"] h1, [data-article-content="true"] h2, [data-article-content="true"] h3'

export function useArticleToc(
  mainRef: React.RefObject<HTMLElement>,
  pathname: string,
  options: {
    trackActive?: boolean
    refreshKey?: string | number | boolean
  } = {}
) {
  const { trackActive = true, refreshKey = '' } = options
  const isBlogPost = pathname.startsWith('/blog/')
  const [toc, setToc] = useState<
    Array<{ id: string; text: string; level: number }>
  >([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (window.__PRERENDER__) return

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
        {
          topOffset: 120,
          trackActive,
          headingSelector: BLOG_TOC_HEADING_SELECTOR,
        }
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
