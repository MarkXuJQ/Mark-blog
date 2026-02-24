import { Monitor, Moon, Sun } from 'lucide-react'
import { type ThemeMode } from '../hooks/useTheme'

export type ThemeToggleProps = {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

export function ThemeToggle({ mode, onModeChange }: ThemeToggleProps) {
  // Maps the current mode to the exact horizontal translation value
  const knobPosition = {
    light: 'translate-x-0',
    system: 'translate-x-[36px]',
    dark: 'translate-x-[72px]',
  }[mode]

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="relative flex w-[116px] items-center rounded-full bg-slate-900/80 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-all"
      >
        {/* The sliding knob */}
        <div
          className={`absolute left-1 top-1 h-7 w-8 rounded-full bg-white shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${knobPosition}`}
        />

        {(['light', 'system', 'dark'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            // eslint-disable-next-line jsx-a11y/role-supports-aria-props
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
