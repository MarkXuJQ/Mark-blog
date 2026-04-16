import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

interface HomeRadarSectionProps {
  avatarSrc: string
}

interface RadarNode {
  id: string
  href: string
  left: string
  top: string
  label: {
    zh: string
    en: string
  }
  color: string
  glow: string
}

const RADAR_NODES: RadarNode[] = [
  {
    id: 'awwwards',
    href: 'https://www.awwwards.com/',
    left: '79%',
    top: '29%',
    label: { zh: 'Awwwards', en: 'Awwwards' },
    color: '#ff8a5b',
    glow: 'rgba(255,138,91,0.42)',
  },
  {
    id: 'arena',
    href: 'https://www.are.na/',
    left: '23%',
    top: '33%',
    label: { zh: 'Are.na', en: 'Are.na' },
    color: '#7c9cff',
    glow: 'rgba(124,156,255,0.4)',
  },
  {
    id: 'radio-garden',
    href: 'https://radio.garden/',
    left: '17%',
    top: '66%',
    label: { zh: 'Radio Garden', en: 'Radio Garden' },
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.38)',
  },
  {
    id: 'figma-community',
    href: 'https://www.figma.com/community',
    left: '50%',
    top: '12%',
    label: { zh: 'Figma Community', en: 'Figma Community' },
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.36)',
  },
  {
    id: 'artvee',
    href: 'https://artvee.com/',
    left: '67%',
    top: '74%',
    label: { zh: 'Artvee', en: 'Artvee' },
    color: '#f97316',
    glow: 'rgba(249,115,22,0.36)',
  },
  {
    id: 'behance',
    href: 'https://www.behance.net/',
    left: '85%',
    top: '57%',
    label: { zh: 'Behance', en: 'Behance' },
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.36)',
  },
]

const RING_INSETS = ['8%', '18%', '30%', '42%', '54%']
const RADAR_ENTRY_SCROLL_FACTOR = 0.08
const RADAR_ENTRY_SCROLL_MIN = 52
const RADAR_ENTRY_SCROLL_MAX = 80
const RADAR_HOLD_SCROLL_FACTOR = 0.22
const RADAR_HOLD_SCROLL_MIN = 140
const RADAR_HOLD_SCROLL_MAX = 190
const RADAR_EXIT_SCROLL_FACTOR = 0.1
const RADAR_EXIT_SCROLL_MIN = 64
const RADAR_EXIT_SCROLL_MAX = 92
const RADAR_CENTER_Y = '76.666%'

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function getBoundedScrollDistance(
  viewportHeight: number,
  factor: number,
  min: number,
  max: number
) {
  if (viewportHeight <= 0) return 0
  return Math.min(max, Math.max(min, viewportHeight * factor))
}

