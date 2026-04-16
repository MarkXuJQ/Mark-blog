import { useEffect, useState } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { cn } from '../../utils/cn'

const PATH_POINTS = [0, 0.14, 0.32, 0.5, 0.7, 0.86, 1]

function interpolateKeyframes(
  value: number,
  input: readonly number[],
  output: readonly number[]
) {
  if (input.length !== output.length) {
    throw new Error('Input and output keyframes must have the same length.')
  }

  if (value <= input[0]) return output[0]
  if (value >= input[input.length - 1]) return output[output.length - 1]

  for (let index = 0; index < input.length - 1; index += 1) {
    const start = input[index]
    const end = input[index + 1]

    if (value >= start && value <= end) {
      const progress = (value - start) / (end - start)
      return output[index] + (output[index + 1] - output[index]) * progress
    }
  }

  return output[output.length - 1]
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 820 : window.innerHeight,
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return size
}

export function HomeMeteorAvatar({
  avatarSrc,
  pageProgress,
  isDarkMode,
  prefersReducedMotion,
}: {
  avatarSrc: string
  pageProgress: MotionValue<number>
  isDarkMode: boolean
  prefersReducedMotion: boolean
}) {
  const { width, height } = useViewportSize()

  const meteorX = useTransform(() => {
    const progress = pageProgress.get()
    const targetX = [
      0,
      Math.min(width * 0.24, 290),
      Math.min(width * 0.08, 120),
      -Math.min(width * 0.18, 220),
      Math.min(width * 0.18, 220),
      Math.min(width * 0.3, 360),
      Math.min(width * 0.34, 420),
    ]
    const baseX = interpolateKeyframes(progress, PATH_POINTS, targetX)
    const decay = 1 - Math.min(progress * 0.88, 0.88)
    const spiralOffset = prefersReducedMotion
      ? 0
      : Math.sin(progress * Math.PI * 7.8) * Math.min(width * 0.03, 40) * decay

    return baseX + spiralOffset
  })

  const meteorY = useTransform(() => {
    const progress = pageProgress.get()
    const targetY = [
      -height * 0.18,
      -height * 0.26,
      -height * 0.02,
      height * 0.16,
      height * 0.08,
      -height * 0.16,
      -height * 0.24,
    ]
    const baseY = interpolateKeyframes(progress, PATH_POINTS, targetY)
    const decay = 1 - Math.min(progress * 0.88, 0.88)
    const spiralOffset = prefersReducedMotion
      ? 0
      : Math.cos(progress * Math.PI * 6.4) * Math.min(height * 0.028, 28) * decay

    return baseY + spiralOffset
  })

  const meteorScale = useTransform(() => {
    const progress = pageProgress.get()
    return interpolateKeyframes(
      progress,
      PATH_POINTS,
      prefersReducedMotion
        ? [1, 0.98, 0.96, 0.96, 0.94, 0.92, 0.9]
        : [1.16, 1.02, 0.86, 0.96, 0.9, 0.8, 0.74]
    )
  })

  const meteorRotate = useTransform(() => {
    const progress = pageProgress.get()
    return interpolateKeyframes(
      progress,
      PATH_POINTS,
      prefersReducedMotion ? [0, 8, 14, 10, 6, 4, 0] : [16, 160, 310, 500, 650, 760, 820]
    )
  })

  const meteorOpacity = useTransform(() => {
    const progress = pageProgress.get()
    return interpolateKeyframes(progress, [0, 0.08, 0.9, 1], [0.92, 1, 0.96, 0.84])
  })

  const trailScale = useTransform(() => {
    const progress = pageProgress.get()
    return interpolateKeyframes(
      progress,
      PATH_POINTS,
      prefersReducedMotion
        ? [1, 1.06, 1.08, 1.03, 1.02, 1, 1]
        : [1.2, 2.1, 2.5, 1.82, 1.42, 1.06, 0.92]
    )
  })

  const trailOpacity = useTransform(() => {
    const progress = pageProgress.get()
    return interpolateKeyframes(
      progress,
      PATH_POINTS,
      prefersReducedMotion
        ? [0.24, 0.26, 0.22, 0.18, 0.16, 0.15, 0.14]
        : [0.38, 0.56, 0.48, 0.34, 0.26, 0.2, 0.18]
    )
  })

  return (
    <div aria-hidden="true" className={styles.layer}>
      <motion.div
        className={styles.meteor}
        style={{
          x: meteorX,
          y: meteorY,
          scale: meteorScale,
          rotate: meteorRotate,
          opacity: meteorOpacity,
        }}
      >
        <motion.span
          className={cn(styles.trail, isDarkMode ? styles.trailDark : styles.trailLight)}
          style={{ scaleX: trailScale, opacity: trailOpacity }}
        />
        <span className={cn(styles.halo, isDarkMode ? styles.haloDark : styles.haloLight)} />

        <div className={styles.avatarShell}>
          <span
            className={cn(styles.avatarGlow, isDarkMode ? styles.avatarGlowDark : styles.avatarGlowLight)}
          />
          <img
            src={avatarSrc}
            alt=""
            width={112}
            height={112}
            decoding="async"
            className={styles.avatar}
          />
        </div>
      </motion.div>
    </div>
  )
}

const styles = {
  layer: 'pointer-events-none fixed inset-0 z-[38] overflow-hidden',
  meteor: 'absolute left-1/2 top-1/2 will-change-transform',
  trail:
    'absolute left-[-138px] top-1/2 h-[18px] w-[146px] -translate-y-1/2 origin-right rounded-full blur-[7px]',
  trailLight:
    'bg-[linear-gradient(90deg,rgba(253,230,138,0)_0%,rgba(252,211,77,0.28)_36%,rgba(255,255,255,0.92)_100%)]',
  trailDark:
    'bg-[linear-gradient(90deg,rgba(56,189,248,0)_0%,rgba(125,211,252,0.24)_38%,rgba(255,255,255,0.88)_100%)]',
  halo: 'absolute inset-[-24px] rounded-full blur-2xl',
  haloLight:
    'bg-[radial-gradient(circle,rgba(255,247,214,0.56)_0%,rgba(255,247,214,0.12)_42%,rgba(255,247,214,0)_74%)]',
  haloDark:
    'bg-[radial-gradient(circle,rgba(125,211,252,0.28)_0%,rgba(125,211,252,0.1)_40%,rgba(15,23,42,0)_72%)]',
  avatarShell: 'relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20',
  avatarGlow: 'absolute inset-[4px] rounded-full blur-xl',
  avatarGlowLight: 'bg-amber-100/52',
  avatarGlowDark: 'bg-cyan-300/18',
  avatar:
    'relative h-full w-full rounded-full border border-white/85 object-cover shadow-[0_22px_52px_-24px_rgba(15,23,42,0.82)] ring-1 ring-black/5',
}
