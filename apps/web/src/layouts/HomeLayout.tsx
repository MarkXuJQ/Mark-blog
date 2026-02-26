import { Outlet } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'

export function HomeLayout() {
  const { mode, setMode } = useTheme()

  return (
    <div className="relative min-h-screen text-slate-900 transition-colors duration-300 dark:text-slate-50">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/image1.jpg")',
        }}
      />

      {/* Glass/Blur Effect Layer - Increased opacity for better text readability */}
      <div className="fixed inset-0 z-0 bg-white/60 backdrop-blur-md transition-colors duration-500 dark:bg-black/50" />

      {/* Content Layer */}
      <div className="relative z-10 flex min-h-screen flex-col p-4">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <NavBar />
          
          <main className="mt-20 flex flex-1 flex-col items-center justify-center text-center">
            <Outlet />
          </main>
          
          <Footer />
        </div>
      </div>

      <ThemeToggle mode={mode} onModeChange={setMode} />
    </div>
  )
}
