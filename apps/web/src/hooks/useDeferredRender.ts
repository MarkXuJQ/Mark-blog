import { startTransition, useEffect, useRef, useState } from 'react'

interface UseDeferredRenderOptions {
  rootMargin?: string
  disabled?: boolean
  initial?: boolean
}

export function useDeferredRender<T extends Element = HTMLDivElement>({
  rootMargin = '640px 0px',
  disabled = false,
  initial = false,
}: UseDeferredRenderOptions = {}) {
  const targetRef = useRef<T | null>(null)
  const [shouldRender, setShouldRender] = useState(() => disabled || initial)

  useEffect(() => {
    if (shouldRender) return
    if (disabled) {
      startTransition(() => {
        setShouldRender(true)
      })
      return
    }

    const node = targetRef.current
    if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      startTransition(() => {
        setShouldRender(true)
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          return
        }

        startTransition(() => {
          setShouldRender(true)
        })
        observer.disconnect()
      },
      { rootMargin }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [disabled, rootMargin, shouldRender])

  return {
    targetRef,
    shouldRender,
  }
}
