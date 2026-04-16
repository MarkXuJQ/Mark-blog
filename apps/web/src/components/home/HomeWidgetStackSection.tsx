import { useEffect, useRef, useState } from 'react'
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { TravelFootprintPlugin } from './TravelFootprintPlugin'

interface HomeWidgetStackSectionProps {
  sectionScale?: MotionValue<number>
  sectionY?: MotionValue<number>
  sectionOpacity?: MotionValue<number>
  sectionFilter?: MotionValue<string>
  sectionPointerEvents?: MotionValue<string>
}

// Backdrop cover timing.
// Set to 0 to keep the black background pinned immediately once this scene starts.
// Increase it if you want the background itself to "climb up" more slowly.
const BACKDROP_REVEAL_END = 0.3

// Content fade-in timing.
// `CONTENT_REVEAL_START`: when the third-screen content starts appearing.
// `CONTENT_REVEAL_MID`: when the content reaches the softer half-visible stage.
// `CONTENT_REVEAL_END`: when the content finishes fading in.
// Keep `CONTENT_REVEAL_START < CONTENT_REVEAL_MID < CONTENT_REVEAL_END`.
const CONTENT_REVEAL_START = 0.04
const CONTENT_REVEAL_MID = 0.2
const CONTENT_REVEAL_END = 0.3

// Content fade-out timing.
// Move these earlier if you want the whole third-screen content to leave sooner.
// Keep `CONTENT_REVEAL_END <= CONTENT_FADE_OUT_START < CONTENT_FADE_OUT_END`.
// If `CONTENT_FADE_OUT_START` is earlier than `CONTENT_REVEAL_END`, the fade-out
// branch will be visually masked by the reveal branch above.
const CONTENT_FADE_OUT_START = 1.0
const CONTENT_FADE_OUT_END = 1.0

// Child widget/card reveal timing inside the third screen.
// Earlier start + longer duration = calmer stagger.
// Later start + shorter duration = snappier card entrance.
const WIDGET_REVEAL_START = 0.12
const WIDGET_REVEAL_DURATION = 0.64

// Overall third-screen sticky scene sizing.
// Increase `WIDGET_SCENE_HEIGHT` for a longer pinned chapter.
// Make `WIDGET_SCENE_OVERLAP` more negative if you want this screen to start
// covering the rail earlier.
const WIDGET_SCENE_HEIGHT = '320svh'
const WIDGET_SCENE_OVERLAP = '-160svh'

