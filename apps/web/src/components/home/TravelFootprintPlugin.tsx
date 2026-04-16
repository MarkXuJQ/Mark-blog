import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  motion,
  type MotionStyle,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { Globe2, MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import worldFootprintBaseSvg from '../../assets/travel/world-footprint-base.svg'
import worldFootprintHighlightSvg from '../../assets/travel/world-footprint-highlight.svg'
import { LifeSinceClock } from './LifeSinceClock'

const EMBED_MAP_URL =
  'https://travel.markxu.icu/?embed=1&bare=1&baseMap=liberty'

const SHELL_REVEAL_END = 0.28
const WORLD_PANEL_REVEAL_START = 0.08
const WORLD_PANEL_REVEAL_END = 0.34
const EMBED_PANEL_REVEAL_START = 0.4
const EMBED_PANEL_REVEAL_END = 0.66
const CLOCK_PANEL_REVEAL_START = 0.72
const CLOCK_PANEL_REVEAL_END = 0.96

const hoverLift = {
  whileHover: {
    scale: 1.008,
    boxShadow: '0 34px 90px -52px rgba(15,23,42,0.78)',
  },
  whileTap: { scale: 0.996 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function usePanelReveal(
  progress: MotionValue<number>,
  start: number,
  end: number,
  prefersReducedMotion: boolean
) {
  const opacity = useTransform(progress, (value) => {
    const raw = clamp01((value - start) / (end - start))
    return prefersReducedMotion ? (raw > 0 ? 1 : 0) : easeOutCubic(raw)
  })
  const y = useTransform(progress, (value) => {
    const raw = clamp01((value - start) / (end - start))
    const eased = prefersReducedMotion ? raw : easeOutCubic(raw)
    return prefersReducedMotion ? 0 : 44 * (1 - eased)
  })
  const scale = useTransform(progress, (value) => {
    const raw = clamp01((value - start) / (end - start))
    const eased = prefersReducedMotion ? raw : easeOutCubic(raw)
    return prefersReducedMotion ? 1 : 0.94 + eased * 0.06
  })

  return { opacity, y, scale }
}

function useSummedTransform(
  input: [MotionValue<number>, MotionValue<number>]
) {
  return useTransform<number, number>(input, ([primary, secondary]) => {
    return primary + secondary
  })
}

export function TravelFootprintPlugin({
  revealProgress,
}: {
  revealProgress?: MotionValue<number>
}) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const prefersReducedMotion = useReducedMotion()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [isPointerDown, setIsPointerDown] = useState(false)
  const fallbackRevealProgress = useMotionValue(1)
  const pluginReveal = revealProgress ?? fallbackRevealProgress
  const pointerXRaw = useMotionValue(0)
  const pointerYRaw = useMotionValue(0)
  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ['start end', 'end start'],
  })
  const shellProgress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 220 : 110,
    damping: prefersReducedMotion ? 34 : 24,
    mass: 0.4,
  })

  const pointerX = useSpring(pointerXRaw, {
    stiffness: prefersReducedMotion ? 320 : 180,
    damping: prefersReducedMotion ? 34 : 24,
    mass: 0.26,
  })
  const pointerY = useSpring(pointerYRaw, {
    stiffness: prefersReducedMotion ? 320 : 180,
    damping: prefersReducedMotion ? 34 : 24,
    mass: 0.28,
  })

  const dragStrength = prefersReducedMotion ? 0 : isPointerDown ? 0.82 : 0.42

  const mapX = useTransform(pointerX, (value) => value * -9 * dragStrength)
  const mapY = useTransform(pointerY, (value) => value * -7 * dragStrength)
  const mapRotate = useTransform(
    pointerX,
    (value) => value * -0.55 * dragStrength
  )

  const embedX = useTransform(pointerX, (value) => value * 9 * dragStrength)
  const embedY = useTransform(pointerY, (value) => value * -7 * dragStrength)
  const embedRotate = useTransform(
    pointerX,
    (value) => value * 0.52 * dragStrength
  )

  const clockX = useTransform(pointerX, (value) => value * -7 * dragStrength)
  const clockY = useTransform(pointerY, (value) => value * 7 * dragStrength)
  const clockRotate = useTransform(
    pointerX,
    (value) => value * -0.48 * dragStrength
  )

  const gridY = useTransform(shellProgress, [0, 0.38, 1], [42, 0, -18])
  const ambientScale = useTransform(
    shellProgress,
    [0, 0.6, 1],
    [0.96, 1.02, 1.05]
  )
  const ambientOpacity = useTransform(
    shellProgress,
    [0, 0.18, 1],
    [0, 0.88, 0.42]
  )
  const ambientY = useTransform(shellProgress, [0, 1], [32, -26])
  const ambientSecondaryOpacity = useTransform(
    shellProgress,
    [0, 0.24, 1],
    [0, 0.46, 0.22]
  )
  const shellOpacity = useTransform(pluginReveal, (value) => {
    const eased = prefersReducedMotion
      ? clamp01(value)
      : easeOutCubic(clamp01(value / SHELL_REVEAL_END))
    return prefersReducedMotion ? 1 : 0.2 + eased * 0.8
  })
  const shellRevealY = useTransform(pluginReveal, (value) => {
    const eased = prefersReducedMotion
      ? clamp01(value)
      : easeOutCubic(clamp01(value / SHELL_REVEAL_END))
    return prefersReducedMotion ? 0 : 36 * (1 - eased)
  })
  const shellRevealScale = useTransform(pluginReveal, (value) => {
    const eased = prefersReducedMotion
      ? clamp01(value)
      : easeOutCubic(clamp01(value / SHELL_REVEAL_END))
    return prefersReducedMotion ? 1 : 0.96 + eased * 0.04
  })

  const worldReveal = usePanelReveal(
    pluginReveal,
    WORLD_PANEL_REVEAL_START,
    WORLD_PANEL_REVEAL_END,
    Boolean(prefersReducedMotion)
  )
  const embedReveal = usePanelReveal(
    pluginReveal,
    EMBED_PANEL_REVEAL_START,
    EMBED_PANEL_REVEAL_END,
    Boolean(prefersReducedMotion)
  )
  const clockReveal = usePanelReveal(
    pluginReveal,
    CLOCK_PANEL_REVEAL_START,
    CLOCK_PANEL_REVEAL_END,
    Boolean(prefersReducedMotion)
  )

  const mapRevealY = useSummedTransform([mapY, worldReveal.y])
  const embedRevealY = useSummedTransform([embedY, embedReveal.y])
  const clockRevealY = useSummedTransform([clockY, clockReveal.y])

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1

    pointerXRaw.set(Math.max(-1, Math.min(1, x)))
    pointerYRaw.set(Math.max(-1, Math.min(1, y)))
  }

  const resetPointer = () => {
    setIsPointerDown(false)
    pointerXRaw.set(0)
    pointerYRaw.set(0)
  }

  return (
    <motion.div
      ref={shellRef}
      className={cn(
        styles.shell,
        prefersReducedMotion
          ? styles.shellStatic
          : isPointerDown
            ? styles.shellDragging
            : styles.shellReady
      )}
      style={{
        opacity: shellOpacity,
        y: shellRevealY,
        scale: shellRevealScale,
      }}
      onPointerMove={handlePointerMove}
      onPointerDown={() => setIsPointerDown(true)}
      onPointerUp={() => setIsPointerDown(false)}
      onPointerCancel={resetPointer}
      onPointerLeave={resetPointer}
    >
      <motion.div
        aria-hidden="true"
        className={styles.ambientOrbit}
        style={{ y: ambientY, scale: ambientScale, opacity: ambientOpacity }}
      />
      <motion.div
        aria-hidden="true"
        className={styles.ambientOrbitSecondary}
        style={{ opacity: ambientSecondaryOpacity }}
      />

      <motion.div className={styles.grid} style={{ y: gridY }}>
        <TravelWorldMapPanel
          isZh={isZh}
          style={{
            x: mapX,
            y: mapRevealY,
            rotate: mapRotate,
            opacity: worldReveal.opacity,
            scale: worldReveal.scale,
          }}
        />

        <TravelFootprintMapPanel
          isZh={isZh}
          style={{
            x: embedX,
            y: embedRevealY,
            rotate: embedRotate,
            opacity: embedReveal.opacity,
            scale: embedReveal.scale,
          }}
        />

        <motion.div
          {...hoverLift}
          className={styles.clockCell}
          style={{
            x: clockX,
            y: clockRevealY,
            rotate: clockRotate,
            opacity: clockReveal.opacity,
            scale: clockReveal.scale,
          }}
        >
          <LifeSinceClock compact bare className={styles.clockPanel} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function TravelWorldMapPanel({
  isZh,
  style,
}: {
  isZh: boolean
  style?: MotionStyle
}) {
  return (
    <motion.section
      {...hoverLift}
      className={cn(styles.panel, styles.mapPanel)}
      style={style}
    >
      <div className={styles.mapHeader}>
        <div className={cn(styles.cardIconWrap, 'mt-0')}>
          <Globe2 className="h-4 w-4" />
        </div>
        <div className={styles.cardCopy}>
          <p className={styles.cardEyebrow}>
            {isZh ? '世界地图' : 'World map'}
          </p>
        </div>
      </div>

      <div className={styles.mapViewport}>
        <div className={styles.mapGlow} />
        <img
          alt=""
          aria-hidden="true"
          src={worldFootprintBaseSvg}
          className={styles.mapBase}
        />
        <img
          alt={
            isZh
              ? '已去过国家高亮世界地图'
              : 'Highlighted visited countries map'
          }
          src={worldFootprintHighlightSvg}
          className={styles.mapHighlight}
        />
      </div>
    </motion.section>
  )
}

function TravelFootprintMapPanel({
  isZh,
  style,
}: {
  isZh: boolean
  style?: MotionStyle
}) {
  return (
    <motion.section
      {...hoverLift}
      className={cn(styles.panel, styles.embedPanel)}
      style={style}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIconWrap}>
          <MapPinned className="h-4 w-4" />
        </div>
        <div className={styles.cardCopy}>
          <p className={styles.cardEyebrow}>{isZh ? '足迹地图' : 'Live map'}</p>
          <p className={styles.cardTitle}>
            {isZh ? '我去过的地方' : 'Where I have been to'}
          </p>
        </div>
      </div>

      <div className={styles.embedViewport}>
        <iframe
          title={isZh ? '旅行地图交互窗口' : 'Interactive travel map'}
          src={EMBED_MAP_URL}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className={styles.embedFrame}
        />
      </div>
    </motion.section>
  )
}

