import { useEffect, type RefObject } from 'react'

declare global {
  interface Window {
    __PRERENDER__?: boolean
  }
}

const HOME_REVEAL_SELECTOR = '[data-home-reveal]'
const REVEAL_DURATION_MS = 720
const REVEAL_STAGGER_MS = 55
const REVEAL_EASING = 'cubic-bezier(0.165, 0.84, 0.44, 1)'
const REVEALED_ATTRIBUTE = 'data-home-revealed'

const revealYByType: Record<string, number> = {
  'hero-copy': 18,
  'hero-visual': 22,
  'hero-footer': 10,
  'blog-header': 20,
  'blog-stat': 12,
  'blog-card': 24,
  'blog-control': 12,
  footer: 14,
}

function getRevealDelayMs(element: HTMLElement) {
  const explicitDelay = Number(element.dataset.homeRevealDelay)
  if (Number.isFinite(explicitDelay)) {
    return Math.max(0, explicitDelay) * 1000
  }

  const index = Number(element.dataset.homeRevealIndex)
  if (Number.isFinite(index)) {
    return Math.max(0, index) * REVEAL_STAGGER_MS
  }

  return 0
}

function getRevealY(element: HTMLElement) {
  const key = element.dataset.homeReveal ?? ''
  return revealYByType[key] ?? 18
}

function showImmediately(element: HTMLElement) {
  element.style.opacity = '1'
  element.style.visibility = 'visible'
  element.style.removeProperty('filter')
  element.style.removeProperty('transform')
  element.style.removeProperty('will-change')
  element.setAttribute(REVEALED_ATTRIBUTE, 'true')
}

export function useHomeReveal(
  rootRef: RefObject<HTMLElement | null>,
  { prefersReducedMotion }: { prefersReducedMotion: boolean }
) {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__PRERENDER__) return

    const rootNode = rootRef.current
    if (!rootNode) return

    const revealElements = Array.from(
      rootNode.querySelectorAll<HTMLElement>(HOME_REVEAL_SELECTOR)
    )
    if (revealElements.length === 0) return

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      revealElements.forEach(showImmediately)
      return
    }

    const pendingRevealElements = revealElements.filter((element) => {
      if (!element.hasAttribute(REVEALED_ATTRIBUTE)) return true
      showImmediately(element)
      return false
    })
    const animations = new Set<Animation>()

    pendingRevealElements.forEach((element) => {
      element.style.opacity = '0'
      element.style.visibility = 'hidden'
      element.style.filter = 'blur(8px)'
      element.style.transform = `translate3d(0, ${getRevealY(element)}px, 0)`
      element.style.willChange = 'opacity, transform, filter'
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          const element = entry.target as HTMLElement
          if (element.hasAttribute(REVEALED_ATTRIBUTE)) return

          element.setAttribute(REVEALED_ATTRIBUTE, 'true')
          observer.unobserve(element)

          if (typeof element.animate !== 'function') {
            showImmediately(element)
            return
          }

          element.style.visibility = 'visible'
          const revealY = getRevealY(element)
          const animation = element.animate(
            [
              {
                opacity: 0,
                filter: 'blur(8px)',
                transform: `translate3d(0, ${revealY}px, 0)`,
              },
              {
                opacity: 1,
                filter: 'blur(0px)',
                transform: 'translate3d(0, 0, 0)',
              },
            ],
            {
              duration: REVEAL_DURATION_MS,
              delay: getRevealDelayMs(element),
              easing: REVEAL_EASING,
              fill: 'forwards',
            }
          )

          animations.add(animation)
          void animation.finished
            .then(() => {
              element.style.opacity = '1'
              element.style.filter = 'blur(0px)'
              element.style.transform = 'translate3d(0, 0, 0)'
              element.style.removeProperty('will-change')
              animation.cancel()
              animations.delete(animation)
            })
            .catch(() => undefined)
        })
      },
      {
        root: null,
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.16,
      }
    )

    pendingRevealElements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
      animations.forEach((animation) => animation.cancel())
      animations.clear()
    }
  }, [prefersReducedMotion, rootRef])
}