// In-screen content travel window.
// `CONTENT_SCROLL_START`: when the internal content starts moving upward.
// `CONTENT_SCROLL_END`: when the internal content finishes its in-screen travel.
// Wider gap = slower in-screen scroll. Narrower gap = faster in-screen scroll.
const CONTENT_SCROLL_START = 0.16
const CONTENT_SCROLL_END = 0.9

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export function HomeWidgetStackSection({
  sectionScale,
  sectionY,
  sectionOpacity,
  sectionFilter,
  sectionPointerEvents,
}: HomeWidgetStackSectionProps) {
  const { i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const isZh = i18n.language?.startsWith('zh')
  const sectionRef = useRef<HTMLElement | null>(null)
  const contentViewportRef = useRef<HTMLDivElement | null>(null)
  const contentTrackRef = useRef<HTMLDivElement | null>(null)
  const [contentScrollDistance, setContentScrollDistance] = useState(0)
  const [sceneExtraScroll, setSceneExtraScroll] = useState(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const sceneProgress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 260 : 110,
    damping: prefersReducedMotion ? 34 : 22,
    mass: 0.42,
  })

  const backdropProgress = useTransform(sceneProgress, (value) =>
    prefersReducedMotion || BACKDROP_REVEAL_END <= 0
      ? 1
      : clamp01(value / BACKDROP_REVEAL_END)
  )
  const widgetRevealProgress = useTransform(sceneProgress, (value) =>
    prefersReducedMotion
      ? 1
      : clamp01((value - WIDGET_REVEAL_START) / WIDGET_REVEAL_DURATION)
  )

  const backdropY = useTransform(
    backdropProgress,
    [0, 0.68, 0.88, 1],
    ['104%', '20%', '-0.8%', '0%']
  )
  const backdropScale = useTransform(
    backdropProgress,
    [0, 0.76, 1],
    [1.014, 1.006, 1]
  )
  const backdropShadow = useTransform(
    backdropProgress,
    [0, 0.64, 1],
    [
      '0 0 0 rgba(2,6,23,0)',
      '0 -12px 28px rgba(2,6,23,0.12)',
      '0 0 0 rgba(2,6,23,0)',
    ]
  )
  const contentScrollY = useTransform(sceneProgress, (value) => {
    if (prefersReducedMotion || contentScrollDistance <= 0) return 0

    const raw = clamp01(
      (value - CONTENT_SCROLL_START) / (CONTENT_SCROLL_END - CONTENT_SCROLL_START)
    )

    return -easeInOutCubic(raw) * contentScrollDistance
  })
  const contentOpacity = useTransform(sceneProgress, (value) => {
    if (prefersReducedMotion) return 1
    if (value <= CONTENT_REVEAL_START) return 0
    if (value <= CONTENT_REVEAL_MID) {
      return (
        ((value - CONTENT_REVEAL_START) /
          (CONTENT_REVEAL_MID - CONTENT_REVEAL_START)) *
        0.68
      )
    }
    if (value <= CONTENT_REVEAL_END) {
      return (
        0.68 +
        ((value - CONTENT_REVEAL_MID) /
          (CONTENT_REVEAL_END - CONTENT_REVEAL_MID)) *
          0.32
      )
    }
    if (value <= CONTENT_FADE_OUT_START) return 1
    if (value <= CONTENT_FADE_OUT_END) {
      return (
        1 -
        (value - CONTENT_FADE_OUT_START) /
          (CONTENT_FADE_OUT_END - CONTENT_FADE_OUT_START)
      )
    }
    return 0
  })
  const contentY = useTransform(sceneProgress, (value) => {
    if (prefersReducedMotion) return 0
    if (value <= CONTENT_REVEAL_START) return 64
    if (value <= CONTENT_REVEAL_END) {
      return (
        64 +
        ((0 - 64) * (value - CONTENT_REVEAL_START)) /
          (CONTENT_REVEAL_END - CONTENT_REVEAL_START)
      )
    }
    return 0
  })
  const contentScale = useTransform(sceneProgress, (value) => {
    if (prefersReducedMotion) return 1
    if (value <= CONTENT_REVEAL_START) return 0.978
    if (value <= CONTENT_REVEAL_END) {
      return (
        0.978 +
        ((1 - 0.978) * (value - CONTENT_REVEAL_START)) /
          (CONTENT_REVEAL_END - CONTENT_REVEAL_START)
      )
    }
    return 1
  })

  useEffect(() => {
    if (prefersReducedMotion) {
      setContentScrollDistance(0)
      setSceneExtraScroll(0)
      return
    }

    const viewportNode = contentViewportRef.current
    const trackNode = contentTrackRef.current
    if (!viewportNode || !trackNode) return

    let frameId = 0

    const updateMeasurements = () => {
      const viewportHeight = viewportNode.clientHeight
      const trackHeight = trackNode.scrollHeight
      const nextScrollDistance = Math.max(0, trackHeight - viewportHeight)
      const nextSceneExtraScroll =
        nextScrollDistance + Math.round(viewportHeight * 0.42)

      setContentScrollDistance((current) =>
        current === nextScrollDistance ? current : nextScrollDistance
      )
      setSceneExtraScroll((current) =>
        current === nextSceneExtraScroll ? current : nextSceneExtraScroll
      )
    }

    const scheduleMeasurement = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(updateMeasurements)
    }

    updateMeasurements()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', scheduleMeasurement)
      return () => {
        cancelAnimationFrame(frameId)
        window.removeEventListener('resize', scheduleMeasurement)
      }
    }

    const observer = new ResizeObserver(scheduleMeasurement)
    observer.observe(viewportNode)
    observer.observe(trackNode)
    window.addEventListener('resize', scheduleMeasurement)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasurement)
    }
  }, [prefersReducedMotion])

  return (
    <section
      ref={sectionRef}
      aria-label={isZh ? '主页小组件堆叠区' : 'Homepage widget stack'}
      className="relative z-20 isolate"
      style={
        prefersReducedMotion
          ? { minHeight: '100svh' }
          : {
              minHeight: `max(${WIDGET_SCENE_HEIGHT}, calc(100svh + ${sceneExtraScroll}px))`,
              marginTop: WIDGET_SCENE_OVERLAP,
            }
      }
    >
      <motion.div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div
          className="absolute inset-[-14px] z-0 overflow-hidden bg-[linear-gradient(180deg,#050913_0%,#060c17_24%,#07101c_56%,#091522_100%)]"
          style={{
            y: backdropY,
            scale: backdropScale,
            boxShadow: backdropShadow,
          }}
        >
          <div aria-hidden="true" className={styles.leftGlow} />
          <div aria-hidden="true" className={styles.rightGlow} />
          <div aria-hidden="true" className={styles.gridField} />
        </motion.div>

        <motion.div
          className="relative z-10 h-full"
          style={{
            scale: sectionScale,
            y: sectionY,
            opacity: sectionOpacity,
            filter: sectionFilter,
            pointerEvents: sectionPointerEvents,
          }}
        >
          <div ref={contentViewportRef} className={styles.contentViewport}>
            <motion.div
              ref={contentTrackRef}
              className={styles.contentTrack}
              style={{ y: contentScrollY }}
            >
              <motion.div
                className={styles.contentViewportInner}
                style={{
                  opacity: contentOpacity,
                  y: contentY,
                  scale: contentScale,
                }}
              >
                <div className="relative w-full">
                  <div aria-hidden="true" className={styles.stageHalo} />
                  <div aria-hidden="true" className={styles.stageRing} />
                  <div aria-hidden="true" className={styles.stageRingSecondary} />

                  <div className={styles.pluginWrap}>
                    <TravelFootprintPlugin revealProgress={widgetRevealProgress} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

const styles = {
  leftGlow:
    'pointer-events-none absolute left-[-10rem] top-[8rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl',
  rightGlow:
    'pointer-events-none absolute bottom-[4rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.14)_0%,rgba(251,191,36,0.04)_30%,rgba(251,191,36,0)_74%)] blur-3xl',
  gridField:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_0px,transparent_1px)] [background-size:22px_22px] opacity-30',
  stageHalo:
    'pointer-events-none absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl',
  stageRing:
    'pointer-events-none absolute left-1/2 top-1/2 h-[min(88vw,48rem)] w-[min(88vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/7',
  stageRingSecondary:
    'pointer-events-none absolute left-1/2 top-1/2 h-[min(68vw,36rem)] w-[min(68vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5',
  contentViewport:
    'mx-auto h-full w-full max-w-[96rem] overflow-hidden px-4 sm:px-6 lg:px-8',
  contentTrack:
    'relative min-h-full pt-[14svh] pb-[20svh] sm:pt-[16svh] sm:pb-[22svh] lg:pt-[18svh] lg:pb-[24svh] will-change-transform',
  contentViewportInner: 'relative',
  pluginWrap: 'relative z-10',
}
