import { Outlet, Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useTheme } from '../hooks/useTheme'
import { ArrowLeft } from 'lucide-react'

export function MinimalLayout() {
  const { mode, setMode } = useTheme()

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="fixed left-4 top-4 z-50">
        <Link 
          to="/" 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-all hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
          title="Back to Home"
        >
          <ArrowLeft size={20} />
        </Link>
      </div>

      <main className="mx-auto max-w-4xl py-20">
        <Outlet />
      </main>

      <ThemeToggle mode={mode} onModeChange={setMode} />
    </div>
  )
}