const styles = {
  shell: 'relative mx-auto w-full max-w-[78rem] overflow-visible',
  shellReady: 'cursor-grab',
  shellDragging: 'cursor-grabbing',
  shellStatic: 'cursor-default',
  ambientOrbit:
    'pointer-events-none absolute left-1/2 top-6 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.08)_28%,rgba(56,189,248,0)_68%)] blur-3xl',
  ambientOrbitSecondary:
    'pointer-events-none absolute right-[-2rem] top-[20rem] -z-10 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_30%,rgba(255,255,255,0)_70%)] blur-3xl',
  grid: 'grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,24rem)] lg:grid-rows-[auto_auto] lg:gap-x-10 lg:gap-y-10',
  panel:
    'relative min-w-0 w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 p-4 text-white shadow-[0_28px_90px_-48px_rgba(15,23,42,0.6)] will-change-transform sm:p-5',
  mapPanel: 'z-[2] self-start lg:col-span-2 lg:row-start-1',
  embedPanel:
    'z-[4] self-start lg:col-start-2 lg:row-start-2 lg:w-full lg:translate-y-[-1.5rem]',
  clockCell:
    'relative z-[3] w-full max-w-[24rem] self-start will-change-transform lg:col-start-1 lg:row-start-2 lg:mt-10',
  clockPanel: 'h-full',
  cardHeader: 'flex items-start gap-2.5',
  mapHeader: 'flex items-center gap-2.5',
  cardIconWrap:
    'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[18px] border border-white/12 bg-white/6 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  cardCopy: 'min-w-0',
  cardEyebrow:
    'text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/56',
  cardTitle:
    'mt-1 text-[0.83rem] font-medium leading-5 text-white/84 sm:text-[0.9rem]',
  mapViewport:
    'relative mt-3 aspect-[2.55/1] overflow-hidden rounded-[24px] border border-white/10 bg-[#0c1217] px-3.5 pt-3.5 pb-0 sm:aspect-[2.7/1]',
  mapGlow:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:18px_18px]',
  mapBase: 'absolute inset-0 h-full w-full object-cover opacity-54',
  mapHighlight:
    'absolute inset-0 h-full w-full object-cover opacity-100 drop-shadow-[0_0_22px_rgba(181,232,251,0.34)]',
  embedViewport:
    'relative mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#0c1217] p-1.5',
  embedFrame:
    'relative block aspect-square w-full rounded-[18px] border-0 bg-[#10161a] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.72)]',
}
