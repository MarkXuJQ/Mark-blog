import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/plugins/captions.css'
import { useTranslation } from 'react-i18next'
import { getOptimizedImageUrl, getOriginalImageUrl } from '@/lib/image'
import { LightboxContext, type LightboxSlide } from '@/hooks/useLightbox'

function isHdrSlide(slide: unknown) {
  return (slide as LightboxSlide).hdr === true
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [slides, setSlides] = useState<LightboxSlide[]>([])
  const [originalLoad, setOriginalLoad] = useState<{
    src: string
    status: 'loading' | 'error'
  } | null>(null)
  const lightboxHistoryRef = useRef(false)
  const pendingImageRef = useRef<HTMLImageElement | null>(null)
  const requestIdRef = useRef(0)
  const activeIndexRef = useRef(0)

  const cancelOriginalLoad = useCallback(() => {
    requestIdRef.current += 1
    const image = pendingImageRef.current
    if (image) {
      image.onload = null
      image.onerror = null
      image.src = 'data:,'
      pendingImageRef.current = null
    }
    setOriginalLoad(null)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      if (!lightboxHistoryRef.current) return
      lightboxHistoryRef.current = false
      cancelOriginalLoad()
      setOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [cancelOriginalLoad])

  useEffect(() => () => {
    requestIdRef.current += 1
    const image = pendingImageRef.current
    if (image) {
      image.onload = null
      image.onerror = null
      image.src = 'data:,'
    }
  }, [])

  const openLightbox = useCallback(
    (newSlides: LightboxSlide[], newIndex = 0) => {
      cancelOriginalLoad()
      const processedSlides = newSlides.map((slide) => {
        const originalSrc = getOriginalImageUrl(slide.originalSrc ?? slide.src)
        const shouldDeferHdr = slide.hdr === true && !slide.optimized
        const optimizedSrc = getOptimizedImageUrl(originalSrc, 'content')

        return {
          ...slide,
          src: slide.optimized
            ? slide.src
            : shouldDeferHdr
              ? getOptimizedImageUrl(originalSrc, 'thumbnail')
              : optimizedSrc,
          originalSrc,
          optimized: slide.optimized || !shouldDeferHdr,
          description: slide.description || slide.alt,
        }
      })
      activeIndexRef.current = newIndex
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
    [cancelOriginalLoad]
  )

  const closeLightbox = useCallback(() => {
    cancelOriginalLoad()
    if (
      lightboxHistoryRef.current &&
      window.history.state?.__markBlogLightbox === true
    ) {
      window.history.back()
      return
    }

    lightboxHistoryRef.current = false
    setOpen(false)
  }, [cancelOriginalLoad])

  const loadOriginal = useCallback(() => {
    const slide = slides[index]
    const originalSrc = slide?.originalSrc
    if (!originalSrc || slide.src === originalSrc || pendingImageRef.current) {
      return
    }

    const requestId = ++requestIdRef.current
    const image = new Image()
    image.decoding = 'async'
    pendingImageRef.current = image
    setOriginalLoad({ src: originalSrc, status: 'loading' })

    const fail = () => {
      if (requestIdRef.current !== requestId) return
      pendingImageRef.current = null
      setOriginalLoad({ src: originalSrc, status: 'error' })
    }
    const complete = () => {
      if (requestIdRef.current !== requestId) return
      pendingImageRef.current = null
      setOriginalLoad(null)
      setSlides((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, src: originalSrc } : item
        )
      )
    }

    image.onload = () => {
      if (typeof image.decode === 'function') {
        void image.decode().then(complete).catch(fail)
      } else {
        complete()
      }
    }
    image.onerror = fail
    image.src = originalSrc
  }, [index, slides])

  const activeSlide = slides[index]
  const showOriginalButton = Boolean(
    activeSlide?.originalSrc && activeSlide.originalSrc !== activeSlide.src
  )
  const isOriginalLoading = originalLoad?.src === activeSlide?.originalSrc &&
    originalLoad?.status === 'loading'
  const originalLoadFailed = originalLoad?.src === activeSlide?.originalSrc &&
    originalLoad?.status === 'error'
  const originalLabel = isOriginalLoading
    ? t('lightbox.loadingOriginal')
    : originalLoadFailed
      ? t('lightbox.retryOriginal')
      : t('lightbox.viewOriginal')

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
            if (newIndex !== activeIndexRef.current) {
              activeIndexRef.current = newIndex
              cancelOriginalLoad()
            }
            setIndex(newIndex)
          },
        }}
        carousel={{ preload: 1 }}
        plugins={[Zoom, Captions]}
        captions={{ showToggle: true, descriptionTextAlign: 'center' }}
        toolbar={{
          buttons: [
            showOriginalButton ? (
              <button
                key="original"
                type="button"
                className="yarl__button flex min-h-10 items-center justify-center whitespace-nowrap px-2 text-xs font-medium"
                onClick={loadOriginal}
                disabled={isOriginalLoading}
                title={originalLabel}
                aria-label={originalLabel}
                style={{ lineHeight: '1.25rem' }}
              >
                {originalLabel}
              </button>
            ) : null,
            'close',
          ],
        }}
        render={{
          controls: () => isOriginalLoading || originalLoadFailed ? (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute top-16 right-4 z-20 flex min-w-36 flex-col gap-2 bg-black/75 px-3 py-2 text-xs text-white shadow-lg"
            >
              <span>
                {isOriginalLoading
                  ? t('lightbox.loadingOriginal')
                  : t('lightbox.originalFailed')}
              </span>
              {isOriginalLoading ? (
                <progress
                  aria-label={t('lightbox.loadingOriginal')}
                  className="h-1 w-full accent-white"
                />
              ) : null}
            </div>
          ) : null,
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
