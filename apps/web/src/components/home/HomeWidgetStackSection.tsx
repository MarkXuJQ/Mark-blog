import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { TravelFootprintPlugin } from './TravelFootprintPlugin'

const BACKDROP_REVEAL_END = 0
const SCENE_PROGRESS_MAX_STEP_PER_MS = 0.00105
const WIDGET_REVEAL_START = 0.2
const WIDGET_REVEAL_DURATION = 0.42
const WIDGET_SCENE_HEIGHT = '320svh'
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

function useHomeWidgetStackScene({
  sectionRef,
  contentViewportRef,
  contentTrackRef,
  prefersReducedMotion,
  isCoarsePointer,
}: {
  sectionRef: RefObject<HTMLElement | null>
  contentViewportRef: RefObject<HTMLDivElement | null>
  contentTrackRef: RefObject<HTMLDivElement | null>
  prefersReducedMotion: boolean
  isCoarsePointer: boolean
}) {
  const [contentScrollDistance, setContentScrollDistance] = useState(0)
  const [sceneExtraScroll, setSceneExtraScroll] = useState(0)
  const sceneTargetProgressRef = useRef(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const sceneProgress = useMotionValue(scrollYProgress.get())

  useEffect(() => {
    const initialProgress = scrollYProgress.get()
    sceneTargetProgressRef.current = initialProgress
    sceneProgress.set(initialProgress)

    if (prefersReducedMotion || isCoarsePointer) return

    return scrollYProgress.on('change', (latest) => {
      sceneTargetProgressRef.current = latest
    })
  }, [isCoarsePointer, prefersReducedMotion, sceneProgress, scrollYProgress])

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || isCoarsePointer) {
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
  }, [contentTrackRef, contentViewportRef, prefersReducedMotion])

  const sectionStyle: CSSProperties = prefersReducedMotion
    ? { minHeight: '100svh' }
    : {
        minHeight: `max(${WIDGET_SCENE_HEIGHT}, calc(100svh + ${sceneExtraScroll}px))`,
      }

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

  return {
    backdropScale,
    backdropShadow,
    backdropY,
    contentScrollY,
    sectionStyle,
    widgetRevealProgress,
  }
}

