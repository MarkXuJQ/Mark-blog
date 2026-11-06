import { useEffect, type RefObject } from 'react'

const ROUTE_SELECTOR = '[data-article-photo-route]'

export function useArticlePhotoRoutes(
  containerRef: RefObject<HTMLElement | null>,
  contentKey?: string
) {
  useEffect(() => {
    if (window.__PRERENDER__) return
    const container = containerRef.current
    if (!container) return

    const figures = Array.from(
      container.querySelectorAll<HTMLElement>(ROUTE_SELECTOR)
    )
    if (figures.length === 0) return

    let cancelled = false
    const cleanups = new Map<HTMLElement, () => void>()

    const mount = async (figure: HTMLElement) => {
      if (figure.dataset.photoRouteMounted === 'true') return
      figure.dataset.photoRouteMounted = 'true'

      try {
        const { mountArticlePhotoRoute } = await import(
          '@/lib/article/photoRouteRuntime'
        )
        if (cancelled) return
        const cleanup = await mountArticlePhotoRoute(figure)
        if (cancelled) {
          cleanup()
          return
        }
        cleanups.set(figure, cleanup)
      } catch {
        delete figure.dataset.photoRouteMounted
        figure.dataset.photoRouteStatus = 'error'
        const loading = figure.querySelector<HTMLElement>(
          '.article-photo-route__loading'
        )
        if (loading) {
          loading.textContent = figure.dataset.photoRouteLanguage === 'zh'
            ? '路线地图加载失败，请刷新页面重试'
            : 'The route map failed to load. Refresh to try again.'
        }
      }
    }

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              observer?.unobserve(entry.target)
              void mount(entry.target as HTMLElement)
            })
          },
          { rootMargin: '500px 0px' }
        )
      : null

    figures.forEach((figure) => {
      if (observer) observer.observe(figure)
      else void mount(figure)
    })

    return () => {
      cancelled = true
      observer?.disconnect()
      cleanups.forEach((cleanup) => cleanup())
      figures.forEach((figure) => {
        delete figure.dataset.photoRouteMounted
      })
    }
  }, [containerRef, contentKey])
}
