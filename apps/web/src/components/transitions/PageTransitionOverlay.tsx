import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import pixelFontUrl from '../../assets/pixel/Uranus_Pixel_11Px.ttf'

const SWEEP_DURATION = 0.82
const EASTER_LINES = [
  {
    text: 'BLOG · LIFE · MOVIES · GAMES',
    top: 'calc(28% - 55px)',
    tilt: -24,
    direction: 1,
    duration: 24,
  },
  {
    text: 'EASTER EGG UNLOCKED',
    top: '28%',
    tilt: -24,
    direction: 1,
    duration: 22,
  },
  {
    text: 'HIDDEN ROUTE ACTIVATED',
    top: '66%',
    tilt: -24,
    direction: -1,
    duration: 26,
  },
  {
    text: 'BLOG · LIFE · MOVIES · GAMES',
    top: 'calc(66% + 55px)',
    tilt: -24,
    direction: -1,
    duration: 24,
  },
] as const

export function requestPageTransition(to: string) {
  window.dispatchEvent(new CustomEvent('app:page-transition', { detail: { to } }))
}

export function PageTransitionOverlay({
  onActiveChange,
}: {
  onActiveChange?: (active: boolean) => void
}) {
  const navigate = useNavigate()
  const [pausedLineIndex, setPausedLineIndex] = useState<number | null>(null)
  const [pageTransition, setPageTransition] = useState<{
    phase: 'idle' | 'cover' | 'hold' | 'reveal'
    to: string | null
  }>({ phase: 'idle', to: null })
  const hasNavigatedRef = useRef(false)
  const holdStartedAtRef = useRef(0)

  useEffect(() => {
    onActiveChange?.(pageTransition.phase !== 'idle')
  }, [onActiveChange, pageTransition.phase])

  useEffect(() => {
    const onPageTransition = (event: Event) => {
      const e = event as CustomEvent<{ to?: string }>
      const to = e.detail?.to
      if (!to) return
      setPageTransition((prev) => {
        if (prev.phase !== 'idle') return prev
        hasNavigatedRef.current = false
        return { phase: 'cover', to }
      })
    }

    window.addEventListener(
      'app:page-transition',
      onPageTransition as EventListener
    )
    return () =>
      window.removeEventListener(
        'app:page-transition',
        onPageTransition as EventListener
      )
  }, [])

  const isActive = pageTransition.phase !== 'idle'
  const isWaitingClick = pageTransition.phase === 'hold'

  const dismissOverlay = () => {
    if (pageTransition.phase !== 'hold') return
    if (Date.now() - holdStartedAtRef.current < 140) return
    setPageTransition((prev) =>
      prev.phase === 'hold' ? { ...prev, phase: 'reveal' } : prev
    )
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[2000] pointer-events-auto"
          onClick={dismissOverlay}
          onKeyDown={(event) => {
            if (
              (event.key === 'Enter' ||
                event.key === ' ' ||
                event.key === 'Escape') &&
              pageTransition.phase === 'hold'
            ) {
              event.preventDefault()
              dismissOverlay()
            }
          }}
          role={isWaitingClick ? 'button' : undefined}
          tabIndex={isWaitingClick ? 0 : -1}
          aria-label={isWaitingClick ? 'Click to continue transition' : undefined}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <style>{`
            @font-face {
              font-family: 'Uranus Pixel';
              src: url('${pixelFontUrl}') format('truetype');
              font-display: swap;
            }
            @keyframes easter-scroll-forward {
              from { transform: translateX(-50%); }
              to { transform: translateX(0%); }
            }
            @keyframes easter-scroll-backward {
              from { transform: translateX(0%); }
              to { transform: translateX(-50%); }
            }
          `}</style>

          <motion.div
            className="absolute -inset-px bg-gradient-to-br from-yellow-300 via-amber-300 to-yellow-200 will-change-transform"
            initial={{ scaleX: 0 }}
            animate={{
              scaleX:
                pageTransition.phase === 'cover' || pageTransition.phase === 'hold'
                  ? 1
                  : 0,
            }}
            style={{
              transformOrigin:
                pageTransition.phase === 'cover' || pageTransition.phase === 'hold'
                  ? 'left center'
                  : 'right center',
            }}
            exit={{ scaleX: 0 }}
            transition={{ duration: SWEEP_DURATION, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              if (pageTransition.phase === 'cover' && !hasNavigatedRef.current) {
                hasNavigatedRef.current = true
                if (pageTransition.to) navigate(pageTransition.to)
                holdStartedAtRef.current = Date.now()
                setPageTransition((prev) =>
                  prev.phase === 'cover' ? { ...prev, phase: 'hold' } : prev
                )
                return
              }

              if (pageTransition.phase === 'reveal') {
                setPageTransition({ phase: 'idle', to: null })
                hasNavigatedRef.current = false
                holdStartedAtRef.current = 0
              }
            }}
          />

          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            {EASTER_LINES.map((line, index) => (
              <div
                key={`${line.text}-${index}`}
                className="pointer-events-auto absolute left-1/2 w-[230vw] -translate-x-1/2 overflow-hidden"
                style={{
                  top: line.top,
                  rotate: `${line.tilt}deg`,
                }}
                onMouseEnter={() => setPausedLineIndex(index)}
                onMouseLeave={() =>
                  setPausedLineIndex((prev) => (prev === index ? null : prev))
                }
              >
                <div
                  className="whitespace-nowrap text-[clamp(30px,4.2vw,56px)] font-black uppercase leading-none tracking-[0.26em] text-black/82 drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]"
                  style={{
                    fontFamily:
                      "'Uranus Pixel', 'MiSans', Inter, system-ui, sans-serif",
                    animationName:
                      line.direction > 0
                        ? 'easter-scroll-forward'
                        : 'easter-scroll-backward',
                    animationDuration: `${line.duration}s`,
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite',
                    animationDirection: 'normal',
                    animationPlayState:
                      pausedLineIndex === index ? 'paused' : 'running',
                  }}
                >
                  {`${line.text}  •  `.repeat(14)}
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {isWaitingClick && (
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-10 z-[3] flex justify-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <motion.div
                  className="rounded-full border border-black/35 bg-black/18 px-4 py-2 text-sm font-semibold tracking-wide text-black"
                  animate={{ opacity: [0.88, 1, 0.88] }}
                  transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
                >
                  点击继续 · Click to continue
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="relative"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.86, rotate: 192 }}
              animate={{
                opacity:
                  pageTransition.phase === 'cover' || pageTransition.phase === 'hold'
                    ? 1
                    : 0,
                scale:
                  pageTransition.phase === 'cover' || pageTransition.phase === 'hold'
                    ? 1
                    : 0.86,
                rotate: 202,
              }}
              exit={{ opacity: 0, scale: 0.86 }}
              transition={{
                duration: pageTransition.phase === 'cover' ? 0.46 : 0.26,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="absolute -inset-10 rounded-full bg-white/35 blur-3xl" />
              <svg
                width="152"
                height="196"
                viewBox="0 0 152 196"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative drop-shadow-[0_18px_28px_rgba(0,0,0,0.22)]"
              >
                <defs>
                  <linearGradient
                    id="eggBase"
                    x1="14"
                    y1="18"
                    x2="142"
                    y2="182"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#93C5FD" />
                    <stop offset="0.36" stopColor="#A7F3D0" />
                    <stop offset="0.72" stopColor="#FDE68A" />
                    <stop offset="1" stopColor="#FCA5A5" />
                  </linearGradient>
                  <linearGradient
                    id="eggHighlight"
                    x1="52"
                    y1="28"
                    x2="92"
                    y2="96"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="white" stopOpacity="0.95" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                  <clipPath id="eggClip">
                    <path d="M76 10c35 0 58 34 58 78 0 54-28 98-58 98S18 142 18 88C18 44 41 10 76 10Z" />
                  </clipPath>
                </defs>

                <g clipPath="url(#eggClip)">
                  <path
                    d="M76 10c35 0 58 34 58 78 0 54-28 98-58 98S18 142 18 88C18 44 41 10 76 10Z"
                    fill="url(#eggBase)"
                  />

                  <path
                    d="M-8 92C20 70 44 64 72 72c26 8 45 2 70-14 14-9 22-12 34-12v22c-12 0-20 3-33 11-27 16-52 23-78 14-24-8-46-3-74 19Z"
                    fill="#7C3AED"
                    opacity="0.75"
                  />
                  <path
                    d="M-10 124c28-18 52-24 80-16 26 8 46 3 72-11 14-8 22-11 34-11v22c-12 0-20 3-33 10-28 16-53 22-79 14-24-7-46-2-74 19Z"
                    fill="#EC4899"
                    opacity="0.55"
                  />
                  <path
                    d="M-12 152c26-16 50-22 78-14 25 8 46 3 72-11 14-8 22-11 34-11v22c-12 0-20 3-33 10-28 16-53 22-79 14-24-7-46-2-72 18Z"
                    fill="#10B981"
                    opacity="0.55"
                  />

                  <path
                    d="M60 34c-20 12-30 38-26 62 4 26 18 44 34 52 18 10 36 4 50-10 16-16 26-42 22-70-3-22-16-40-36-46-16-5-30-1-44 12Z"
                    fill="url(#eggHighlight)"
                  />
                </g>

                <path
                  d="M76 10c35 0 58 34 58 78 0 54-28 98-58 98S18 142 18 88C18 44 41 10 76 10Z"
                  stroke="rgba(0,0,0,0.16)"
                  strokeWidth="2"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
