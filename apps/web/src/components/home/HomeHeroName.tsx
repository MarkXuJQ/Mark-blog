import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { motion, useAnimationControls, type Transition } from 'framer-motion'
import { VerticalCutReveal } from '@/components/ui/vertical-cut-reveal'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/classNames'

const CLICK_WINDOW_MS = 800
const UNLOCK_CLICKS = 7
const UNLOCK_DELAY_MS = 260
const BURST_LIFETIME_MS = 1200

const SPARK_COLORS = ['#ff7a18', '#ff3b30', '#ffd60a', '#ff5c8a', '#ffb703']
const PULSE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const HOVER_SPRING: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 22,
  mass: 0.6,
}

interface Spark {
  id: number
  angle: number
  distance: number
  size: number
  color: string
  duration: number
}

interface ClickBurst {
  id: number
  x: number
  y: number
  isUnlock: boolean
  sparks: Spark[]
}

interface HomeHeroNameProps {
  prefersReducedMotion: boolean
  onUnlock: () => void
}

const HERO_TITLE_REVEAL_TRANSITION = {
  type: 'spring',
  stiffness: 200,
  damping: 21,
} as const

function createSparks(
  burstId: number,
  count: number,
  isUnlock: boolean
): Spark[] {
  return Array.from({ length: count }, (_, index) => {
    const angle =
      (Math.PI * 2 * index) / count +
      (isUnlock ? 0.16 : 0.48) +
      Math.random() * 0.2

    return {
      id: burstId * 100 + index,
      angle,
      distance: (isUnlock ? 46 : 30) + Math.random() * (isUnlock ? 54 : 26),
      size: (isUnlock ? 5 : 3.5) + Math.random() * (isUnlock ? 4 : 3),
      color: SPARK_COLORS[(burstId + index) % SPARK_COLORS.length],
      duration: (isUnlock ? 0.66 : 0.5) + Math.random() * 0.22,
    }
  })
}

function NameClickBurst({
  burst,
  prefersReducedMotion,
}: {
  burst: ClickBurst
  prefersReducedMotion: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      <motion.span
        className="absolute rounded-full"
        style={{
          left: burst.x,
          top: burst.y,
          width: 16,
          height: 16,
          marginLeft: -8,
          marginTop: -8,
          background:
            'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,196,120,0.85) 38%, rgba(249,115,22,0) 72%)',
        }}
        initial={
          prefersReducedMotion ? { opacity: 0.55 } : { opacity: 1, scale: 0.35 }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: burst.isUnlock ? 6 : 3.6 }
        }
        transition={{
          duration: prefersReducedMotion ? 0.25 : 0.32,
          ease: 'easeOut',
        }}
      />

      {burst.isUnlock ? (
        <motion.span
          className="absolute rounded-full"
          style={{
            left: burst.x,
            top: burst.y,
            width: 42,
            height: 42,
            marginLeft: -21,
            marginTop: -21,
            background:
              'radial-gradient(circle, rgba(251, 191, 36, 0.68) 0%, rgba(251, 146, 60, 0) 70%)',
          }}
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0.95, scale: 0.2 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: [0.9, 0] }
              : { opacity: 0, scale: 5.4 }
          }
          transition={{
            duration: prefersReducedMotion ? 0.34 : 0.72,
            ease: 'easeOut',
          }}
        />
      ) : null}

      <motion.span
        className="absolute rounded-full border-[2.5px] border-orange-400/85"
        style={{
          left: burst.x,
          top: burst.y,
          width: 26,
          height: 26,
          marginLeft: -13,
          marginTop: -13,
          boxShadow: '0 0 14px rgba(249, 115, 22, 0.55)',
        }}
        initial={
          prefersReducedMotion
            ? { opacity: 0.6 }
            : { opacity: 0.95, scale: 0.3 }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: burst.isUnlock ? 6.5 : 4.2 }
        }
        transition={{
          duration: prefersReducedMotion ? 0.28 : burst.isUnlock ? 0.7 : 0.55,
          ease: PULSE_EASE,
        }}
      />

      {burst.isUnlock ? (
        <motion.span
          className="absolute rounded-full border-2 border-amber-300/75"
          style={{
            left: burst.x,
            top: burst.y,
            width: 34,
            height: 34,
            marginLeft: -17,
            marginTop: -17,
          }}
          initial={
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0.8, scale: 0.2 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: [0.55, 0] }
              : { opacity: 0, scale: 7 }
          }
          transition={{
            delay: 0.06,
            duration: prefersReducedMotion ? 0.3 : 0.76,
            ease: PULSE_EASE,
          }}
        />
      ) : null}

      {!prefersReducedMotion
        ? burst.sparks.map((spark) => (
            <motion.span
              key={spark.id}
              className="absolute rounded-full"
              style={{
                left: burst.x,
                top: burst.y,
                width: spark.size,
                height: spark.size,
                marginLeft: -spark.size / 2,
                marginTop: -spark.size / 2,
                backgroundColor: spark.color,
                boxShadow: `0 0 9px ${spark.color}`,
                willChange: 'transform, opacity',
              }}
              initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
              animate={{
                x: Math.cos(spark.angle) * spark.distance,
                y:
                  Math.sin(spark.angle) * spark.distance -
                  (burst.isUnlock ? 14 : 5),
                scale: [0.4, 1, 0.15],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: spark.duration, ease: 'easeOut' }}
            />
          ))
        : null}
    </span>
  )
}

