import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import { Footer } from '../components/layout/Footer'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { PageTransitionOverlay } from '../components/transitions/PageTransitionOverlay'
import { GlobalSearchModal } from '../components/search/GlobalSearchModal'
import { useTheme } from '../hooks/useTheme'
import { useScrollVisibility } from '../hooks/useScrollVisibility'

export function RootLayout() {
  const { mode, setMode } = useTheme()
  const isNavBarVisible = useScrollVisibility()
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isTransitionActive, setIsTransitionActive] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const onOverlayChange = (event: Event) => {
      const e = event as CustomEvent<{ open?: boolean }>
      setIsOverlayOpen(Boolean(e.detail?.open))
    }

    window.addEventListener('app:overlay', onOverlayChange as EventListener)
    return () =>
      window.removeEventListener('app:overlay', onOverlayChange as EventListener)
  }, [])

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-bl from-amber-200/52 via-orange-100/12 to-sky-100/14 dark:from-sky-500/12 dark:via-transparent dark:to-amber-500/8" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-300/34 blur-[120px] dark:bg-sky-500/12" />
        <div className="absolute -left-24 -bottom-24 h-[28rem] w-[28rem] rounded-full bg-sky-200/16 blur-[132px] dark:bg-slate-500/8" />
      </div>
      {/* Sticky NavBar Container - Floating Effect */}
      <div
        className={`pointer-events-none sticky top-6 z-50 mb-8 w-full transition-transform duration-300 ${
          isNavBarVisible && !isOverlayOpen && !isTransitionActive && !isSearchOpen
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
        {!isOverlayOpen && !isTransitionActive && !isSearchOpen && (
          <div className="relative z-20 mx-auto mt-auto w-full max-w-3xl px-4 pt-8 pb-8">
            <Footer />
          </div>
        )}
      </main>

      <ThemeToggle mode={mode} onModeChange={setMode} />
      <PageTransitionOverlay onActiveChange={setIsTransitionActive} />
      <GlobalSearchModal onOpenChange={setIsSearchOpen} />
    </div>
  )
}
