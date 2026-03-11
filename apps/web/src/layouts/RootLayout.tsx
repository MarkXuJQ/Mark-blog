import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import { Footer } from '../components/layout/Footer'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { PageTransitionOverlay } from '../components/transitions/PageTransitionOverlay'
import { useTheme } from '../hooks/useTheme'
import { useScrollVisibility } from '../hooks/useScrollVisibility'

export function RootLayout() {
  const { mode, setMode } = useTheme()
  const isNavBarVisible = useScrollVisibility()
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isTransitionActive, setIsTransitionActive] = useState(false)

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
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      {/* Sticky NavBar Container - Floating Effect */}
      <div
        className={`pointer-events-none sticky top-6 z-50 mb-8 w-full transition-transform duration-300 ${
          isNavBarVisible && !isOverlayOpen && !isTransitionActive
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
        {!isOverlayOpen && !isTransitionActive && (
          <div className="relative z-20 mx-auto mt-auto w-full max-w-3xl px-4 pt-8 pb-8">
            <Footer />
          </div>
        )}
      </main>

      <ThemeToggle mode={mode} onModeChange={setMode} />
      <PageTransitionOverlay onActiveChange={setIsTransitionActive} />
    </div>
  )
}
