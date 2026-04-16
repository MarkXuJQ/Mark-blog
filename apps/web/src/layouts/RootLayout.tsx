import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import { Footer } from '../components/layout/Footer'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { PageTransitionHost } from '../components/transitions/PageTransitionHost'
import { GlobalSearchHost } from '../components/search/GlobalSearchHost'
import { DraggableBackToTop } from '../components/ui/DraggableBackToTop'
import { useTheme } from '../hooks/useTheme'
import { useScrollVisibility } from '../hooks/useScrollVisibility'
import { cn } from '../utils/cn'

export function RootLayout() {
  const { mode, setMode } = useTheme()
  const { pathname } = useLocation()
  const isNavBarVisible = useScrollVisibility()
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isTransitionActive, setIsTransitionActive] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const isHome = pathname === '/'
  const hideBackToTop = pathname === '/'

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

  return (
    <div
      className={cn(
        'relative flex min-h-screen w-full flex-col text-[var(--text-primary)]',
        isHome
          ? 'bg-[#fdf9f0] transition-colors duration-300'
          : 'bg-[var(--page-background)] transition-colors duration-300'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {isHome ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.11),rgba(56,189,248,0.05)_24%,rgba(255,255,255,0)_56%)]" />
            <div className="absolute top-[36rem] -right-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.1)_0%,rgba(249,115,22,0.04)_34%,rgba(255,255,255,0)_72%)]" />
            <div className="absolute bottom-0 -left-44 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.09)_0%,rgba(56,189,248,0.03)_30%,rgba(255,255,255,0)_72%)]" />
          </>
        ) : null}
      </div>
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
          <NavBar mode={mode} onModeChange={setMode} />
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

      <ThemeToggle mode={mode} onModeChange={setMode} />
      {!hideBackToTop && <DraggableBackToTop />}
      <PageTransitionHost onActiveChange={setIsTransitionActive} />
      <GlobalSearchHost onOpenChange={setIsSearchOpen} />
    </div>
  )
}
