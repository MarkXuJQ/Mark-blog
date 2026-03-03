import { useEffect, useRef } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const images = Array.from(node.querySelectorAll('img'))
    
    // Filter out images that shouldn't be zoomable if needed
    const zoomableImages = images.filter(img => !img.classList.contains('no-zoom'))

    if (zoomableImages.length === 0) return

    const slides = zoomableImages.map((img) => ({ src: img.src, alt: img.alt }))

    const handlers: { element: HTMLImageElement; listener: () => void; caption?: HTMLElement }[] = []

    zoomableImages.forEach((img, index) => {
      // Check if already wrapped in figure to avoid double wrapping
      if (img.parentElement?.tagName === 'FIGURE') {
        // If already wrapped, just attach listener
        img.style.cursor = 'zoom-in'
        const handler = () => openLightbox(slides, index)
        img.addEventListener('click', handler)
        handlers.push({ element: img, listener: handler })
        return
      }

      // Create wrapper figure
      const figure = document.createElement('figure')
      figure.className = 'post-image-figure my-6 flex flex-col items-center'
      
      // If inside img-grid-2, we want specific styles or let the grid handle it
      // The grid expects direct children to be items.
      // If we wrap in figure, figure becomes the item.
      
      // Insert figure before img
      img.insertAdjacentElement('beforebegin', figure)
      
      // Move img into figure
      figure.appendChild(img)
      
      // Add caption if alt text is available
      let caption: HTMLElement | undefined
      const altText = img.alt
      
      // Check for existing caption span (from previous render or markdown) and remove/move it
      // Note: In strict mode or hot reload, we might have leftovers if cleanup failed, 
      // but usually we just create new structure.
      // If there was a span next to it from previous logic:
      const sibling = figure.nextElementSibling
      if (sibling && sibling.tagName === 'SPAN' && sibling.classList.contains('img-caption')) {
        sibling.remove()
      }

      if (altText) {
        caption = document.createElement('figcaption')
        // lighter color, non-italic, centered
        caption.className = 'img-caption block text-center text-sm text-slate-500/80 dark:text-slate-400/80 mt-2 mb-0 font-medium'
        caption.textContent = altText
        figure.appendChild(caption)
      }

      img.style.cursor = 'zoom-in'
      const handler = () => {
        openLightbox(slides, index)
      }
      img.addEventListener('click', handler)
      handlers.push({ element: img, listener: handler, caption }) // caption here is the figcaption
    })

    return () => {
      handlers.forEach(({ element, listener, caption }) => {
        element.removeEventListener('click', listener)
        element.style.cursor = ''
        
        // Unwrap: Move img back to original place and remove figure/caption
        // This is tricky because we modified the DOM structure significantly.
        // If we just remove listeners, the DOM structure remains <figure><img><figcaption></figure>
        // which might be fine, or might be problematic if re-run.
        // If we don't unwrap, the next run will see img inside figure and skip wrapping (due to check above).
        // So we should just remove listeners.
        // However, if we don't unwrap, the caption remains.
        
        // If we want to fully cleanup (e.g. navigating away), we should arguably unwrap.
        // But for stability, persisting the figure might be better as long as we don't duplicate.
        // Let's try to unwrap to be clean.
        
        const figure = element.parentElement
        if (figure && figure.tagName === 'FIGURE' && figure.classList.contains('post-image-figure')) {
          // Move img out before figure
          figure.insertAdjacentElement('beforebegin', element)
          // Remove figure (and caption inside it)
          figure.remove()
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLightbox, ...deps])

  return containerRef
}
