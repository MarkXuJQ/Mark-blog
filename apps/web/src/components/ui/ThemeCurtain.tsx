import { cn } from '@/lib/utils'

type ThemeCurtainPhase = 'enter' | 'cover' | 'exit'
type ThemeCurtainTone = 'light' | 'dark'

export interface ThemeCurtainState {
  phase: ThemeCurtainPhase
  tone: ThemeCurtainTone
}

interface ThemeCurtainProps {
  state: ThemeCurtainState | null
}

export function ThemeCurtain({ state }: ThemeCurtainProps) {
  if (!state) return null

  const isMoving = state.phase !== 'cover'
  const translateY = state.phase === 'cover' ? '0%' : '-100%'
  const transitionDuration = state.phase === 'exit' ? '520ms' : '420ms'
  const transitionTimingFunction =
    state.phase === 'exit'
      ? 'cubic-bezier(0.55, 0, 0.1, 1)'
      : 'cubic-bezier(0.2, 0.82, 0.18, 1)'

  return (
    <div
      aria-hidden="true"
      data-theme-curtain={state.phase}
      className="pointer-events-auto fixed inset-0 z-[240] overflow-hidden"
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[115svh] will-change-transform',
          'transition-transform',
          state.tone === 'dark' ? 'bg-[#141414]' : 'bg-[#fdf9f0]'
        )}
        style={{
          transform: `translateY(${translateY})`,
          transitionDuration,
          transitionTimingFunction,
        }}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-28 transition-opacity duration-300',
            state.tone === 'dark'
              ? 'bg-gradient-to-b from-transparent via-white/[0.035] to-black/42'
              : 'bg-gradient-to-b from-transparent via-white/50 to-slate-900/14',
            isMoving ? 'opacity-100' : 'opacity-60'
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-px',
            state.tone === 'dark'
              ? 'bg-gradient-to-r from-transparent via-white/22 to-transparent'
              : 'bg-gradient-to-r from-transparent via-slate-900/18 to-transparent'
          )}
        />
      </div>
    </div>
  )
}
