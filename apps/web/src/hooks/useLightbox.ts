import { createContext, useContext } from 'react'

export interface LightboxSlide {
  src: string
  alt?: string
  description?: string
}

export interface LightboxContextValue {
  openLightbox: (slides: LightboxSlide[], index?: number) => void
  closeLightbox: () => void
}

export const LightboxContext = createContext<LightboxContextValue | undefined>(
  undefined
)

export function useLightbox() {
  const context = useContext(LightboxContext)
  if (!context) {
    throw new Error('useLightbox must be used within a LightboxProvider')
  }
  return context
}
