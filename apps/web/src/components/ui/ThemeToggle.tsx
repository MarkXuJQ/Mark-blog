import { Monitor, Moon, Sun } from 'lucide-react'
import { type ThemeMode } from '../../hooks/useTheme'

export type ThemeToggleProps = {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

export function ThemeToggle({ mode, onModeChange }: ThemeToggleProps) {
  const themes = ['light', 'system', 'dark'] as const
  const currentIndex = themes.indexOf(mode)

  return (
    <div className="hidden md:block fixed bottom-6 left-6 z-50">
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="relative flex items-center rounded-full bg-slate-900/80 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
      >
        {/* The sliding knob */}
        <div
          className="absolute left-1 top-1 h-7 w-9 rounded-full bg-white shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            transform: `translateX(${currentIndex * 100}%)`,
          }}
        />

        {themes.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={`relative z-10 flex h-7 w-9 items-center justify-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              mode === m
                ? 'text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => onModeChange(m)}
            aria-label={`${m.charAt(0).toUpperCase() + m.slice(1)} mode`}
          >
            {m === 'light' && <Sun size={14} />}
            {m === 'system' && <Monitor size={14} />}
            {m === 'dark' && <Moon size={14} />}
          </button>
        ))}
      </div>
    </div>
  )
}