export function HomeRadarSection({ avatarSrc }: HomeRadarSectionProps) {
  const { i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const isZh = i18n.language?.startsWith('zh')
  const sectionRef = useRef<HTMLElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) {
      setViewportHeight(0)
      return
    }

    const updateViewportHeight = () => {
      const nextHeight = window.innerHeight
      setViewportHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
    }
  }, [prefersReducedMotion])

  const entryScrollDistance = getBoundedScrollDistance(
    viewportHeight,
    RADAR_ENTRY_SCROLL_FACTOR,
    RADAR_ENTRY_SCROLL_MIN,
    RADAR_ENTRY_SCROLL_MAX
  )
  const holdScrollDistance = getBoundedScrollDistance(
    viewportHeight,
    RADAR_HOLD_SCROLL_FACTOR,
    RADAR_HOLD_SCROLL_MIN,
    RADAR_HOLD_SCROLL_MAX
  )
  const exitScrollDistance = getBoundedScrollDistance(
    viewportHeight,
    RADAR_EXIT_SCROLL_FACTOR,
    RADAR_EXIT_SCROLL_MIN,
    RADAR_EXIT_SCROLL_MAX
  )
  const totalSceneScrollDistance =
    entryScrollDistance + holdScrollDistance + exitScrollDistance
  const sceneEntryEnd =
    totalSceneScrollDistance > 0
      ? entryScrollDistance / totalSceneScrollDistance
      : 0.2
  const sceneHoldEnd =
    totalSceneScrollDistance > 0
      ? (entryScrollDistance + holdScrollDistance) / totalSceneScrollDistance
      : 0.78
  const sceneMinHeight =
    totalSceneScrollDistance > 0
      ? `calc(100svh + ${Math.round(totalSceneScrollDistance)}px)`
      : '100svh'

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const progress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 260 : 120,
    damping: prefersReducedMotion ? 34 : 22,
    mass: 0.42,
  })

  const fieldScale = useTransform(progress, (value) => {
    if (prefersReducedMotion) return 1

    if (value <= sceneEntryEnd) {
      return 0.96 + clamp01(value / sceneEntryEnd) * 0.04
    }

    if (value <= sceneHoldEnd) return 1

    const exitProgress = clamp01(
      (value - sceneHoldEnd) / (1 - sceneHoldEnd)
    )

    return 1 + exitProgress * 0.03
  })
  const avatarScale = useTransform(progress, (value) => {
    if (prefersReducedMotion) return 1

    if (value <= sceneEntryEnd) {
      return 0.96 + clamp01(value / sceneEntryEnd) * 0.04
    }

    if (value <= sceneHoldEnd) return 1

    const exitProgress = clamp01(
      (value - sceneHoldEnd) / (1 - sceneHoldEnd)
    )

    return 1 + exitProgress * 0.04
  })
  const sceneOpacity = useTransform(progress, (value) => {
    if (prefersReducedMotion) return 1

    if (value <= sceneEntryEnd) {
      return 0.84 + clamp01(value / sceneEntryEnd) * 0.16
    }

    if (value <= sceneHoldEnd) return 1

    return 1
  })

  return (
    <section
      ref={sectionRef}
      aria-label={isZh ? '主页雷达区' : 'Homepage radar'}
      className="relative z-[30] isolate overflow-x-hidden overflow-y-visible bg-transparent"
      style={
        prefersReducedMotion
          ? { minHeight: '100svh' }
          : {
              minHeight: sceneMinHeight,
            }
      }
    >
      <motion.div
        className="sticky top-0 h-[100svh] overflow-x-hidden overflow-y-visible"
        style={{ opacity: sceneOpacity }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: 'var(--page-background)' }}
        />
        <div aria-hidden="true" className={styles.softGlowLeft} />
        <div aria-hidden="true" className={styles.softGlowRight} />
        <div aria-hidden="true" className={styles.gridBackdrop} />
        <div aria-hidden="true" className={styles.crosshairVertical} />
        <div
          aria-hidden="true"
          className={styles.crosshairHorizontal}
          style={{ top: RADAR_CENTER_Y }}
        />

        <div className="relative z-10 h-full w-full overflow-x-hidden overflow-y-visible">
          <div className={styles.radarStage}>
            <div aria-hidden="true" className={styles.radarSweepClip}>
              <div className={styles.radarSweepStage}>
                <motion.div
                  className={styles.scanBeam}
                  style={{
                    top: RADAR_CENTER_Y,
                    background:
                      'conic-gradient(from 0deg, rgba(6,182,212,0) 0deg, rgba(6,182,212,0) 286deg, rgba(6,182,212,0.045) 304deg, rgba(6,182,212,0.15) 326deg, rgba(6,182,212,0.42) 336deg, rgba(6,182,212,0.08) 347deg, rgba(6,182,212,0) 360deg)',
                  }}
                  animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 8.6, ease: 'linear', repeat: Infinity }
                  }
                />

                <motion.div
                  className={styles.scanLine}
                  style={{ top: RADAR_CENTER_Y }}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { rotate: [0, 360], opacity: [0.26, 0.54, 0.26] }
                  }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 5.6, ease: 'linear', repeat: Infinity }
                  }
                />
              </div>
            </div>

            <motion.div
              style={{ top: RADAR_CENTER_Y, scale: fieldScale }}
              className={styles.radarField}
            >
              {RING_INSETS.map((inset, index) => (
                <div
                  key={inset}
                  aria-hidden="true"
                  className={cn(
                    styles.ring,
                    index === RING_INSETS.length - 1 && styles.outerRing
                  )}
                  style={{ inset }}
                />
              ))}

              <motion.div
                style={{ scale: avatarScale }}
                className={styles.avatarWrap}
              >
                <div aria-hidden="true" className={styles.avatarGlow} />
                <div className={styles.avatarCore}>
                  <img
                    src={avatarSrc}
                    alt={isZh ? 'Mark 的头像' : 'Portrait of Mark'}
                    className={styles.avatarImage}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </motion.div>

              {RADAR_NODES.map((node) => (
                <motion.a
                  key={node.id}
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={isZh ? node.label.zh : node.label.en}
                  title={isZh ? node.label.zh : node.label.en}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.12 }}
                  whileTap={{ scale: 0.96 }}
                  className={styles.signalLink}
                  style={{ left: node.left, top: node.top }}
                >
                  <motion.span
                    aria-hidden="true"
                    className={styles.signalPulse}
                    style={{ background: node.glow }}
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : { scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }
                    }
                    transition={
                      prefersReducedMotion
                        ? undefined
                        : { duration: 2.3, ease: 'easeOut', repeat: Infinity }
                    }
                  />

                  <span
                    aria-hidden="true"
                    className={styles.signalDot}
                    style={{
                      background: node.color,
                      boxShadow: `0 0 0 3px rgba(255,255,255,0.34), 0 0 18px ${node.glow}`,
                    }}
                  />
                </motion.a>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

