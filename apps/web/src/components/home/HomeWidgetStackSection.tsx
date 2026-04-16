import { useRef } from 'react'
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

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
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
    prefersReducedMotion ? 1 : clamp01(value / 0.22)
  )
  const widgetRevealProgress = useTransform(sceneProgress, (value) =>
    prefersReducedMotion ? 1 : clamp01((value - 0.26) / 0.6)
  )

  const backdropY = useTransform(backdropProgress, [0, 1], ['18%', '0%'])
  const backdropScale = useTransform(backdropProgress, [0, 1], [0.94, 1])
  const backdropRadius = useTransform(backdropProgress, [0, 1], [40, 0])
  const backdropOpacity = useTransform(backdropProgress, [0, 1], [0.72, 1])
  const contentOpacity = useTransform(sceneProgress, (value) => {
    if (prefersReducedMotion) return 1
    if (value <= 0.22) return 0
    if (value <= 0.32) return ((value - 0.22) / 0.1) * 0.62
    if (value <= 0.42) return 0.62 + ((value - 0.32) / 0.1) * 0.38
    return 1
  })
  const contentY = useTransform(sceneProgress, (value) => {
    if (prefersReducedMotion) return 0
    if (value <= 0.22) return 42
    if (value <= 0.42) return 42 + ((0 - 42) * (value - 0.22)) / 0.2
    return 0
  })

  return (
    <section
      ref={sectionRef}
      aria-label={isZh ? '主页小组件堆叠区' : 'Homepage widget stack'}
      className={
        prefersReducedMotion
          ? 'relative min-h-[100svh]'
          : 'relative min-h-[320svh]'
      }
    >
      <motion.div
        className="sticky top-0 h-[100svh] overflow-hidden"
        style={{
          scale: sectionScale,
          y: sectionY,
          opacity: sectionOpacity,
          filter: sectionFilter,
          pointerEvents: sectionPointerEvents,
        }}
      >
        <motion.div
          className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#050913_0%,#060c17_24%,#07101c_56%,#091522_100%)]"
          style={{
            y: backdropY,
            scale: backdropScale,
            borderRadius: backdropRadius,
            opacity: backdropOpacity,
          }}
        >
          <div aria-hidden="true" className={styles.topBlend} />
          <div aria-hidden="true" className={styles.leftGlow} />
          <div aria-hidden="true" className={styles.rightGlow} />
          <div aria-hidden="true" className={styles.gridField} />
        </motion.div>

        <motion.div
          className="relative z-10 mx-auto flex h-full w-full max-w-[96rem] items-center px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
          style={{ opacity: contentOpacity, y: contentY }}
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
    </section>
  )
}

const styles = {
  topBlend:
    'pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(5,8,16,0.96)_0%,rgba(5,8,16,0.56)_36%,rgba(5,8,16,0)_100%)]',
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
  pluginWrap: 'relative z-10',
}
