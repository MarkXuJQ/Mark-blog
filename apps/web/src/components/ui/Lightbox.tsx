'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";

interface LightboxContextType {
  openLightbox: (slides: { src: string; alt?: string; description?: string }[], index?: number) => void
  closeLightbox: () => void
}

const LightboxContext = createContext<LightboxContextType | undefined>(undefined)

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [slides, setSlides] = useState<{ src: string; alt?: string; description?: string }[]>([])

  const openLightbox = useCallback((newSlides: { src: string; alt?: string; description?: string }[], newIndex = 0) => {
    // Map alt to description for Captions plugin
    const processedSlides = newSlides.map(slide => ({
      ...slide,
      description: slide.description || slide.alt // Use alt as description if description is missing
    }))
    setSlides(processedSlides)
    setIndex(newIndex)
    setOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setOpen(false)
  }, [])

  const contextValue = useMemo(() => ({ openLightbox, closeLightbox }), [openLightbox, closeLightbox])

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

export function useLightbox() {
  const context = useContext(LightboxContext)
  if (context === undefined) {
    throw new Error('useLightbox must be used within a LightboxProvider')
  }
  return context
}
