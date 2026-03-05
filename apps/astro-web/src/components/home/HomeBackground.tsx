import { useEffect, useState } from 'react'
import { getImageUrl } from '../../utils/image'
import { cn } from '../../utils/cn'

interface ResponsiveBackgroundSources {
  avif: string
  webp: string
  fallback: string
}

const DAY_SOURCES: ResponsiveBackgroundSources = {
  avif: [
    `${getImageUrl('/images/day-640.avif')} 640w`,
    `${getImageUrl('/images/day-960.avif')} 960w`,
    `${getImageUrl('/images/day-1280.avif')} 1280w`,
    `${getImageUrl('/images/day-1600.avif')} 1600w`,
    `${getImageUrl('/images/day-1633.avif')} 1633w`,
  ].join(', '),
  webp: [
    `${getImageUrl('/images/day-640.webp')} 640w`,
    `${getImageUrl('/images/day-960.webp')} 960w`,
    `${getImageUrl('/images/day-1280.webp')} 1280w`,
    `${getImageUrl('/images/day-1600.webp')} 1600w`,
    `${getImageUrl('/images/day-1633.webp')} 1633w`,
  ].join(', '),
  fallback: '/images/day.png',
}

const NIGHT_SOURCES: ResponsiveBackgroundSources = {
  avif: [
    `${getImageUrl('/images/night-640.avif')} 640w`,
    `${getImageUrl('/images/night-960.avif')} 960w`,
    `${getImageUrl('/images/night-1280.avif')} 1280w`,
    `${getImageUrl('/images/night-1392.avif')} 1392w`,
  ].join(', '),
  webp: [
    `${getImageUrl('/images/night-640.webp')} 640w`,
    `${getImageUrl('/images/night-960.webp')} 960w`,
    `${getImageUrl('/images/night-1280.webp')} 1280w`,
    `${getImageUrl('/images/night-1392.webp')} 1392w`,
  ].join(', '),
  fallback: '/images/night.png',
}

function getInitialIsDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function HomeBackground() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode)

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => {
      setIsDarkMode(root.classList.contains('dark'))
    }

    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Home Background (Day) - Cross-fade transition */}
      <div
        className={cn(
          'fixed inset-0 z-0 overflow-hidden transition-opacity duration-1000 ease-in-out',
          isDarkMode ? 'opacity-0' : 'opacity-100'
        )}
      >
        <picture>
          <source type="image/avif" srcSet={DAY_SOURCES.avif} sizes="100vw" />
          <source type="image/webp" srcSet={DAY_SOURCES.webp} sizes="100vw" />
          <img
            src={getImageUrl(DAY_SOURCES.fallback)}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            decoding="async"
            fetchPriority={isDarkMode ? 'auto' : 'high'}
          />
        </picture>
      </div>

      {/* Home Background (Night) - Cross-fade transition */}
      <div
        className={cn(
          'fixed inset-0 z-0 overflow-hidden transition-opacity duration-1000 ease-in-out',
          isDarkMode ? 'opacity-100' : 'opacity-0'
        )}
      >
        <picture>
          <source type="image/avif" srcSet={NIGHT_SOURCES.avif} sizes="100vw" />
          <source type="image/webp" srcSet={NIGHT_SOURCES.webp} sizes="100vw" />
          <img
            src={getImageUrl(NIGHT_SOURCES.fallback)}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            decoding="async"
            fetchPriority={isDarkMode ? 'high' : 'auto'}
          />
        </picture>
      </div>
    </>
  )
}
