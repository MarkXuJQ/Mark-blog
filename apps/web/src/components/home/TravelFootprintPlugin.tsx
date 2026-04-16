import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import { Clock3, Globe2, MapPinned, Orbit, ScanSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import worldFootprintBaseSvg from '../../assets/travel/world-footprint-base.svg'
import worldFootprintHighlightSvg from '../../assets/travel/world-footprint-highlight.svg'
import { LifeSinceClock } from './LifeSinceClock'

const EMBED_MAP_URL =
  'https://travel.markxu.icu/?embed=1&bare=1&baseMap=liberty'
const hoverLift = {
  whileHover: {
    scale: 1.01,
    boxShadow: '0 34px 90px -52px rgba(15,23,42,0.78)',
  },
  whileTap: { scale: 0.996 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
}

export function TravelFootprintPlugin({ avatarSrc }: { avatarSrc?: string }) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const prefersReducedMotion = useReducedMotion()
  const [isPointerDown, setIsPointerDown] = useState(false)
  const pointerXRaw = useMotionValue(0)
  const pointerYRaw = useMotionValue(0)
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
  const dragStrength = prefersReducedMotion ? 0 : isPointerDown ? 0.82 : 0.48

  const mapX = useTransform(pointerX, (value) => value * -10 * dragStrength)
  const mapY = useTransform(pointerY, (value) => value * -8 * dragStrength)
  const mapRotate = useTransform(
    pointerX,
    (value) => value * -0.9 * dragStrength
  )

  const embedX = useTransform(pointerX, (value) => value * 10 * dragStrength)
  const embedY = useTransform(pointerY, (value) => value * -8 * dragStrength)
  const embedRotate = useTransform(
    pointerX,
    (value) => value * 0.82 * dragStrength
  )

  const clockX = useTransform(pointerX, (value) => value * -9 * dragStrength)
  const clockY = useTransform(pointerY, (value) => value * 9 * dragStrength)
  const clockRotate = useTransform(
    pointerX,
    (value) => value * -0.72 * dragStrength
  )

  const radarX = useTransform(pointerX, (value) => value * 9 * dragStrength)
  const radarY = useTransform(pointerY, (value) => value * 8 * dragStrength)
  const radarRotate = useTransform(
    pointerX,
    (value) => value * 0.76 * dragStrength
  )

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

  const radarModules = isZh
    ? [
        { icon: MapPinned, label: '后续可接更多旅行图层' },
        { icon: Clock3, label: '也可以展示生活状态与时间信号' },
        { icon: ScanSearch, label: '预留为新的探索入口与实验模块' },
      ]
    : [
        { icon: MapPinned, label: 'Ready for more map-based layers later on' },
        { icon: Clock3, label: 'It can surface time and life signals too' },
        {
          icon: ScanSearch,
          label: 'Kept as an exploration slot for future modules',
        },
      ]

  return (
    <div
      className={cn(
        styles.shell,
        prefersReducedMotion
          ? styles.shellStatic
          : isPointerDown
            ? styles.shellDragging
            : styles.shellReady
      )}
      onPointerMove={handlePointerMove}
      onPointerDown={() => setIsPointerDown(true)}
      onPointerUp={() => setIsPointerDown(false)}
      onPointerCancel={resetPointer}
      onPointerLeave={resetPointer}
    >
      <div className={styles.grid}>
        <motion.section
          {...hoverLift}
          className={cn(styles.panel, styles.mapPanel)}
          style={{ x: mapX, y: mapY, rotate: mapRotate }}
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

        <motion.section
          {...hoverLift}
          className={cn(styles.panel, styles.embedPanel)}
          style={{ x: embedX, y: embedY, rotate: embedRotate }}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrap}>
              <MapPinned className="h-4 w-4" />
            </div>
            <div className={styles.cardCopy}>
              <p className={styles.cardEyebrow}>
                {isZh ? '足迹地图' : 'Live map'}
              </p>
              <p className={styles.cardTitle}>
                {isZh
                  ? '一个缩小版的实时旅行地图窗口'
                  : 'A smaller live travel-map window'}
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

        <motion.div
          {...hoverLift}
          className={styles.clockCell}
          style={{ x: clockX, y: clockY, rotate: clockRotate }}
        >
          <LifeSinceClock compact bare className={styles.clockPanel} />
        </motion.div>

        <motion.section
          {...hoverLift}
          className={cn(styles.panel, styles.radarPanel)}
          style={{ x: radarX, y: radarY, rotate: radarRotate }}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrap}>
              <Orbit className="h-4 w-4" />
            </div>
            <div className={styles.cardCopy}>
              <p className={styles.cardEyebrow}>
                {isZh ? '功能雷达' : 'Feature radar'}
              </p>
            </div>
          </div>

          <div className={styles.radarDisplay}>
            <div className={styles.radarGrid} />
            <motion.div
              className={styles.radarSweep}
              animate={{ rotate: 360 }}
              transition={{
                duration: 8,
                ease: 'linear',
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
            <span className={styles.radarPingOne} />
            <span className={styles.radarPingTwo} />
            <span className={styles.radarPingThree} />

            <div className={styles.radarCenter}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={isZh ? 'Mark 头像' : "Mark's avatar"}
                  width={84}
                  height={84}
                  decoding="async"
                  className={styles.radarAvatar}
                />
              ) : (
                <span className={styles.radarCoreFallback} />
              )}
            </div>
          </div>

          <div className={styles.futureModuleStack}>
            {radarModules.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className={styles.futureModuleItem}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

const styles = {
  shell: 'relative w-full',
  shellReady: 'cursor-grab',
  shellDragging: 'cursor-grabbing',
  shellStatic: 'cursor-default',
  grid: 'grid min-w-0 items-start gap-3 sm:gap-3.5 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-x-3 lg:gap-y-3',
  panel:
    'relative min-w-0 overflow-hidden rounded-[26px] border border-white/10 bg-[#10161a] p-3.5 text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.62)] will-change-transform sm:p-4',
  mapPanel: 'z-[2] self-start lg:col-start-1 lg:row-start-1',
  embedPanel:
    'z-[3] self-start lg:col-start-2 lg:row-start-1 lg:w-[75%] lg:justify-self-start',
  clockCell:
    'relative z-[4] self-start will-change-transform lg:col-start-1 lg:row-start-2',
  clockPanel: 'h-full',
  radarPanel:
    'z-[2] self-start bg-[linear-gradient(180deg,#10161c_0%,#0c1217_100%)] lg:col-start-2 lg:row-start-2',
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
    'relative mt-3 aspect-[2.42/1] overflow-hidden rounded-[22px] border border-white/10 bg-[#0c1217] px-3.5 pt-3.5 pb-0',
  mapGlow:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:18px_18px]',
  mapBase: 'absolute inset-0 h-full w-full object-cover opacity-54',
  mapHighlight:
    'absolute inset-0 h-full w-full object-cover opacity-100 drop-shadow-[0_0_22px_rgba(181,232,251,0.34)]',
  mapPilot:
    'absolute bottom-4 left-4 z-10 flex max-w-[15rem] items-center gap-3 rounded-full border border-white/14 bg-slate-950/72 px-3 py-2.5 shadow-[0_18px_34px_-24px_rgba(0,0,0,0.95)] backdrop-blur-md',
  mapPilotAvatar:
    'h-10 w-10 rounded-full border border-white/70 object-cover shadow-[0_12px_28px_-18px_rgba(15,23,42,0.95)]',
  mapPilotEyebrow:
    'text-[0.58rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/50',
  mapPilotTitle: 'mt-1 text-xs leading-5 text-white/86',
  embedViewport:
    'relative mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#0c1217] p-1.5',
  embedFrame:
    'relative block aspect-square w-full rounded-[18px] border-0 bg-[#10161a] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.72)]',
  radarDisplay:
    'relative mt-4 flex aspect-square max-h-[12rem] w-full items-center justify-center self-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(11,24,34,0.96)_0%,rgba(7,14,20,1)_100%)]',
  radarGrid:
    "absolute inset-[9%] rounded-full border border-white/10 before:absolute before:inset-[16%] before:rounded-full before:border before:border-white/10 before:content-[''] after:absolute after:inset-[33%] after:rounded-full after:border after:border-white/10 after:content-['']",
  radarSweep:
    'absolute inset-[7%] rounded-full bg-[conic-gradient(from_180deg,rgba(56,189,248,0)_0deg,rgba(56,189,248,0.04)_180deg,rgba(34,211,238,0.42)_312deg,rgba(255,255,255,0.12)_338deg,rgba(56,189,248,0)_360deg)]',
  radarPingOne:
    'absolute left-[22%] top-[28%] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.82)]',
  radarPingTwo:
    'absolute right-[24%] top-[36%] h-2 w-2 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(253,230,138,0.72)]',
  radarPingThree:
    'absolute right-[31%] bottom-[24%] h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.72)]',
  radarCenter:
    'relative z-10 flex h-[4.7rem] w-[4.7rem] items-center justify-center rounded-full border border-white/15 bg-white/8 shadow-[0_0_0_12px_rgba(255,255,255,0.02)] backdrop-blur-sm',
  radarAvatar:
    'h-[3.65rem] w-[3.65rem] rounded-full border border-white/80 object-cover shadow-[0_18px_34px_-18px_rgba(15,23,42,0.9)]',
  radarCoreFallback:
    'h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(103,232,249,0.92)]',
  futureModuleStack: 'mt-4 grid gap-2',
  futureModuleItem:
    'flex items-center gap-2.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 text-[0.82rem] text-white/68',
}