export function HomeHeroName({
  prefersReducedMotion,
  onUnlock,
}: HomeHeroNameProps) {
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const [clickCount, setClickCount] = useState(0)
  const [bursts, setBursts] = useState<ClickBurst[]>([])
  const containerRef = useRef<HTMLSpanElement>(null)
  const pulseControls = useAnimationControls()
  const clickCountRef = useRef(0)
  const lastClickAtRef = useRef(0)
  const burstIdRef = useRef(0)
  const isUnlockingRef = useRef(false)
  const resetTimerRef = useRef<number | null>(null)
  const unlockTimerRef = useRef<number | null>(null)
  const burstTimersRef = useRef<Set<number>>(new Set())

  const spawnBurst = useCallback(
    (x: number, y: number, isUnlock: boolean) => {
      const id = (burstIdRef.current += 1)
      const sparkCount = isUnlock ? 14 : Math.min(4 + clickCountRef.current, 9)
      const sparks = prefersReducedMotion
        ? []
        : createSparks(id, sparkCount, isUnlock)

      setBursts((prev) => [...prev.slice(-2), { id, x, y, isUnlock, sparks }])

      const timer = window.setTimeout(() => {
        burstTimersRef.current.delete(timer)
        setBursts((prev) => prev.filter((burst) => burst.id !== id))
      }, BURST_LIFETIME_MS)

      burstTimersRef.current.add(timer)
    },
    [prefersReducedMotion]
  )

  const playPulse = useCallback(
    (count: number, isUnlock: boolean) => {
      if (prefersReducedMotion) {
        void pulseControls.start({
          opacity: [1, 0.45, 1],
          transition: { duration: 0.3, ease: 'easeOut' },
        })
        return
      }

      const strength = isUnlock ? 1.4 : 1 + count * 0.04

      void pulseControls.start({
        scale: [null, 0.9, 1.06 * strength, 1],
        y: [null, 3, -6 * strength, 0],
        rotate: [null, -2.5, 2 * strength, 0],
        transition: {
          duration: isUnlock ? 0.58 : 0.42,
          times: [0, 0.22, 0.62, 1],
          ease: PULSE_EASE,
        },
      })
    },
    [prefersReducedMotion, pulseControls]
  )

  const activate = useCallback(
    (clientX?: number, clientY?: number) => {
      if (isUnlockingRef.current) return

      const now = performance.now()

      if (now - lastClickAtRef.current > CLICK_WINDOW_MS) {
        clickCountRef.current = 0
      }

      lastClickAtRef.current = now
      clickCountRef.current += 1

      const count = clickCountRef.current
      const isUnlock = count >= UNLOCK_CLICKS

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }

      setClickCount(count)

      const rect = containerRef.current?.getBoundingClientRect()
      const x = rect
        ? clientX === undefined
          ? rect.width / 2
          : clientX - rect.left
        : 0
      const y = rect
        ? clientY === undefined
          ? rect.height / 2
          : clientY - rect.top
        : 0

      spawnBurst(x, y, isUnlock)
      playPulse(count, isUnlock)

      if (isUnlock) {
        isUnlockingRef.current = true
        unlockTimerRef.current = window.setTimeout(
          () => {
            unlockTimerRef.current = null
            isUnlockingRef.current = false
            clickCountRef.current = 0
            lastClickAtRef.current = 0
            setClickCount(0)
            onUnlock()
          },
          prefersReducedMotion ? 80 : UNLOCK_DELAY_MS
        )
        return
      }

      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null
        clickCountRef.current = 0
        lastClickAtRef.current = 0
        setClickCount(0)
      }, CLICK_WINDOW_MS)
    },
    [onUnlock, playPulse, prefersReducedMotion, spawnBurst]
  )

  const handleClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    // Keyboard/screen-reader synthesized clicks report 0,0 as coordinates.
    const hasPointerPosition = event.detail !== 0
    activate(
      hasPointerPosition ? event.clientX : undefined,
      hasPointerPosition ? event.clientY : undefined
    )
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (event.repeat) return
    activate()
  }

  useEffect(() => {
    const burstTimers = burstTimersRef.current
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current)
        unlockTimerRef.current = null
      }
      burstTimers.forEach((timer) => window.clearTimeout(timer))
      burstTimers.clear()
    }
  }, [])

  const charge = Math.min(clickCount / UNLOCK_CLICKS, 1)
  const glowRadius = 4 + charge * 16
  const glowAlpha = charge === 0 ? 0 : 0.16 + charge * 0.3
  const hoverMotion =
    canHover && !prefersReducedMotion
      ? { y: -4, scale: 1.05, rotate: 3 }
      : undefined
  const tapMotion = prefersReducedMotion
    ? undefined
    : { y: -1, scale: 0.94, rotate: 1.5 }

  return (
    <motion.span
      ref={containerRef}
      role="link"
      tabIndex={0}
      className={styles.nameButton}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      whileHover={hoverMotion}
      whileTap={tapMotion}
      transition={HOVER_SPRING}
    >
      <motion.span
        className={styles.namePulse}
        animate={pulseControls}
        style={{
          filter: `drop-shadow(0 0 ${glowRadius}px rgba(249, 115, 22, ${glowAlpha}))`,
          transition: 'filter 320ms ease-out',
        }}
      >
        <VerticalCutReveal
          splitBy="characters"
          staggerDuration={prefersReducedMotion ? 0 : 0.018}
          staggerFrom="center"
          transition={{
            ...HERO_TITLE_REVEAL_TRANSITION,
            delay: prefersReducedMotion ? 0 : 0.22,
          }}
          containerClassName="inline-flex"
          elementLevelClassName={styles.highlightGlyph}
        >
          Mark
        </VerticalCutReveal>
      </motion.span>

      {bursts.map((burst) => (
        <NameClickBurst
          key={burst.id}
          burst={burst}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
    </motion.span>
  )
}

const styles = {
  nameButton: cn(
    'relative inline-flex cursor-pointer touch-manipulation select-none items-baseline',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500/80'
  ),
  namePulse: 'inline-flex items-baseline will-change-transform',
  highlightGlyph:
    'bg-gradient-to-r from-orange-500 via-orange-500 to-red-500 bg-clip-text text-transparent',
}
