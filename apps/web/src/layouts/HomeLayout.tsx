import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { getImageUrl } from '../utils/image'
import { cn } from '../utils/cn'

interface ResponsiveBackgroundSources {
  avif: string
  webp: string
  fallback: string
}

type ThemeVariant = 'day' | 'night'

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

function getThemeVariant(isDarkMode: boolean): ThemeVariant {
  return isDarkMode ? 'night' : 'day'
}

const BACKGROUND_SOURCES: Record<ThemeVariant, ResponsiveBackgroundSources> = {
  day: DAY_SOURCES,
  night: NIGHT_SOURCES,
}

function HomeBackgroundLayer({
  theme,
  className,
  fetchPriority = 'auto',
}: {
  theme: ThemeVariant
  className?: string
  fetchPriority?: 'auto' | 'high'
}) {
  const sources = BACKGROUND_SOURCES[theme]

  return (
    <div
      className={cn(
        'fixed inset-0 z-0 overflow-hidden transition-opacity duration-1000 ease-in-out',
        className
      )}
      data-home-background={theme}
    >
      <picture>
        <source type="image/avif" srcSet={sources.avif} sizes="100vw" />
        <source type="image/webp" srcSet={sources.webp} sizes="100vw" />
        <img
          src={getImageUrl(sources.fallback)}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          decoding="async"
          fetchPriority={fetchPriority}
        />
      </picture>
    </div>
  )
}

export function HomeLayout() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode)
  const [activeTheme, setActiveTheme] = useState<ThemeVariant>(() =>
    getThemeVariant(getInitialIsDarkMode())
  )
  const [exitingTheme, setExitingTheme] = useState<ThemeVariant | null>(null)
  const [isExitingVisible, setIsExitingVisible] = useState(false)

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

  useEffect(() => {
    const nextTheme = getThemeVariant(isDarkMode)
    if (nextTheme === activeTheme) return

    setExitingTheme(activeTheme)
    setActiveTheme(nextTheme)
    setIsExitingVisible(true)

    const frameId = window.requestAnimationFrame(() => {
      setIsExitingVisible(false)
    })
    const timeoutId = window.setTimeout(() => {
      setExitingTheme(null)
    }, 1000)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [activeTheme, isDarkMode])

  return (
    <>
      <HomeBackgroundLayer theme={activeTheme} className="opacity-100" fetchPriority="high" />
      {exitingTheme && (
        <HomeBackgroundLayer
          theme={exitingTheme}
          className={isExitingVisible ? 'opacity-100' : 'opacity-0'}
        />
      )}

      <div className="fixed inset-0 z-0 bg-white/40 backdrop-blur-md transition-colors duration-500 dark:bg-black/50" />

      {/* Content Container - Vertically Centered */}
      <div className="relative z-10 flex min-h-[calc(100vh-140px)] flex-col items-center justify-center pt-20 pb-20 text-center">
        <Outlet />
      </div>
    </>
  )
}
