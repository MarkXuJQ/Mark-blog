import { useEffect, type RefObject } from 'react'

declare global {
  interface Window {
    __PRERENDER__?: boolean
  }
}

const HOME_REVEAL_SELECTOR = '[data-home-reveal]'
const REVEAL_STAGGER_SECONDS = 0.055
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

function getRevealDelay(element: HTMLElement) {
  const explicitDelay = Number(element.dataset.homeRevealDelay)
  if (Number.isFinite(explicitDelay)) return Math.max(0, explicitDelay)

  const index = Number(element.dataset.homeRevealIndex)
  if (Number.isFinite(index)) {
    return Math.max(0, index) * REVEAL_STAGGER_SECONDS
  }

  return 0
}

function getRevealY(element: HTMLElement) {
  const key = element.dataset.homeReveal ?? ''
  return revealYByType[key] ?? 18
}

export function useHomeGsapReveal(
  rootRef: RefObject<HTMLElement | null>,
  { prefersReducedMotion }: { prefersReducedMotion: boolean }
) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.__PRERENDER__) return

    const rootNode = rootRef.current
    if (!rootNode) return

    let isCancelled = false
    let observer: IntersectionObserver | null = null
    const animations: Array<{ kill: () => void }> = []

    void import('gsap').then(({ gsap }) => {
      if (isCancelled) return

      const revealElements = gsap.utils.toArray<HTMLElement>(
        HOME_REVEAL_SELECTOR,
        rootNode
      )

      if (revealElements.length === 0) return

      if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
        gsap.set(revealElements, {
          autoAlpha: 1,
          clearProps: 'transform,filter,willChange',
        })
        revealElements.forEach((element) => {
          element.setAttribute(REVEALED_ATTRIBUTE, 'true')
        })
        return
      }

      gsap.set(revealElements, {
        autoAlpha: 0,
        filter: 'blur(8px)',
        y: (index, element) => {
          void index
          return getRevealY(element as HTMLElement)
        },
        willChange: 'opacity, transform, filter',
      })

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return

            const element = entry.target as HTMLElement
            if (element.hasAttribute(REVEALED_ATTRIBUTE)) return

            element.setAttribute(REVEALED_ATTRIBUTE, 'true')
            const tween = gsap.to(element, {
              autoAlpha: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.72,
              delay: getRevealDelay(element),
              ease: 'power3.out',
              overwrite: 'auto',
              clearProps: 'willChange',
            })

            animations.push(tween)
            observer?.unobserve(element)
          })
        },
        {
          root: null,
          rootMargin: '0px 0px -12% 0px',
          threshold: 0.16,
        }
      )

      revealElements.forEach((element) => observer?.observe(element))
    })

    return () => {
      isCancelled = true
      observer?.disconnect()
      animations.forEach((animation) => animation.kill())
    }
  }, [prefersReducedMotion, rootRef])
}
