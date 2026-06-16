import { Sun } from 'lucide-react'
import { useEffect, useLayoutEffect, useState } from 'react'
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
  const curtainOpacity =
    state.phase === 'enter' ? 0 : state.phase === 'exit' ? 0.92 : 1
  const curtainTranslateX =
    state.phase === 'enter' ? '-100%' : state.phase === 'exit' ? '100%' : '0%'
  const transitionDuration =
    state.phase === 'exit' ? '480ms' : state.phase === 'enter' ? '280ms' : '280ms'
  const isTargetDark = state.toTone === 'dark'
  const isSettled = state.phase === 'settle' || state.phase === 'exit'
  const isSymbolVisible = state.phase !== 'enter'
  const visualTone = isSettled ? state.toTone : state.fromTone
  const isVisualDark = visualTone === 'dark'
  const isTransitioningToDark = state.fromTone === 'light' && state.toTone === 'dark'
  const isTransitioningToLight = state.fromTone === 'dark' && state.toTone === 'light'
  const transitionTimingFunction =
    state.phase === 'exit'
      ? 'cubic-bezier(0.55, 0, 0.1, 1)'
      : 'cubic-bezier(0.2, 0.82, 0.18, 1)'

  const starOpacity =
    isTransitioningToDark
      ? state.phase === 'enter'
        ? 0
        : state.phase === 'cover'
          ? 0.72
          : state.phase === 'settle'
            ? 1
            : 0.9
      : isTransitioningToLight
        ? state.phase === 'enter'
          ? 0.9
          : state.phase === 'cover'
            ? 0.42
            : state.phase === 'settle'
              ? 0
              : 0
        : isVisualDark
          ? 0.9
          : 0

  const activeIcon = isSettled
    ? isTargetDark
      ? 'moon'
      : 'sun'
    : state.fromTone === 'dark'
      ? 'moon'
      : 'sun'
  const symbolContainerOpacity = state.phase === 'enter' ? 0 : 1
  const symbolOpacity =
    state.phase === 'enter' ? 0 : state.phase === 'settle' ? 0.92 : 1
  const symbolScale =
    state.phase === 'cover' ? 1 : state.phase === 'settle' ? 0.96 : 0.98
  const symbolRotate =
    activeIcon === 'sun'
      ? state.phase === 'settle'
        ? '5deg'
        : '0deg'
      : state.phase === 'settle'
        ? '-5deg'
        : '0deg'
  const symbolTransitionDuration =
    state.phase === 'settle' ? '520ms' : state.phase === 'exit' ? '320ms' : '360ms'
  const sceneOpacity =
    state.phase === 'enter' ? 0 : state.phase === 'cover' ? 0.96 : 1
  const sceneGradientClass = isVisualDark
    ? 'bg-[linear-gradient(135deg,rgba(96,165,250,0.12),transparent_36%,rgba(2,6,23,0.22)_72%,transparent)]'
    : 'bg-[linear-gradient(135deg,rgba(251,191,36,0.22),transparent_36%,rgba(255,255,255,0.5)_70%,transparent)]'
  const visualBufferOpacity =
    state.phase === 'settle' ? (isTargetDark ? 0.34 : 0.24) : 0
  const visualBufferTranslate =
    state.phase === 'settle' ? '0%' : state.phase === 'exit' ? '42%' : '-42%'
  const visualBufferClass = isTargetDark
    ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.16)_34%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0.12)_66%,rgba(255,255,255,0)_100%)] mix-blend-screen'
    : 'bg-[linear-gradient(90deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.12)_34%,rgba(15,23,42,0.22)_50%,rgba(15,23,42,0.1)_66%,rgba(15,23,42,0)_100%)] mix-blend-multiply'

  return (
    <div
      aria-hidden="true"
      data-theme-curtain={state.phase}
      className="pointer-events-auto fixed inset-0 z-[240] overflow-hidden"
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[115svh] overflow-hidden will-change-[opacity,transform] transition-[opacity,transform]'
        )}
        style={{
          backgroundColor: TONE_BACKGROUND[visualTone],
          transform: `translate3d(${curtainTranslateX}, 0, 0)`,
          transitionDuration,
          transitionTimingFunction,
          opacity: curtainOpacity,
        }}
      >
        <div
          className="theme-curtain-scene pointer-events-none absolute inset-x-0 top-0 h-[100svh] overflow-hidden transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ opacity: sceneOpacity }}
        >
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              sceneGradientClass
            )}
          />
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-[420ms]',
              'bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.7)_0_1.1px,transparent_1.7px),radial-gradient(circle_at_74%_26%,rgba(191,219,254,0.72)_0_1px,transparent_1.8px),radial-gradient(circle_at_34%_68%,rgba(255,255,255,0.56)_0_1px,transparent_1.7px),radial-gradient(circle_at_82%_72%,rgba(186,230,253,0.64)_0_1px,transparent_1.7px)] bg-[length:18rem_18rem,22rem_22rem,20rem_20rem,26rem_26rem]'
            )}
            style={{ opacity: starOpacity }}
          />
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
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 -left-1/3 w-[166%] transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            visualBufferClass
          )}
          style={{
            opacity: visualBufferOpacity,
            transform: `translate3d(${visualBufferTranslate}, 0, 0)`,
          }}
        />
        <div
          className={cn(
            'pointer-events-none fixed inset-0 z-10 overflow-hidden transition-opacity',
            isSymbolVisible
              ? 'opacity-100 duration-[360ms]'
              : 'opacity-0 duration-200'
          )}
        >
          <div
            className="theme-curtain-symbol fixed flex h-32 w-32 items-center justify-center rounded-full sm:h-40 sm:w-40 lg:h-44 lg:w-44"
            style={{
              left: viewportCenter.x,
              top: viewportCenter.y,
              opacity: symbolContainerOpacity * symbolOpacity,
              transform: `translate(-50%, -50%) scale(${symbolScale}) rotate(${symbolRotate})`,
              transitionProperty: 'transform, opacity',
              transitionDuration: symbolTransitionDuration,
              transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div className="relative h-full w-full">
              {activeIcon === 'sun' ? (
                <Sun
                  aria-hidden="true"
                  size={176}
                  strokeWidth={1.45}
                  className="absolute inset-0 h-full w-full fill-orange-500 text-orange-500 drop-shadow-[0_24px_56px_rgba(234,88,12,0.24)] transition-opacity duration-[320ms]"
                />
              ) : null}
              {activeIcon === 'moon' ? (
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
                  className="absolute inset-0 h-full w-full overflow-visible text-slate-100 drop-shadow-[0_24px_56px_rgba(2,6,23,0.42)] transition-opacity duration-[320ms]"
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