function HomeTravelAvatarKeyframe({
  avatarSrc,
  isZh,
}: {
  avatarSrc: string
  isZh: boolean
}) {
  return (
    <div aria-hidden="true" className={styles.keyframeScene}>
      <div className={styles.keyframeShell}>
        <div className={styles.keyframeStage}>
          <div className={styles.keyframeHeaderRow}>
            <div className={styles.keyframeCopy}>
              <p className={styles.keyframeEyebrow}>
                {isZh
                  ? '旅行足迹 / Travel footprint'
                  : 'Travel footprint / Atlas'}
              </p>
              <h2 className={styles.keyframeTitle}>
                {isZh ? '去过的地方' : "Places I've Been"}
              </h2>
            </div>
          </div>
          <div className={styles.keyframeMapStage}>
            <div className={styles.keyframeMapViewport}>
              <div className={styles.keyframeAnchorLayer}>
                <div className={styles.keyframeAnchorCell}>
                  <div className={styles.keyframeAnchorPortrait}>
                    <div
                      aria-hidden="true"
                      className={styles.keyframeAnchorGlow}
                    />
                    <div className={styles.keyframeAnchorFrame}>
                      <div className={styles.keyframeAnchorMask}>
                        <img
                          src={avatarSrc}
                          alt=""
                          loading="eager"
                          decoding="async"
                          className={styles.keyframeAnchorImage}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface HomeWidgetStackSectionProps {
  avatarSrc: string
}

export function HomeWidgetStackSection({
  avatarSrc,
}: HomeWidgetStackSectionProps) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const prefersReducedMotion = Boolean(useReducedMotion())
  const isCoarsePointer = useIsCoarsePointer()
  const sectionRef = useRef<HTMLElement | null>(null)
  const contentViewportRef = useRef<HTMLDivElement | null>(null)
  const contentTrackRef = useRef<HTMLDivElement | null>(null)
  const {
    backdropScale,
    backdropShadow,
    backdropY,
    contentScrollY,
    sectionStyle,
    widgetRevealProgress,
  } = useHomeWidgetStackScene({
    sectionRef,
    contentViewportRef,
    contentTrackRef,
    prefersReducedMotion,
    isCoarsePointer,
  })

  return (
    <section
      ref={sectionRef}
      data-home-snap="widget"
      aria-label={isZh ? '首页小组件堆叠区' : 'Homepage widget stack'}
      className="relative isolate z-20"
      style={sectionStyle}
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

          <div className="relative z-10 h-full">
            <div ref={contentViewportRef} className={styles.contentViewport}>
              <motion.div
                ref={contentTrackRef}
                className={styles.contentTrack}
                style={{ y: contentScrollY }}
              >
                <div className={styles.contentViewportInner}>
                  <div className="relative w-full">
                    <div aria-hidden="true" className={styles.stageHalo} />
                    <div aria-hidden="true" className={styles.stageRing} />
                    <div
                      aria-hidden="true"
                      className={styles.stageRingSecondary}
                    />
                    <HomeTravelAvatarKeyframe
                      avatarSrc={avatarSrc}
                      isZh={Boolean(isZh)}
                    />

                    <div className={styles.pluginWrap}>
                      <TravelFootprintPlugin
                        revealProgress={widgetRevealProgress}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
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
    'relative min-h-full pt-[10svh] pb-[18svh] sm:pt-[12svh] sm:pb-[20svh] lg:pt-[13svh] lg:pb-[22svh] will-change-transform',
  contentViewportInner: 'relative',
  pluginWrap: 'relative z-10',
  keyframeScene:
    'pointer-events-none invisible absolute inset-0 z-0 select-none',
  keyframeShell: 'mx-auto w-full max-w-[78rem] overflow-visible',
  keyframeStage: 'relative overflow-visible',
  keyframeHeaderRow: 'relative z-[3] pt-0 sm:pt-1 lg:pt-2',
  keyframeCopy:
    'relative z-[3] max-w-3xl -translate-x-0.5 -translate-y-0.5 sm:-translate-x-1 sm:-translate-y-1 lg:-translate-x-2 lg:-translate-y-1.5',
  keyframeEyebrow:
    'font-[var(--font-pixel)] text-[0.72rem] uppercase tracking-[0.28em] text-cyan-100/70 drop-shadow-[0_10px_24px_rgba(5,9,19,0.45)]',
  keyframeTitle:
    'mt-3 max-w-[18ch] text-3xl font-semibold leading-[1.02] text-white text-balance drop-shadow-[0_18px_34px_rgba(5,9,19,0.48)] sm:text-[3.35rem] lg:text-[4rem]',
  keyframeMapStage:
    'relative z-[2] mx-auto mt-3 w-full max-w-[58rem] overflow-visible sm:mt-5 lg:mt-6 lg:max-w-[62rem]',
  keyframeMapViewport:
    'relative aspect-[2.34/1] w-full overflow-visible sm:aspect-[2.52/1]',
  keyframeAnchorLayer:
    'absolute bottom-[5.5%] left-[1.5%] z-[4] w-auto justify-start pt-0 lg:pt-0',
  keyframeAnchorCell:
    'relative z-[3] flex w-full justify-center self-start pt-1 will-change-transform lg:max-w-[22rem] lg:pt-6',
  keyframeAnchorPortrait:
    'relative mx-0 w-full max-w-[6.75rem] sm:max-w-[8rem] lg:max-w-[9rem]',
  keyframeAnchorGlow:
    'pointer-events-none absolute inset-[-22%] bg-[radial-gradient(circle_at_50%_18%,rgba(125,211,252,0.28)_0%,rgba(125,211,252,0.1)_32%,rgba(125,211,252,0)_72%)] blur-3xl',
  keyframeAnchorFrame:
    'relative aspect-square w-full overflow-hidden rounded-[24px] border border-white/12 bg-slate-950/56 p-2 shadow-[0_22px_48px_-30px_rgba(0,0,0,0.74)] backdrop-blur-sm',
  keyframeAnchorMask:
    'h-full w-full overflow-hidden rounded-[22px] bg-[#0d1319]',
  keyframeAnchorImage: 'h-full w-full scale-[1.04] object-cover object-center',
}
