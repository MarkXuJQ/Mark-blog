import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'
import { NavBar } from '@/components/layout/NavBar'
import { GlobalSearchHost } from '@/components/search/GlobalSearchHost'
import { PageTransitionHost } from '@/components/transitions/PageTransitionHost'
import {
  ThemeCurtain,
  type ThemeCurtainState,
} from '@/components/ui/ThemeCurtain'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useScrollVisibility } from '@/hooks/useScrollVisibility'
import { type ThemeMode, useTheme } from '@/hooks/useTheme'

const LazyDraggableBackToTop = lazy(() =>
  import('@/components/ui/DraggableBackToTop').then((module) => ({
    default: module.DraggableBackToTop,
  }))
)
const LazyGlobalLinkPreview = lazy(() =>
  import('@/components/ui/GlobalLinkPreview').then((module) => ({
    default: module.GlobalLinkPreview,
  }))
)

const CURTAIN_TIMING_SCALE = 1.5
const CURTAIN_ENTER_MS = Math.round(180 * CURTAIN_TIMING_SCALE)
const CURTAIN_SWITCH_HOLD_MS = Math.round(120 * CURTAIN_TIMING_SCALE)
const CURTAIN_SETTLE_MS = Math.round(320 * CURTAIN_TIMING_SCALE)
const CURTAIN_EXIT_MS = Math.round(180 * CURTAIN_TIMING_SCALE)

function getResolvedThemeTone(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light'
}

function getThemeModeTone(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  return mode
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function RootLayout() {
  const { mode, setMode } = useTheme()
  const { pathname } = useLocation()
  const isNavBarVisible = useScrollVisibility()
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isTransitionActive, setIsTransitionActive] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [areClientInteractionsReady, setAreClientInteractionsReady] =
    useState(false)
  const [themeCurtain, setThemeCurtain] = useState<ThemeCurtainState | null>(
    null
  )
  const themeCurtainTimers = useRef<number[]>([])
  const isHome = pathname === '/'
  const hideBackToTop = pathname === '/'
  const supportsLinkPreviews = pathname.startsWith('/blog/')

  const clearThemeCurtainTimers = () => {
    themeCurtainTimers.current.forEach((timerId) => {
      window.clearTimeout(timerId)
    })
    themeCurtainTimers.current = []
  }

  const scheduleThemeCurtainTimer = (callback: () => void, delay: number) => {
    const timerId = window.setTimeout(() => {
      themeCurtainTimers.current = themeCurtainTimers.current.filter(
        (id) => id !== timerId
      )
      callback()
    }, delay)
    themeCurtainTimers.current.push(timerId)
  }

  const handleThemeModeChange = (nextMode: ThemeMode) => {
    if (nextMode === mode || prefersReducedMotion()) {
      setMode(nextMode)
      return
    }

    clearThemeCurtainTimers()
    const fromTone = getResolvedThemeTone()
    const toTone = getThemeModeTone(nextMode)
    setThemeCurtain({ phase: 'enter', fromTone, toTone })

    window.requestAnimationFrame(() => {
      setThemeCurtain({ phase: 'cover', fromTone, toTone })
    })

    scheduleThemeCurtainTimer(() => {
      scheduleThemeCurtainTimer(() => {
        setMode(nextMode)
        setThemeCurtain({ phase: 'settle', fromTone, toTone })

        scheduleThemeCurtainTimer(() => {
          setThemeCurtain({ phase: 'exit', fromTone, toTone })
        }, CURTAIN_SETTLE_MS)

        scheduleThemeCurtainTimer(() => {
          setThemeCurtain(null)
        }, CURTAIN_SETTLE_MS + CURTAIN_EXIT_MS)
      }, CURTAIN_SWITCH_HOLD_MS)
    }, CURTAIN_ENTER_MS)
  }

  useEffect(() => {
    const onOverlayChange = (event: Event) => {
      const e = event as CustomEvent<{ open?: boolean }>
      setIsOverlayOpen(Boolean(e.detail?.open))
    }

    window.addEventListener('app:overlay', onOverlayChange as EventListener)
    return () =>
      window.removeEventListener(
        'app:overlay',
        onOverlayChange as EventListener
      )
  }, [])

  useEffect(() => {
    return clearThemeCurtainTimers
  }, [])

  useEffect(() => {
    if (window.__PRERENDER__) return
    setAreClientInteractionsReady(true)
  }, [])

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[var(--page-background)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Sticky NavBar Container - Floating Effect */}
      <div
        className={`z-50 w-full transition-transform duration-300 ${
          isHome
            ? 'pointer-events-none fixed inset-x-0 top-6'
            : 'pointer-events-none sticky top-6 mb-8'
        } ${
          isNavBarVisible &&
          !isOverlayOpen &&
          !isTransitionActive &&
          !isSearchOpen
            ? 'translate-y-0'
            : '-translate-y-32'
        }`}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-[640px] px-4 md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]">
          <NavBar mode={mode} onModeChange={handleThemeModeChange} />
        </div>
      </div>

      {/* Main Content Wrapper */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Content Container */}
        <div className="relative z-20 flex flex-1 flex-col">
          <Outlet />
        </div>

        {/* Footer Container - Pushed to bottom naturally */}
        {!isHome && !isOverlayOpen && !isTransitionActive && !isSearchOpen && (
          <div className="relative z-20 mx-auto mt-auto w-full max-w-3xl px-4 pt-8 pb-8">
            <Footer />
          </div>
        )}
      </main>

      <ThemeToggle mode={mode} onModeChange={handleThemeModeChange} />
      <ThemeCurtain state={themeCurtain} />
      {areClientInteractionsReady && !hideBackToTop ? (
        <Suspense fallback={null}>
          <LazyDraggableBackToTop />
        </Suspense>
      ) : null}
      <PageTransitionHost onActiveChange={setIsTransitionActive} />
      <GlobalSearchHost onOpenChange={setIsSearchOpen} />
      {areClientInteractionsReady && supportsLinkPreviews ? (
        <Suspense fallback={null}>
          <LazyGlobalLinkPreview />
        </Suspense>
      ) : null}
    </div>
  )
}
