import { useEffect, useLayoutEffect, useState } from 'react'
import { Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeCurtainPhase = 'enter' | 'cover' | 'settle' | 'exit'
type ThemeCurtainTone = 'light' | 'dark'

const TONE_BACKGROUND: Record<ThemeCurtainTone, string> = {
  light: '#fdf9f0',
  dark: '#141414',
}

export interface ThemeCurtainState {
  phase: ThemeCurtainPhase
  fromTone: ThemeCurtainTone
  toTone: ThemeCurtainTone
}

interface ThemeCurtainProps {
  state: ThemeCurtainState | null
}

function getViewportCenter() {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 }
  }

  const viewport = window.visualViewport

  if (viewport) {
    return {
      x: viewport.offsetLeft + viewport.width / 2,
      y: viewport.offsetTop + viewport.height / 2,
    }
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }
}

export function ThemeCurtain({ state }: ThemeCurtainProps) {
  const [viewportCenter, setViewportCenter] = useState(getViewportCenter)

  const updateViewportCenter = () => {
    setViewportCenter(getViewportCenter())
  }

  useLayoutEffect(() => {
    if (!state) return

    updateViewportCenter()
  }, [state])

  useEffect(() => {
    if (!state || typeof window === 'undefined') return

    const viewport = window.visualViewport

    updateViewportCenter()
    window.addEventListener('resize', updateViewportCenter)
    window.addEventListener('orientationchange', updateViewportCenter)
    viewport?.addEventListener('resize', updateViewportCenter)
    viewport?.addEventListener('scroll', updateViewportCenter)

    return () => {
      window.removeEventListener('resize', updateViewportCenter)
      window.removeEventListener('orientationchange', updateViewportCenter)
      viewport?.removeEventListener('resize', updateViewportCenter)
      viewport?.removeEventListener('scroll', updateViewportCenter)
    }
  }, [state])

  if (!state) return null

  const isCovered = state.phase === 'cover' || state.phase === 'settle'
  const translateY =
    state.phase === 'cover' || state.phase === 'settle' ? '0%' : '-100%'
  const transitionDuration = state.phase === 'exit' ? '650ms' : '420ms'
  const isTargetDark = state.toTone === 'dark'
  const isSettled = state.phase === 'settle' || state.phase === 'exit'
  const isSymbolVisible = state.phase === 'cover' || state.phase === 'settle'
  const visualTone = isSettled ? state.toTone : state.fromTone
  const isVisualDark = visualTone === 'dark'
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
          'absolute inset-x-0 top-0 h-[115svh] overflow-hidden will-change-transform transition-transform'
        )}
        style={{
          transform: `translateY(${translateY})`,
          backgroundColor: TONE_BACKGROUND[state.fromTone],
          transitionDuration,
          transitionTimingFunction,
        }}
      >
        <div
          className={cn(
            'theme-curtain-target absolute top-0 bottom-0 left-0 w-[calc(100%+8rem)] transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            isSettled ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{
            background: `linear-gradient(90deg, ${TONE_BACKGROUND[state.toTone]} 0%, ${TONE_BACKGROUND[state.toTone]} calc(100% - 8rem), transparent 100%)`,
          }}
        />
        <div
          className={cn(
            'theme-curtain-scene pointer-events-none absolute inset-x-0 top-0 h-[100svh] overflow-hidden transition-opacity duration-[420ms]',
            state.phase === 'enter' ? 'opacity-0' : 'opacity-100'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 transition-[background,opacity] duration-[1100ms]',
              isVisualDark
                ? 'opacity-100 bg-[linear-gradient(135deg,rgba(96,165,250,0.12),transparent_36%,rgba(2,6,23,0.22)_72%,transparent)]'
                : 'opacity-100 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),transparent_36%,rgba(255,255,255,0.5)_70%,transparent)]'
            )}
          />
          {isVisualDark ? (
            <div className="theme-curtain-stars absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.7)_0_1.1px,transparent_1.7px),radial-gradient(circle_at_74%_26%,rgba(191,219,254,0.72)_0_1px,transparent_1.8px),radial-gradient(circle_at_34%_68%,rgba(255,255,255,0.56)_0_1px,transparent_1.7px),radial-gradient(circle_at_82%_72%,rgba(186,230,253,0.64)_0_1px,transparent_1.7px)] bg-[length:18rem_18rem,22rem_22rem,20rem_20rem,26rem_26rem]" />
          ) : null}
        </div>
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-28 transition-opacity duration-300',
            isVisualDark
              ? 'bg-gradient-to-b from-transparent via-white/[0.035] to-black/42'
              : 'bg-gradient-to-b from-transparent via-white/50 to-slate-900/14',
            isCovered ? 'opacity-60' : 'opacity-100'
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-px',
            isVisualDark
              ? 'bg-gradient-to-r from-transparent via-white/22 to-transparent'
              : 'bg-gradient-to-r from-transparent via-slate-900/18 to-transparent'
          )}
        />
      </div>
      <div
        className={cn(
          'pointer-events-none fixed inset-0 z-10 overflow-hidden transition-opacity',
          isSymbolVisible
            ? 'opacity-100 duration-[420ms]'
            : 'opacity-0 duration-200'
        )}
      >
        <div
          className="theme-curtain-symbol fixed flex h-32 w-32 items-center justify-center rounded-full sm:h-40 sm:w-40 lg:h-44 lg:w-44"
          style={{
            left: viewportCenter.x,
            top: viewportCenter.y,
          }}
        >
          {isTargetDark ? (
            <svg
              width="176"
              height="176"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.45"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="theme-curtain-theme-icon h-full w-full overflow-visible text-slate-100 drop-shadow-[0_24px_56px_rgba(2,6,23,0.42)]"
            >
              <path
                d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                fill="currentColor"
                className="text-slate-100"
              />
              <path
                d="M 18 2 Q 18 5.5 21.5 5.5 Q 18 5.5 18 9 Q 18 5.5 14.5 5.5 Q 18 5.5 18 2 Z"
                fill="currentColor"
                stroke="none"
                className="origin-[18px_5.5px] text-sky-200"
              />
            </svg>
          ) : (
            <div className="relative h-full w-full">
              <Sun
                aria-hidden="true"
                size={176}
                strokeWidth={1.45}
                className="theme-curtain-theme-icon absolute inset-0 h-full w-full fill-orange-500 text-orange-500 drop-shadow-[0_24px_56px_rgba(234,88,12,0.24)]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