const styles = {
  softGlowLeft:
    'pointer-events-none absolute left-[-12rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.16)_0%,rgba(6,182,212,0.05)_34%,rgba(6,182,212,0)_74%)] blur-3xl',
  softGlowRight:
    'pointer-events-none absolute bottom-[3rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,rgba(249,115,22,0.04)_34%,rgba(249,115,22,0)_74%)] blur-3xl',
  gridBackdrop:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.07)_0px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_0px,transparent_1px)] [background-size:24px_24px] opacity-40',
  crosshairVertical:
    'pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.22)_18%,rgba(148,163,184,0.22)_82%,rgba(148,163,184,0)_100%)]',
  crosshairHorizontal:
    'pointer-events-none absolute left-0 h-px w-full -translate-y-1/2 bg-[linear-gradient(90deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.22)_18%,rgba(148,163,184,0.22)_82%,rgba(148,163,184,0)_100%)]',
  radarStage: 'absolute inset-0',
  radarSweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
  radarSweepStage: 'pointer-events-none absolute inset-0',
  radarField:
    'absolute left-1/2 h-[min(94vw,94vh)] w-[min(94vw,94vh)] max-h-[72rem] max-w-[72rem] -translate-x-1/2 -translate-y-1/2',
  ring: 'pointer-events-none absolute rounded-full border border-slate-300/62',
  outerRing:
    'border-dashed border-slate-300/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.58)]',
  scanBeam:
    'pointer-events-none absolute left-1/2 top-1/2 h-[170vmax] w-[170vmax] -translate-x-1/2 -translate-y-1/2',
  scanLine:
    'pointer-events-none absolute left-1/2 top-1/2 h-px w-[170vmax] -translate-y-1/2 origin-left bg-[linear-gradient(90deg,rgba(6,182,212,0.9)_0%,rgba(6,182,212,0.32)_20%,rgba(6,182,212,0.08)_48%,rgba(6,182,212,0)_100%)] shadow-[0_0_14px_rgba(6,182,212,0.3)]',
  avatarWrap:
    'absolute left-1/2 top-1/2 z-20 flex h-[20%] w-[20%] min-h-[6.5rem] min-w-[6.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-transparent backdrop-blur-2xl',
  avatarGlow:
    'pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.06)_34%,rgba(56,189,248,0)_72%)] blur-2xl',
  avatarCore:
    'relative h-[72%] w-[72%] overflow-hidden rounded-full border border-white/60 bg-transparent shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)]',
  avatarImage: 'h-full w-full object-cover',
  signalLink:
    'absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center focus:outline-none',
  signalPulse: 'absolute h-14 w-14 rounded-full blur-[14px]',
  signalDot:
    'relative h-4 w-4 rounded-full border border-white/78 transition-transform duration-200 sm:h-[1.125rem] sm:w-[1.125rem]',
}
