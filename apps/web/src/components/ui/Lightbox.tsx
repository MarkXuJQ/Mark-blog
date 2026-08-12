import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/plugins/captions.css'
import { getOptimizedImageUrl, getOriginalImageUrl } from '@/lib/image'
import { LightboxContext, type LightboxSlide } from '@/hooks/useLightbox'

function isHdrSlide(slide: unknown) {
  return (slide as LightboxSlide).hdr === true
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [slides, setSlides] = useState<LightboxSlide[]>([])
  const lightboxHistoryRef = useRef(false)

  useEffect(() => {
    const handlePopState = () => {
      if (!lightboxHistoryRef.current) return
      lightboxHistoryRef.current = false
      setOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openLightbox = useCallback(
    (newSlides: LightboxSlide[], newIndex = 0) => {
      const processedSlides = newSlides.map((slide) => {
        const originalSrc = getOriginalImageUrl(slide.src)
        const shouldDeferHdr = slide.hdr === true && !slide.optimized

        return {
          ...slide,
          src: slide.optimized
            ? slide.src
            : shouldDeferHdr
              ? getOptimizedImageUrl(originalSrc, 'thumbnail')
              : originalSrc,
          originalSrc: shouldDeferHdr ? originalSrc : slide.originalSrc,
          description: slide.description || slide.alt,
        }
      })
      setSlides(processedSlides)
      setIndex(newIndex)
      setOpen(true)

      if (!lightboxHistoryRef.current) {
        lightboxHistoryRef.current = true
        window.history.pushState(
          {
            ...(window.history.state && typeof window.history.state === 'object'
              ? window.history.state
              : {}),
            __markBlogLightbox: true,
          },
          '',
          window.location.href
        )
      }
    },
    []
  )

  const closeLightbox = useCallback(() => {
    if (
      lightboxHistoryRef.current &&
      window.history.state?.__markBlogLightbox === true
    ) {
      window.history.back()
      return
    }

    lightboxHistoryRef.current = false
    setOpen(false)
  }, [])

  const contextValue = useMemo(
    () => ({ openLightbox, closeLightbox }),
    [openLightbox, closeLightbox]
  )

  return (
    <LightboxContext.Provider value={contextValue}>
      {children}
      <Lightbox
        open={open}
        close={closeLightbox}
        index={index}
        slides={slides}
        on={{
          view: ({ index: newIndex }) => {
            setIndex(newIndex)
            setSlides((previous) => {
              const current = previous[newIndex]
              if (
                !current?.originalSrc ||
                current.src === current.originalSrc
              ) {
                return previous
              }
              const originalSrc = current.originalSrc

              return previous.map((slide, slideIndex) =>
                slideIndex === newIndex
                  ? {
                      ...slide,
                      src: originalSrc,
                      optimized: true,
                    }
                  : slide
              )
            })
          },
        }}
        carousel={{ preload: 1 }}
        plugins={[Zoom, Captions]}
        captions={{ showToggle: true, descriptionTextAlign: 'center' }}
        render={{
          slideContainer: ({ slide, children }) => (
            <div
              data-hdr-image={isHdrSlide(slide) ? 'true' : undefined}
              style={{ display: 'contents' }}
            >
              {children}
            </div>
          ),
        }}
      />
    </LightboxContext.Provider>
  )
}
