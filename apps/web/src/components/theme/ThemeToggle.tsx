import { Monitor, Sun } from 'lucide-react'
import type { ThemeMode } from '@/hooks/useTheme'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ThemeToggleProps = {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

export function ThemeToggle({ mode, onModeChange }: ThemeToggleProps) {
  const themes = ['light', 'system', 'dark'] as const
  const knobTransformByMode: Record<ThemeMode, string> = {
    light: 'translateX(0%)',
    system: 'translateX(100%)',
    dark: 'translateX(200%)',
  }
  const knobClassNameByMode: Record<ThemeMode, string> = {
    light:
      'bg-gradient-to-b from-white to-amber-50 ring-1 ring-amber-200/60 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)]',
    system:
      'bg-gradient-to-b from-white to-indigo-50 ring-1 ring-indigo-200/60 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.35)]',
    dark: 'bg-gradient-to-b from-[#23262c] to-[#17191c] ring-1 ring-white/10 shadow-[0_10px_22px_-12px_rgba(0,0,0,0.65)]',
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
    <div className="fixed bottom-6 left-6 z-50 hidden md:block">
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="relative isolate flex items-center rounded-full bg-white/70 p-1 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-md transition-[background-color,box-shadow] duration-500 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-full before:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.95),rgba(255,255,255,0.55),rgba(255,255,255,0.20))] before:content-[''] dark:bg-[#17191c] dark:ring-[#2b2f36] dark:before:bg-[radial-gradient(ellipse_at_top,rgba(120,130,145,0.18),rgba(23,25,28,0.00))]"
      >
        <div
          suppressHydrationWarning
          className={`absolute top-1 left-1 z-[1] h-7 w-9 rounded-full transition-[transform,box-shadow,background] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform ${knobClassNameByMode[mode]}`}
          style={{
            transform: knobTransformByMode[mode],
          }}
        />

        <TooltipProvider delayDuration={120}>
          {themes.map((m) => (
            <Tooltip key={m}>
              <TooltipTrigger asChild>
                <button
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
                  {m === 'light' && (
                    <Sun
                      size={14}
                      className={`transition-all duration-300 ${
                        mode === 'light'
                          ? 'scale-110 opacity-100'
                          : 'opacity-85'
                      }`}
                    />
                  )}

                  {m === 'system' && (
                    <span className="relative inline-flex h-[14px] w-[14px] items-center justify-center">
                      <Monitor
                        size={14}
                        className={`transition-all duration-300 ${
                          mode === 'system'
                            ? 'scale-110 opacity-100'
                            : 'opacity-85'
                        }`}
                      />
                      <span
                        className={`pointer-events-none absolute right-0 left-0 h-px rounded-full bg-current shadow-[0_0_10px_currentColor] transition-all duration-500 ${
                          mode === 'system'
                            ? 'top-[25%] opacity-60'
                            : 'top-[55%] opacity-0 group-hover:top-[25%] group-hover:opacity-60'
                        }`}
                      />
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
                      className={`overflow-visible transition-all duration-300 ${
                        mode === 'dark' ? 'scale-110 opacity-100' : 'opacity-85'
                      }`}
                    >
                      <path
                        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                        className={`origin-center transition-transform duration-500 ${
                          mode === 'dark' ? '-rotate-[10deg]' : ''
                        } group-hover:-rotate-[10deg]`}
                      />
                      <path
                        d="M 18 2 Q 18 5.5 21.5 5.5 Q 18 5.5 18 9 Q 18 5.5 14.5 5.5 Q 18 5.5 18 2 Z"
                        fill="currentColor"
                        stroke="none"
                        className={`origin-[18px_5.5px] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                          mode === 'dark'
                            ? 'scale-100'
                            : 'scale-0 group-hover:scale-100'
                        }`}
                      />
                    </svg>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" showArrow className="text-xs">
                {tooltipByMode[m]}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  )
}
