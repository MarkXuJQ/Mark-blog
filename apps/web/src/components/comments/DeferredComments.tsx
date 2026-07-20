import { useEffect, useRef, useState, type RefObject } from 'react'
import { Comments } from './Comments'
import { preloadTwikooScript } from './twikooLoader'

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

  useEffect(() => {
    if (window.__PRERENDER__) return

    if (shouldRender) {
      return
    }

    if (eager) {
      preloadTwikooScript()
      const timer = window.setTimeout(() => setShouldRender(true), 2500)
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
