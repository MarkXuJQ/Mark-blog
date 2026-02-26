import { Outlet } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'
import { cn } from '../utils/cn'

export function RootLayout() {
  const { mode, setMode } = useTheme()

  return (
    <div 
      className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50"
    >
      {/* Fixed NavBar Container - Floating Effect */}
      <div className="fixed left-0 right-0 top-6 z-50 pointer-events-none">
        <div className="mx-auto w-full max-w-3xl px-4 pointer-events-auto">
          <NavBar />
        </div>
      </div>

      {/* Main Content Wrapper - Scrollable Area */}
      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto overflow-x-hidden pt-24">
        {/* Content Container */}
        <div className="flex flex-1 flex-col relative z-20">
          <Outlet />
        </div>

        {/* Footer Container - Pushed to bottom naturally */}
        <div className="mx-auto mt-auto w-full max-w-3xl px-4 pb-8 pt-8 relative z-20">
          <Footer />
        </div>
      </main>

      <ThemeToggle mode={mode} onModeChange={setMode} />
    </div>
  )
}
