import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'

export function RootLayout() {
  const { mode, setMode } = useTheme()
  const location = useLocation()
  const isBlogPage = location.pathname.startsWith('/blog')

  return (
    <div 
      className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50"
    >
      {/* Sticky NavBar Container - Floating Effect */}
      <div className="sticky top-6 z-50 w-full pointer-events-none mb-8">
        <div 
          className={`mx-auto w-full pointer-events-auto transition-all duration-300 ${
            isBlogPage 
              ? 'max-w-[1400px] px-4' 
              : 'max-w-[640px] md:max-w-[680px] lg:max-w-[720px] xl:max-w-[760px]'
          }`}
        >
          <NavBar />
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
