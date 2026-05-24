import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'
import { NavBar } from '@/components/layout/NavBar'
import { GlobalSearchHost } from '@/components/search/GlobalSearchHost'
import { PageTransitionHost } from '@/components/transitions/PageTransitionHost'
import { DraggableBackToTop } from '@/components/ui/DraggableBackToTop'
import { GlobalLinkPreview } from '@/components/ui/GlobalLinkPreview'
import {
  ThemeCurtain,
  type ThemeCurtainState,
} from '@/components/ui/ThemeCurtain'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useScrollVisibility } from '@/hooks/useScrollVisibility'
import { type ThemeMode, useTheme } from '@/hooks/useTheme'

const CURTAIN_ENTER_MS = 420
const CURTAIN_HOLD_MS = 160
const CURTAIN_EXIT_MS = 520

function getResolvedThemeTone(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light'
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
  const [themeCurtain, setThemeCurtain] = useState<ThemeCurtainState | null>(
    null
  )
  const themeCurtainTimers = useRef<number[]>([])
  const isHome = pathname === '/'
  const hideBackToTop = pathname === '/'

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
    const tone = getResolvedThemeTone()
    setThemeCurtain({ phase: 'enter', tone })

    window.requestAnimationFrame(() => {
      setThemeCurtain({ phase: 'cover', tone })
    })

    scheduleThemeCurtainTimer(() => {
      setMode(nextMode)

      scheduleThemeCurtainTimer(() => {
        setThemeCurtain({ phase: 'exit', tone })
      }, CURTAIN_HOLD_MS)

      scheduleThemeCurtainTimer(() => {
        setThemeCurtain(null)
      }, CURTAIN_HOLD_MS + CURTAIN_EXIT_MS)
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
      {!hideBackToTop && <DraggableBackToTop />}
      <PageTransitionHost onActiveChange={setIsTransitionActive} />
      <GlobalSearchHost onOpenChange={setIsSearchOpen} />
      <GlobalLinkPreview />
    </div>
  )
}
