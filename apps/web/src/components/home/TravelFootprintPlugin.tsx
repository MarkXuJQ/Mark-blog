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
import { ExternalLink, MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { getImageUrl } from '../../utils/image'
import { useDeferredRender } from '../../hooks/useDeferredRender'
import markTravelRecord from '@content/travel/records/mark.json'
import worldFootprintBaseSvg from '../../assets/travel/world-footprint-base.svg'
import worldFootprintHighlightSvg from '../../assets/travel/world-footprint-highlight.svg'
import { LifeSinceClock } from './LifeSinceClock'

const EMBED_MAP_URL =
  'https://travel.markxu.icu/?embed=1&bare=1&baseMap=liberty'
const FULL_MAP_URL = 'https://travel.markxu.icu/'

const SHELL_REVEAL_END = 0.28
const WORLD_PANEL_REVEAL_START = 0.08
const WORLD_PANEL_REVEAL_END = 0.34
const AVATAR_PANEL_REVEAL_START = 0.28
const AVATAR_PANEL_REVEAL_END = 0.56
const EMBED_PANEL_REVEAL_START = 0.4
const EMBED_PANEL_REVEAL_END = 0.66
const CLOCK_PANEL_REVEAL_START = 0.72
const CLOCK_PANEL_REVEAL_END = 0.96
const HOME_AVATAR_SRC = getImageUrl('/images/IMG_1766.JPG')

const CHINA_CITY_TO_PROVINCE: Record<string, string> = {
  北京: '北京',
  北京市: '北京',
  大连市: '辽宁',
  天津: '天津',
  天津市: '天津',
  呼和浩特市: '内蒙古',
  厦门市: '福建',
  南京市: '江苏',
  哈尔滨市: '黑龙江',
  咸阳市: '陕西',
  威海市: '山东',
  广州市: '广东',
  日照市: '山东',
  杭州市: '浙江',
  汕头市: '广东',
  泉州市: '福建',
  泰安市: '山东',
  济南市: '山东',
  淄博市: '山东',
  深圳市: '广东',
  潍坊市: '山东',
  潮州市: '广东',
  福州市: '福建',
  西安市: '陕西',
  长沙市: '湖南',
  青岛市: '山东',
  黄山市: '安徽',
  沈阳市: '辽宁',
}

const CHINA_PROVINCE_ALIASES: Record<string, string> = {
  上海: '上海',
  上海市: '上海',
  北京: '北京',
  北京市: '北京',
}

interface TravelLocationRecord {
  type?: string
  name?: string
  label?: string
}

interface TravelJourneyRecord {
  locations?: TravelLocationRecord[]
}

interface TravelRecord {
  birthplace?: TravelLocationRecord
  journeys?: TravelJourneyRecord[]
}

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

function getLocationKeys(location: TravelLocationRecord) {
  return [location.label, location.name].filter(
    (value): value is string => Boolean(value?.trim())
  )
}

function getProvinceFromLocation(location: TravelLocationRecord) {
  for (const key of getLocationKeys(location)) {
    const directProvince = CHINA_PROVINCE_ALIASES[key]
    if (directProvince) return directProvince

    const provinceFromCity = CHINA_CITY_TO_PROVINCE[key]
    if (provinceFromCity) return provinceFromCity
  }

  return null
}

function getCountryFromLocation(location: TravelLocationRecord) {
  if (location.type !== 'country') return null

  for (const key of getLocationKeys(location)) {
    if (key === 'China' || key === '中国') return 'China'
    if (key === 'Thailand' || key === '泰国') return 'Thailand'
    if (key === 'United Kingdom' || key === '英国') return 'United Kingdom'
    return key
  }

  return null
}

function summarizeTravelFootprint(record: TravelRecord) {
  const locations = [
    ...(record.birthplace ? [record.birthplace] : []),
    ...(record.journeys ?? []).flatMap((journey) => journey.locations ?? []),
  ]
  const provinces = new Set<string>()
  const countries = new Set<string>()

  for (const location of locations) {
    const province = getProvinceFromLocation(location)
    if (province) {
      provinces.add(province)
      countries.add('China')
    }

    const country = getCountryFromLocation(location)
    if (country) countries.add(country)
  }

  return {
    countryCount: countries.size,
    provinceCount: provinces.size,
  }
}

const travelSummary = summarizeTravelFootprint(markTravelRecord as TravelRecord)

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

  const avatarX = useTransform(pointerX, (value) => value * 4.5 * dragStrength)
  const avatarY = useTransform(pointerY, (value) => value * 5.5 * dragStrength)
  const avatarRotate = useTransform(
    pointerX,
    (value) => value * 0.34 * dragStrength
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
  const avatarReveal = usePanelReveal(
    pluginReveal,
    AVATAR_PANEL_REVEAL_START,
    AVATAR_PANEL_REVEAL_END,
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
  const avatarRevealY = useSummedTransform([avatarY, avatarReveal.y])
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

      <div className={styles.introStage}>
        <div className={styles.introRow}>
          <div className={styles.introCopy}>
            <p className={styles.introEyebrow}>
              {isZh ? '旅行足迹 / Travel footprint' : 'Travel footprint / Atlas'}
            </p>
            <h2 className={cn('heading-display', styles.introTitle)}>
              {isZh
                ? '去过的地方'
                : "Places I've Been"}
            </h2>
          </div>
        </div>

        <div className={styles.introMapStage}>
          <TravelWorldMapPanel
            className={styles.introMapLayer}
            viewportClassName={styles.introMapViewport}
            glowClassName={styles.introMapGlow}
            baseClassName={styles.introMapBase}
            highlightClassName={styles.introMapHighlight}
            style={{
              x: mapX,
              y: mapRevealY,
              rotate: mapRotate,
              opacity: worldReveal.opacity,
              scale: worldReveal.scale,
            }}
          />

          <TravelAvatarPanel
            isZh={isZh}
            avatarSrc={HOME_AVATAR_SRC}
            className={styles.introAvatarLayer}
            portraitClassName={styles.introAvatarPortrait}
            style={{
              x: avatarX,
              y: avatarRevealY,
              rotate: avatarRotate,
              opacity: avatarReveal.opacity,
              scale: avatarReveal.scale,
            }}
          />

          <div className={styles.introMeta}>
            <SummaryPill
              value={travelSummary.countryCount}
              label={isZh ? '个国家' : 'Countries'}
            />
            <SummaryPill
              value={travelSummary.provinceCount}
              label={isZh ? '个省份' : 'Provinces'}
            />
          </div>
        </div>
      </div>

      <motion.div className={styles.grid} style={{ y: gridY }}>
        <TravelClockPanel
          style={{
            x: clockX,
            y: clockRevealY,
            rotate: clockRotate,
            opacity: clockReveal.opacity,
            scale: clockReveal.scale,
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
      </motion.div>
    </motion.div>
  )
}

function TravelWorldMapPanel({
  style,
  className,
  viewportClassName,
  glowClassName,
  baseClassName,
  highlightClassName,
}: {
  style?: MotionStyle
  className?: string
  viewportClassName?: string
  glowClassName?: string
  baseClassName?: string
  highlightClassName?: string
}) {
  return (
    <motion.div className={cn(styles.mapPanel, className)} style={style}>
      <div className={cn(styles.mapViewport, viewportClassName)}>
        <div className={cn(styles.mapGlow, glowClassName)} />
        <img
          alt=""
          aria-hidden="true"
          src={worldFootprintBaseSvg}
          className={cn(styles.mapBase, baseClassName)}
        />
        <img
          alt=""
          aria-hidden="true"
          src={worldFootprintHighlightSvg}
          className={cn(styles.mapHighlight, highlightClassName)}
        />
      </div>
    </motion.div>
  )
}

function TravelFootprintMapPanel({
  isZh,
  style,
}: {
  isZh: boolean
  style?: MotionStyle
}) {
  const { targetRef, shouldRender } = useDeferredRender<HTMLDivElement>({
    rootMargin: '560px 0px',
  })

  return (
    <motion.section
      {...hoverLift}
      className={cn(styles.panel, styles.embedPanel)}
      style={style}
    >
      <div className={styles.panelHeaderSplit}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIconWrap}>
            <MapPinned className="h-4 w-4" />
          </div>
          <div className={styles.cardCopy}>
            <p className={styles.cardEyebrow}>{isZh ? '交互地图' : 'Live map'}</p>
            <p className={styles.cardTitle}>
              {isZh
                ? '这里记录了我具体去过的地方。'
                : 'This map shows the places I have visited.'}
            </p>
          </div>
        </div>
        <div className={styles.metricCluster}>
          <span className={styles.metricPillMuted}>
            {isZh ? '可缩放 / 可拖拽' : 'Zoomable / draggable'}
          </span>
        </div>
      </div>

      <div ref={targetRef} className={styles.embedViewport}>
        <a
          href={FULL_MAP_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.embedAction}
        >
          <span>{isZh ? '打开完整地图' : 'Open full map'}</span>
          <ExternalLink className={styles.embedActionIcon} />
        </a>

        {shouldRender ? (
          <iframe
            title={isZh ? '旅行地图交互窗口' : 'Interactive travel map'}
            src={EMBED_MAP_URL}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className={styles.embedFrame}
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(styles.embedFrame, styles.embedPlaceholder)}
          >
            <div className={styles.embedPlaceholderGlow} />
            <div className={styles.embedPlaceholderGrid} />
            <span className={styles.embedPlaceholderLabel}>
              {isZh ? '接近视口时再加载地图' : 'Loads as you get closer'}
            </span>
          </div>
        )}
      </div>
    </motion.section>
  )
}

function TravelAvatarPanel({
  isZh,
  avatarSrc,
  style,
  className,
  portraitClassName,
}: {
  isZh: boolean
  avatarSrc: string
  style?: MotionStyle
  className?: string
  portraitClassName?: string
}) {
  return (
    <motion.div
      {...hoverLift}
      data-home-avatar-keyframe-rotate="travel"
      className={cn(styles.avatarCell, className)}
      style={style}
    >
      <div className={cn(styles.avatarPortrait, portraitClassName)}>
        <div aria-hidden="true" className={styles.avatarGlow} />
        <div
          data-home-avatar-keyframe="travel"
          className={styles.avatarFrame}
        >
          <div
            data-home-avatar-keyframe-core="travel"
            className={styles.avatarMask}
          >
            <img
              src={avatarSrc}
              alt={isZh ? 'Mark Xu 的头像' : 'Portrait of Mark Xu'}
              loading="lazy"
              decoding="async"
              data-home-avatar-keyframe-image="travel"
              className={styles.avatarImage}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TravelClockPanel({
  style,
}: {
  style?: MotionStyle
}) {
  return (
    <motion.div className={styles.clockCell} style={style}>
      <LifeSinceClock bare className={styles.clockPanel} />
    </motion.div>
  )
}

function SummaryPill({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div className={styles.summaryPill}>
      <span className={styles.summaryPillValue}>{value}</span>
      <span className={styles.summaryPillLabel}>{label}</span>
    </div>
  )
}

const styles = {
  shell: 'relative mx-auto w-full max-w-[78rem] overflow-visible',
  shellReady: 'cursor-grab',
  shellDragging: 'cursor-grabbing',
  shellStatic: 'cursor-default',
  introStage: 'relative overflow-visible',
  introRow:
    'relative z-[3] pt-0 sm:pt-1 lg:pt-2',
  introCopy:
    'relative z-[3] max-w-3xl -translate-x-0.5 -translate-y-0.5 sm:-translate-x-1 sm:-translate-y-1 lg:-translate-x-2 lg:-translate-y-1.5',
  introEyebrow:
    'font-[var(--font-pixel)] text-[0.72rem] uppercase tracking-[0.28em] text-cyan-100/70 drop-shadow-[0_10px_24px_rgba(5,9,19,0.45)]',
  introTitle:
    'mt-3 max-w-[18ch] text-3xl font-semibold leading-[1.02] text-white text-balance drop-shadow-[0_18px_34px_rgba(5,9,19,0.48)] sm:text-[3.35rem] lg:text-[4rem]',
  introMapStage:
    'relative z-[2] mx-auto mt-3 w-full max-w-[58rem] overflow-visible sm:mt-5 lg:mt-6 lg:max-w-[62rem]',
  introAvatarLayer:
    'absolute bottom-[4%] left-[2%] z-[4] w-auto justify-start pt-0 lg:pt-0',
  introAvatarPortrait:
    'mx-0 max-w-[6.75rem] sm:max-w-[8rem] lg:max-w-[9rem]',
  introMeta:
    'absolute bottom-1 right-2 z-[3] flex flex-col items-end gap-2 sm:bottom-2 sm:right-4 sm:gap-3 lg:bottom-3 lg:right-5',
  summaryPill:
    'inline-flex items-center gap-3 rounded-full border border-cyan-200/16 bg-slate-950/72 px-4 py-2.5 text-white shadow-[0_18px_44px_-28px_rgba(8,145,178,0.45)] backdrop-blur-xl',
  summaryPillValue: 'text-lg font-semibold leading-none text-white',
  summaryPillLabel:
    'text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/52',
  ambientOrbit:
    'pointer-events-none absolute left-1/2 top-6 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.08)_28%,rgba(56,189,248,0)_68%)] blur-3xl',
  ambientOrbitSecondary:
    'pointer-events-none absolute right-[-2rem] top-[20rem] -z-10 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_30%,rgba(255,255,255,0)_70%)] blur-3xl',
  introMapLayer:
    'pointer-events-none relative z-[1] w-full opacity-100 brightness-[1.16] saturate-[1.24]',
  introMapViewport:
    'relative aspect-[2.34/1] w-full overflow-visible sm:aspect-[2.52/1]',
  introMapGlow: 'hidden',
  introMapBase: 'absolute inset-0 h-full w-full object-contain opacity-34',
  introMapHighlight:
    'absolute inset-0 h-full w-full object-contain opacity-100 drop-shadow-[0_0_56px_rgba(181,232,251,0.42)]',
  grid: 'relative grid items-start gap-6 pt-10 sm:gap-8 sm:pt-12 lg:grid-cols-[minmax(19.5rem,24.5rem)_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-8 lg:pt-16',
  panel:
    'relative min-w-0 w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90 p-4 text-white shadow-[0_28px_90px_-48px_rgba(15,23,42,0.6)] will-change-transform sm:p-5',
  mapPanel: 'relative z-[2] w-full self-start',
  embedPanel:
    'z-[4] self-start lg:col-start-2 lg:row-start-1 lg:w-full',
  avatarCell:
    'relative z-[3] flex w-full justify-center self-start pt-1 will-change-transform lg:col-start-1 lg:row-start-1 lg:max-w-[22rem] lg:pt-6',
  clockCell:
    'relative z-[3] w-full self-start will-change-transform lg:col-start-1 lg:row-start-1 lg:max-w-[28rem] xl:max-w-[30rem]',
  clockPanel: 'h-full w-full overflow-visible',
  cardHeader: 'flex items-start gap-2.5',
  panelHeaderSplit:
    'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
  cardIconWrap:
    'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[18px] border border-white/12 bg-white/6 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  cardCopy: 'min-w-0',
  cardEyebrow:
    'text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/56',
  cardTitle:
    'mt-1 text-[0.83rem] font-medium leading-5 text-white/84 sm:text-[0.9rem]',
  cardDescription: 'mt-3 max-w-[44rem] text-sm leading-6 text-white/58',
  metricCluster: 'flex flex-wrap gap-2',
  metricPill:
    'inline-flex items-center rounded-full border border-cyan-300/16 bg-cyan-300/[0.08] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-cyan-50/88',
  metricPillMuted:
    'inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/56',
  mapViewport:
    'relative aspect-[2.28/1] w-full overflow-visible sm:aspect-[2.42/1]',
  mapGlow:
    'pointer-events-none absolute inset-[-8%_-6%_-14%] bg-[radial-gradient(circle_at_50%_52%,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0.07)_32%,rgba(56,189,248,0)_72%)] blur-3xl',
  mapBase: 'absolute inset-0 h-full w-full object-contain opacity-38',
  mapHighlight:
    'absolute inset-0 h-full w-full object-contain opacity-100 drop-shadow-[0_0_32px_rgba(181,232,251,0.36)]',
  avatarPortrait: 'relative mx-auto w-full max-w-[10.5rem] sm:max-w-[11.5rem]',
  avatarGlow:
    'pointer-events-none absolute inset-[-22%] bg-[radial-gradient(circle_at_50%_18%,rgba(125,211,252,0.28)_0%,rgba(125,211,252,0.1)_32%,rgba(125,211,252,0)_72%)] blur-3xl',
  avatarFrame:
    'relative aspect-square w-full overflow-hidden rounded-[24px] border border-white/12 bg-slate-950/56 p-2 shadow-[0_22px_48px_-30px_rgba(0,0,0,0.74)] backdrop-blur-sm',
  avatarMask: 'h-full w-full overflow-hidden rounded-[22px] bg-[#0d1319]',
  avatarImage: 'h-full w-full scale-[1.04] object-cover object-center',
  embedViewport:
    'relative mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#0c1217] p-1.5',
  embedAction:
    'group absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-slate-950/76 px-3.5 py-2 text-[0.72rem] font-semibold tracking-[0.08em] text-cyan-50/92 shadow-[0_20px_44px_-28px_rgba(8,145,178,0.5)] backdrop-blur-xl transition-[transform,border-color,background-color,color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-cyan-200/32 hover:bg-slate-900/82 hover:text-white hover:shadow-[0_24px_52px_-26px_rgba(34,211,238,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
  embedActionIcon:
    'h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
  embedFrame:
    'relative block aspect-square w-full rounded-[18px] border-0 bg-[#10161a] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.72)]',
  embedPlaceholder:
    'flex items-center justify-center overflow-hidden border border-white/6 bg-[linear-gradient(180deg,#0f171d_0%,#101921_52%,#0d141a_100%)] text-center',
  embedPlaceholderGlow:
    'pointer-events-none absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.16)_0%,rgba(34,211,238,0.06)_34%,rgba(34,211,238,0)_72%)] blur-3xl',
  embedPlaceholderGrid:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:20px_20px] opacity-40',
  embedPlaceholderLabel:
    'relative z-10 max-w-[18ch] px-6 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-cyan-100/62',
  cardFooter:
    'mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4',
  cardFootnote: 'text-xs leading-5 text-white/44',
  inlineLink:
    'inline-flex items-center gap-2 text-xs font-medium text-cyan-100/82 transition-colors duration-300 hover:text-cyan-50',
}
