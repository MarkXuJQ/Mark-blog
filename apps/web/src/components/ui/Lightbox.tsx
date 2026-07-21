import { useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/plugins/captions.css'
import { getOriginalImageUrl } from '@/lib/image'
import { LightboxContext, type LightboxSlide } from '@/hooks/useLightbox'

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [slides, setSlides] = useState<LightboxSlide[]>([])

  const openLightbox = useCallback(
    (newSlides: LightboxSlide[], newIndex = 0) => {
      const processedSlides = newSlides.map((slide) => ({
        ...slide,
        src: getOriginalImageUrl(slide.src),
        description: slide.description || slide.alt,
      }))
      setSlides(processedSlides)
      setIndex(newIndex)
      setOpen(true)
    },
    []
  )

  const closeLightbox = useCallback(() => {
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
          view: ({ index: newIndex }) => setIndex(newIndex),
        }}
        plugins={[Zoom, Captions]}
        captions={{ showToggle: true, descriptionTextAlign: 'center' }}
      />
    </LightboxContext.Provider>
  )
}
