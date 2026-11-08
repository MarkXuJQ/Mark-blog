import { useEffect, useRef, useState, type RefObject } from 'react'
import { Comments } from './Comments'
import {
  getTwikooEnvId,
  preloadTwikooScript,
  warmTwikooBackend,
} from '@/lib/comments/twikooLoader'

interface DeferredCommentsProps {
  rootMargin?: string
  observerRootRef?: RefObject<Element | null>
  containerId?: string
  path?: string
  eager?: boolean
  layout?: 'auto' | 'stacked'
  variant?: 'default' | 'compact'
  composerState?: 'open' | 'collapsed'
  className?: string
  showTitle?: boolean
  onCommentLoaded?: () => void
}

export function DeferredComments({
  rootMargin = '640px 0px',
  observerRootRef,
  containerId,
  path,
  eager,
  layout,
  variant,
  composerState,
  className,
  showTitle,
  onCommentLoaded,
}: DeferredCommentsProps) {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [shouldRender, setShouldRender] = useState(false)

  // Warm the Twikoo bundle once the page is interactive instead of waiting for
  // the reader to approach the comment section: the download is ~330ms and the
  // mount then starts from cache, so scrolling down feels instant.
  useEffect(() => {
    if (window.__PRERENDER__) return

    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    const warm = () => {
      preloadTwikooScript()
      // A cold serverless function costs ~1.5-2s on the first request; wake it
      // up while the reader is still reading so the list is instant later.
      warmTwikooBackend(getTwikooEnvId())
    }

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const id = idleWindow.requestIdleCallback(warm, { timeout: 2000 })
      return () => idleWindow.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(warm, 1500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (window.__PRERENDER__) return

    if (shouldRender) {
      return
    }

    if (eager) {
      preloadTwikooScript()
      // Mount shortly after first paint rather than at a fixed 2.5s: the bundle
      // is already downloading, and mounting starts the comment fetch, so by
      // the time the reader scrolls down the list is usually ready. Left just
      // long enough not to compete with the article's own first paint.
      const timer = window.setTimeout(() => setShouldRender(true), 900)
      return () => window.clearTimeout(timer)
    }

    const node = placeholderRef.current
    if (
      !node ||
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window)
    ) {
      setShouldRender(true)
      return
    }

    const observerRoot = observerRootRef?.current ?? null
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries.some(
            (entry) => entry.isIntersecting || entry.intersectionRatio > 0
          )
        ) {
          return
        }
        preloadTwikooScript()
        setShouldRender(true)
        observer.disconnect()
      },
      { root: observerRoot, rootMargin }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [eager, observerRootRef, rootMargin, shouldRender])

  if (!shouldRender) {
    return (
      <div
        ref={placeholderRef}
        className="mt-12 mb-8 min-h-[160px]"
        aria-hidden="true"
      />
    )
  }

  return (
    <Comments
      containerId={containerId || 'twikoo'}
      path={path}
      eager={eager}
      layout={layout}
      variant={variant}
      composerState={composerState}
      className={className}
      showTitle={showTitle}
      onCommentLoaded={onCommentLoaded}
    />
  )
}
