export type ThemeMode = 'light' | 'system' | 'dark'

export type ThemeToggleProps = {
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
}

export function ThemeToggle({ mode, onModeChange }: ThemeToggleProps) {
  const knobPositionClass =
    mode === 'light'
      ? 'translate-x-0'
      : mode === 'system'
        ? 'translate-x-[36px]'
        : 'translate-x-[72px]'

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="relative flex w-[108px] items-center justify-between rounded-full bg-slate-800/90 p-2 text-xs text-slate-100 shadow-lg backdrop-blur">
        <div
          className={`pointer-events-none absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${knobPositionClass}`}
        />
        <button
          type="button"
          className="relative z-10 flex h-6 w-6 items-center justify-center"
          onClick={() => onModeChange('light')}
        >
          <span className="text-[11px]">☀</span>
        </button>
        <button
          type="button"
          className="relative z-10 flex h-6 w-6 items-center justify-center"
          onClick={() => onModeChange('system')}
        >
          <span className="text-[11px]">💻</span>
        </button>
        <button
          type="button"
          className="relative z-10 flex h-6 w-6 items-center justify-center"
          onClick={() => onModeChange('dark')}
        >
          <span className="text-[11px]">🌙</span>
        </button>
      </div>
    </div>
  )
}

