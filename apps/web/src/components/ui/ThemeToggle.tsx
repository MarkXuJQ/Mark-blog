import { Monitor, Sun } from 'lucide-react'
import { type ThemeMode } from '../../hooks/useTheme'

export type ThemeToggleProps = {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

export function ThemeToggle({ mode, onModeChange }: ThemeToggleProps) {
  const themes = ['light', 'system', 'dark'] as const
  const currentIndex = themes.indexOf(mode)
  const knobClassNameByMode: Record<ThemeMode, string> = {
    light:
      'bg-gradient-to-b from-white to-amber-50 ring-1 ring-amber-200/60 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)]',
    system:
      'bg-gradient-to-b from-white to-indigo-50 ring-1 ring-indigo-200/60 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)]',
    dark:
      'bg-gradient-to-b from-slate-950 to-slate-800 ring-1 ring-white/10 shadow-[0_10px_22px_-12px_rgba(0,0,0,0.65)]',
  }

  const activeTextClassNameByMode: Record<ThemeMode, string> = {
    light: 'text-amber-700',
    system: 'text-indigo-700',
    dark: 'text-slate-100',
  }

  const tooltipByMode: Record<ThemeMode, string> = {
    light: '浅色模式',
    system: '跟随系统',
    dark: '深色模式',
  }

  return (
    <div className="hidden md:block fixed bottom-6 left-6 z-50">
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="relative isolate flex items-center rounded-full bg-white/70 p-1 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-md transition-[background-color,box-shadow] duration-500 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-full before:content-[''] before:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.95),rgba(255,255,255,0.55),rgba(255,255,255,0.20))] dark:bg-slate-900/80 dark:ring-white/10 dark:before:bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.14),rgba(99,102,241,0.08),rgba(2,6,23,0.00))]"
      >
        {/* The sliding knob */}
        <div
          className={`absolute left-1 top-1 z-[1] h-7 w-9 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${knobClassNameByMode[mode]}`}
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
            className={`group relative z-10 flex h-7 w-9 items-center justify-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              mode === m
                ? activeTextClassNameByMode[m]
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => onModeChange(m)}
            aria-label={`${m.charAt(0).toUpperCase() + m.slice(1)} mode`}
          >
            <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
              {tooltipByMode[m]}
              <span className="absolute left-1/2 top-full -translate-x-1/2">
                <span className="block h-2 w-2 -translate-y-1 rotate-45 rounded-[2px] bg-slate-950/90 ring-1 ring-white/10" />
              </span>
            </span>

            {m === 'light' && (
              <Sun
                size={14}
                className="transition-transform duration-500 group-hover:rotate-180"
              />
            )}

            {m === 'system' && (
              <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center">
                <Monitor
                  size={14}
                  className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                />
                <span className="pointer-events-none absolute left-0 right-0 top-[55%] h-px rounded-full bg-current opacity-0 shadow-[0_0_10px_currentColor] transition-all duration-500 group-hover:top-[25%] group-hover:opacity-60" />
              </span>
            )}

            {m === 'dark' && (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="overflow-visible"
  >
    {/* The true, unmistakable crescent moon path */}
    <path
      d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
      className="transition-transform duration-500 origin-center group-hover:-rotate-[10deg]"
    />

    {/* The 4-point sparkle star appearing in the upper right gap */}
    <path
      d="M 18 2 Q 18 5.5 21.5 5.5 Q 18 5.5 18 9 Q 18 5.5 14.5 5.5 Q 18 5.5 18 2 Z"
      fill="currentColor"
      stroke="none"
      className="scale-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-100 origin-[18px_5.5px]"
    />
  </svg>
)}
          </button>
        ))}
      </div>
    </div>
  )
}
