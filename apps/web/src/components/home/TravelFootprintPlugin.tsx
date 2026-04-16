import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
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
import { Clock3, ExternalLink, Globe2, MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
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
const EMBED_PANEL_REVEAL_START = 0.4
const EMBED_PANEL_REVEAL_END = 0.66
const CLOCK_PANEL_REVEAL_START = 0.72
const CLOCK_PANEL_REVEAL_END = 0.96

interface TravelLocationRecord {
  type?: string
  name?: string
  label?: string
}

interface TravelJourneyRecord {
  date?: string
  locations?: TravelLocationRecord[]
}

interface TravelRecord {
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

function getUniqueLabels(locations: TravelLocationRecord[], type: string) {
  return new Set(
    locations
      .filter((location) => location.type === type)
      .map((location) => location.label ?? location.name)
      .filter((value): value is string => Boolean(value))
  ).size
}

function normalizeJourneyDate(value?: string | null) {
  if (!value) return null
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return null
}

function summarizeTravelRecord(record: TravelRecord) {
  const journeys = record.journeys ?? []
  const locations = journeys.flatMap((journey) => journey.locations ?? [])
  const normalizedDates = journeys
    .map((journey) => normalizeJourneyDate(journey.date))
    .filter((value): value is string => Boolean(value))
    .sort()

  return {
    journeyCount: journeys.length,
    cityCount: getUniqueLabels(locations, 'city'),
    countryCount: getUniqueLabels(locations, 'country'),
    latestDate: normalizedDates.at(-1) ?? null,
  }
}

const travelSummary = summarizeTravelRecord(markTravelRecord as TravelRecord)

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
  const locale = isZh ? 'zh-CN' : 'en-US'
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
  const latestJourneyLabel = useMemo(() => {
    if (!travelSummary.latestDate) return null

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${travelSummary.latestDate}T00:00:00`))
  }, [locale])

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

      <div className={styles.introRow}>
        <div className={styles.introCopy}>
          <p className={styles.introEyebrow}>
            {isZh ? '旅行足迹 / Travel footprint' : 'Travel footprint / Atlas'}
          </p>
          <h2 className={styles.introTitle}>
            {isZh
              ? '把去过的地方压缩成一张会发光的旅行总览'
              : 'Compressing visited places into a luminous travel overview'}
          </h2>
          <p className={styles.introDescription}>
            {isZh
              ? '这一屏把静态国家地图、可交互足迹图和人生时钟放到同一个叙事里。先看整体，再看路径，最后落到时间本身。'
              : 'This scene folds a static atlas, a live route map, and a life clock into one narrative: overview first, routes second, time last.'}
          </p>
        </div>

        <div className={styles.summaryRack}>
          <SummaryChip
            value={travelSummary.journeyCount}
            label={isZh ? '段旅程' : 'Journeys'}
          />
          <SummaryChip
            value={travelSummary.cityCount}
            label={isZh ? '座城市' : 'Cities'}
          />
          <SummaryChip
            value={travelSummary.countryCount}
            label={isZh ? '个国家' : 'Countries'}
          />
          {latestJourneyLabel ? (
            <div className={styles.summaryMeta}>
              <span className={styles.summaryMetaLabel}>
                {isZh ? '最近更新' : 'Latest entry'}
              </span>
              <span className={styles.summaryMetaValue}>{latestJourneyLabel}</span>
            </div>
          ) : null}
          <a
            href={FULL_MAP_URL}
            target="_blank"
            rel="noreferrer"
            className={styles.summaryLink}
          >
            <span>{isZh ? '打开完整地图' : 'Open full map'}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <motion.div className={styles.grid} style={{ y: gridY }}>
        <TravelWorldMapPanel
          isZh={isZh}
          cityCount={travelSummary.cityCount}
          countryCount={travelSummary.countryCount}
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
          latestJourneyLabel={latestJourneyLabel}
          style={{
            x: embedX,
            y: embedRevealY,
            rotate: embedRotate,
            opacity: embedReveal.opacity,
            scale: embedReveal.scale,
          }}
        />

        <TravelClockPanel
          isZh={isZh}
          latestJourneyLabel={latestJourneyLabel}
          style={{
            x: clockX,
            y: clockRevealY,
            rotate: clockRotate,
            opacity: clockReveal.opacity,
            scale: clockReveal.scale,
          }}
        />
      </motion.div>
    </motion.div>
  )
}

function TravelWorldMapPanel({
  isZh,
  cityCount,
  countryCount,
  style,
}: {
  isZh: boolean
  cityCount: number
  countryCount: number
  style?: MotionStyle
}) {
  return (
    <motion.section
      {...hoverLift}
      className={cn(styles.panel, styles.mapPanel)}
      style={style}
    >
      <div className={styles.panelHeaderSplit}>
        <div className={styles.cardHeader}>
          <div className={cn(styles.cardIconWrap, 'mt-0')}>
            <Globe2 className="h-4 w-4" />
          </div>
          <div className={styles.cardCopy}>
            <p className={styles.cardEyebrow}>
              {isZh ? '静态总览' : 'Atlas view'}
            </p>
            <p className={styles.cardTitle}>
              {isZh
                ? '先用国家视角看一眼更大的移动范围'
                : 'Start with the country-scale shape of movement'}
            </p>
          </div>
        </div>
        <div className={styles.metricCluster}>
          <span className={styles.metricPill}>
            {countryCount} {isZh ? '个国家' : 'countries'}
          </span>
          <span className={styles.metricPillMuted}>
            {cityCount} {isZh ? '座城市' : 'cities'}
          </span>
        </div>
      </div>
      <p className={styles.cardDescription}>
        {isZh
          ? '这张图把去过的国家高亮出来，适合先快速抓到旅行范围，再往下看更细的足迹路径。'
          : 'This static atlas highlights visited countries first, making it easier to read the broader footprint before diving into the denser route map.'}
      </p>

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
  latestJourneyLabel,
  style,
}: {
  isZh: boolean
  latestJourneyLabel: string | null
  style?: MotionStyle
}) {
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
              {isZh ? '把路线放回真实地理里查看' : 'Inspect routes in live geography'}
            </p>
          </div>
        </div>
        <div className={styles.metricCluster}>
          <span className={styles.metricPillMuted}>
            {latestJourneyLabel
              ? isZh
                ? `更新于 ${latestJourneyLabel}`
                : `Updated ${latestJourneyLabel}`
              : isZh
                ? '持续记录中'
                : 'Still expanding'}
          </span>
        </div>
      </div>
      <p className={styles.cardDescription}>
        {isZh
          ? '这里保留了缩放和拖拽能力，可以更细致地看每一段路径是怎么在地图上连起来的。'
          : 'This view keeps zoom and pan intact, so the smaller route connections remain explorable instead of becoming a static thumbnail.'}
      </p>

      <div className={styles.embedViewport}>
        <iframe
          title={isZh ? '旅行地图交互窗口' : 'Interactive travel map'}
          src={EMBED_MAP_URL}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className={styles.embedFrame}
        />
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardFootnote}>
          {isZh ? '更适合放大查看局部路线' : 'Best used for zooming into local routes'}
        </span>
        <a
          href={FULL_MAP_URL}
          target="_blank"
          rel="noreferrer"
          className={styles.inlineLink}
        >
          <span>{isZh ? '新窗口打开' : 'Open separately'}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.section>
  )
}

function TravelClockPanel({
  isZh,
  latestJourneyLabel,
  style,
}: {
  isZh: boolean
  latestJourneyLabel: string | null
  style?: MotionStyle
}) {
  return (
    <motion.section
      {...hoverLift}
      className={cn(styles.panel, styles.clockCell)}
      style={style}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIconWrap}>
          <Clock3 className="h-4 w-4" />
        </div>
        <div className={styles.cardCopy}>
          <p className={styles.cardEyebrow}>{isZh ? '时间侧记' : 'Time layer'}</p>
          <p className={styles.cardTitle}>
            {isZh
              ? '把旅途放回更长的人生计时器里'
              : 'Set each route against a longer life timer'}
          </p>
        </div>
      </div>
      <p className={styles.cardDescription}>
        {isZh
          ? '旅行不是独立事件，而是不断累积在时间上的偏移。这个时钟负责把“去过哪里”变成“走到了什么阶段”。'
          : 'Trips are not isolated moments. This clock reframes “where I have been” as part of a much longer progression through time.'}
      </p>
      <div className={styles.clockStage}>
        <LifeSinceClock compact bare className={styles.clockPanel} />
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.cardFootnote}>
          {latestJourneyLabel
            ? isZh
              ? `最近一次路线记录：${latestJourneyLabel}`
              : `Latest route entry: ${latestJourneyLabel}`
            : isZh
              ? '旅行记录持续更新中'
              : 'Travel log is still growing'}
        </span>
      </div>
    </motion.section>
  )
}

function SummaryChip({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div className={styles.summaryChip}>
      <span className={styles.summaryValue}>{value}</span>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  )
}

const styles = {
  shell: 'relative mx-auto w-full max-w-[78rem] overflow-visible',
  shellReady: 'cursor-grab',
  shellDragging: 'cursor-grabbing',
  shellStatic: 'cursor-default',
  introRow:
    'mb-8 flex flex-col gap-5 sm:mb-10 lg:mb-12 lg:flex-row lg:items-end lg:justify-between',
  introCopy: 'max-w-3xl',
  introEyebrow:
    'font-[var(--font-pixel)] text-[0.72rem] uppercase tracking-[0.28em] text-cyan-100/70',
  introTitle:
    'mt-3 max-w-[18ch] text-3xl font-semibold leading-[1.02] text-white text-balance sm:text-[3.35rem] lg:text-[4rem]',
  introDescription:
    'mt-4 max-w-[42rem] text-sm leading-7 text-white/64 sm:text-[0.98rem]',
  summaryRack:
    'flex flex-wrap items-stretch gap-3 lg:max-w-[26rem] lg:justify-end',
  summaryChip:
    'inline-flex min-w-[7.2rem] flex-col rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-3 text-white backdrop-blur-xl',
  summaryValue: 'text-[1.35rem] font-semibold leading-none text-white',
  summaryLabel:
    'mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/48',
  summaryMeta:
    'inline-flex min-w-[10.5rem] flex-col rounded-[22px] border border-white/10 bg-white/[0.045] px-4 py-3 text-white backdrop-blur-xl',
  summaryMetaLabel:
    'text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/48',
  summaryMetaValue: 'mt-2 text-sm font-medium text-white/82',
  summaryLink:
    'inline-flex items-center gap-2 rounded-[22px] border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-3 text-sm font-medium text-cyan-50 transition-colors duration-300 hover:bg-cyan-300/[0.14]',
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
  clockStage:
    'mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-[#05100b] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  clockPanel: 'h-full',
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
  cardFooter:
    'mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4',
  cardFootnote: 'text-xs leading-5 text-white/44',
  inlineLink:
    'inline-flex items-center gap-2 text-xs font-medium text-cyan-100/82 transition-colors duration-300 hover:text-cyan-50',
}
