import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import { Footer } from '../components/layout/Footer'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useTheme } from '../hooks/useTheme'
import { useScrollVisibility } from '../hooks/useScrollVisibility'

export function RootLayout() {
  const { mode, setMode } = useTheme()
  const location = useLocation()
  const isBlogPage = location.pathname.startsWith('/blog')
  const isNavBarVisible = useScrollVisibility()

  return (
    <div 
      className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50"
    >
      {/* Sticky NavBar Container - Floating Effect */}
      <div 
        className={`sticky top-6 z-50 w-full pointer-events-none mb-8 transition-transform duration-300 ${
          isNavBarVisible ? 'translate-y-0' : '-translate-y-32'
        }`}
      >
        <div 
          className="mx-auto w-full pointer-events-auto max-w-[640px] md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px] px-4 transition-all duration-300"
        >
          <NavBar mode={mode} onModeChange={setMode} />
        </div>
      </div>

      {/* Main Content Wrapper */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Content Container */}
        <div className="flex flex-1 flex-col relative z-20">
          <Outlet />
        </div>

        {/* Footer Container - Pushed to bottom naturally */}
        {!isBlogPage && (
          <div className="mx-auto mt-auto w-full max-w-3xl px-4 pb-8 pt-8 relative z-20">
            <Footer />
          </div>
        )}
      </main>

      <ThemeToggle mode={mode} onModeChange={setMode} />
    </div>
  )
}
