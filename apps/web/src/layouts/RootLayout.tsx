import { Outlet } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'

export function RootLayout() {
  const { mode, setMode } = useTheme()

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-3xl">
        <NavBar />
        <main className="mt-8">
          <Outlet />
        </main>
        <Footer />
      </div>

      <ThemeToggle mode={mode} onModeChange={setMode} />
    </div>
  )
}
