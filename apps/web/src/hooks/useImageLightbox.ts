import { useCallback, useRef } from 'react'
import { useLightbox } from '../components/ui/Lightbox'

/**
 * A hook that automatically attaches click handlers to all images within a container
 * to open them in the lightbox.
 *
 * @param deps - Dependencies that should trigger a re-scan of images (e.g. content changes)
 * @returns A callback ref that should be attached to the container element
 */
export function useImageLightbox(deps: unknown[] = []) {
  const { openLightbox } = useLightbox()
  const cleanupRef = useRef<(() => void) | null>(null)

  const ref = useCallback((node: HTMLElement | null) => {
    // Cleanup previous listeners if any
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    if (!node) return

    const images = Array.from(node.querySelectorAll('img'))
    
    // Filter out images that shouldn't be zoomable if needed
    const zoomableImages = images.filter(img => !img.classList.contains('no-zoom'))

    if (zoomableImages.length === 0) return

    const slides = zoomableImages.map((img) => ({ src: img.src }))

    const handlers: { element: HTMLImageElement; listener: () => void }[] = []

    zoomableImages.forEach((img, index) => {
      img.style.cursor = 'zoom-in'
      const handler = () => {
        openLightbox(slides, index)
      }
      img.addEventListener('click', handler)
      handlers.push({ element: img, listener: handler })
    })

    // Store cleanup function
    cleanupRef.current = () => {
      handlers.forEach(({ element, listener }) => {
        element.removeEventListener('click', listener)
        element.style.cursor = ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLightbox, ...deps])

  return ref
}
