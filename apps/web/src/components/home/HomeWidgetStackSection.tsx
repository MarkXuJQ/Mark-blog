import { useEffect, useRef, useState } from 'react'
import {
  useAnimationFrame,
  motion,
  type MotionValue,
  useReducedMotion,
  useMotionValue,
  useScroll,
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
const BACKDROP_REVEAL_END = 0

// Cap how quickly the third scene can chase a large wheel burst.
// This keeps the motion visually steadier when the user scrolls aggressively.
const SCENE_PROGRESS_MAX_STEP_PER_MS = 0.00105

// Child widget/card reveal timing inside the third screen.
// Keep the third screen background arriving on time, but let the actual content
// wait for the avatar's in-place spin on the second screen to finish.
const WIDGET_REVEAL_START = 0.2
const WIDGET_REVEAL_DURATION = 0.42

// Overall third-screen sticky scene sizing.
// Increase `WIDGET_SCENE_HEIGHT` for a longer pinned chapter.
// Make `WIDGET_SCENE_OVERLAP` more negative if you want this screen to start
// covering the rail earlier.
const WIDGET_SCENE_HEIGHT = '320svh'
const WIDGET_SCENE_OVERLAP = '-160svh'

// In-screen content travel window.
// `CONTENT_SCROLL_START`: when the third screen is considered fully "opened".
// `CONTENT_SCROLL_HOLD_END`: how long the content stays almost still for reading.
// `CONTENT_SCROLL_END`: when the internal content finishes its in-screen travel.
// Move `CONTENT_SCROLL_HOLD_END` later if you want a stronger pause before scrolling.
// Wider gap between hold/end = slower in-screen scroll. Narrower gap = faster.
const CONTENT_SCROLL_START = 0.28
const CONTENT_SCROLL_HOLD_END = 0.44
const CONTENT_SCROLL_END = 0.96

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function approachValue(value: number, target: number, maxDelta: number) {
  if (value < target) return Math.min(target, value + maxDelta)
  if (value > target) return Math.max(target, value - maxDelta)
  return value
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
  const sceneTargetProgressRef = useRef(0)
  const [contentScrollDistance, setContentScrollDistance] = useState(0)
  const [sceneExtraScroll, setSceneExtraScroll] = useState(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const sceneProgress = useMotionValue(scrollYProgress.get())

  useEffect(() => {
    const initialProgress = scrollYProgress.get()
    sceneTargetProgressRef.current = initialProgress
    sceneProgress.set(initialProgress)

    if (prefersReducedMotion) return

    return scrollYProgress.on('change', (latest) => {
      sceneTargetProgressRef.current = latest
    })
  }, [prefersReducedMotion, sceneProgress, scrollYProgress])

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion) {
      const latest = scrollYProgress.get()
      sceneTargetProgressRef.current = latest
      if (sceneProgress.get() !== latest) sceneProgress.set(latest)
      return
    }

    const current = sceneProgress.get()
    const target = sceneTargetProgressRef.current
    if (Math.abs(target - current) <= 0.0004) {
      if (current !== target) sceneProgress.set(target)
      return
    }

    const maxStep = delta * SCENE_PROGRESS_MAX_STEP_PER_MS
    sceneProgress.set(approachValue(current, target, maxStep))
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
    if (value <= CONTENT_SCROLL_START) return 0
    if (value <= CONTENT_SCROLL_HOLD_END) return 0

    const raw = clamp01(
      (value - CONTENT_SCROLL_HOLD_END) /
        (CONTENT_SCROLL_END - CONTENT_SCROLL_HOLD_END)
    )

    return -raw * contentScrollDistance
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
        <div className="relative h-full">
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
                  style={{ opacity: 1, y: 0, scale: 1 }}
                >
                  <div className="relative w-full">
                    <div aria-hidden="true" className={styles.stageHalo} />
                    <div aria-hidden="true" className={styles.stageRing} />
                    <div
                      aria-hidden="true"
                      className={styles.stageRingSecondary}
                    />

                    <div className={styles.pluginWrap}>
                      <TravelFootprintPlugin
                        revealProgress={widgetRevealProgress}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
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
