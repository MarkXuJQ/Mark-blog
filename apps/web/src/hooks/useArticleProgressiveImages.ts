import { useEffect, type RefObject } from 'react'

type ProgressiveImageState = 'loading' | 'loaded' | 'error'

function getProgressiveImageState(img: HTMLImageElement) {
  return img.dataset.progressiveState as ProgressiveImageState | undefined
}

function setProgressiveImageState(
  img: HTMLImageElement,
  state: ProgressiveImageState
) {
  img.dataset.progressiveState = state
}

/**
 * Loads article images as small placeholders first, then swaps in their
 * optimized content rendition when they are close to the viewport.
 */
export function useArticleProgressiveImages(
  containerRef: RefObject<HTMLDivElement | null>,
  deps: unknown[] = []
) {
  useEffect(() => {
    if (window.__PRERENDER__) return

    const container = containerRef.current
    if (!container) return

    const images = Array.from(
      container.querySelectorAll<HTMLImageElement>('img[data-progressive-src]')
    )
    if (images.length === 0) return

    let cancelled = false

    const loadProgressiveImage = (
      img: HTMLImageElement,
      priority: 'high' | 'low'
    ) => {
      if (getProgressiveImageState(img)) return

      const src = img.dataset.progressiveSrc
      if (!src) return

      setProgressiveImageState(img, 'loading')

      const request = new Image()
      request.decoding = 'async'
      request.fetchPriority = priority
      request.onload = () => {
        const commit = () => {
          if (cancelled) return
          img.src = src
          setProgressiveImageState(img, 'loaded')
        }

        if (typeof request.decode === 'function') {
          void request
            .decode()
            .catch(() => undefined)
            .then(commit)
        } else {
          commit()
        }
      }
      request.onerror = () => {
        if (!cancelled) setProgressiveImageState(img, 'error')
      }
      request.src = src
    }

    if (typeof IntersectionObserver === 'undefined') {
      images.forEach((img, index) => {
        loadProgressiveImage(img, index === 0 ? 'high' : 'low')
      })
      return () => {
        cancelled = true
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const image = entry.target as HTMLImageElement
          const priority = image === images[0] ? 'high' : 'low'
          loadProgressiveImage(image, priority)
          observer.unobserve(image)
        })
      },
      { rootMargin: '600px 0px' }
    )

    images.forEach((img) => observer.observe(img))

    return () => {
      cancelled = true
      observer.disconnect()
    }
    // The content ref is stable; deps describe when its HTML needs rescanning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, ...deps])
}
