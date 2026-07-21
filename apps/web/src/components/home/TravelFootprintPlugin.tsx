import { useRef, useState } from 'react'
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
import { ExternalLink, MousePointer2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/classNames'
import { useDeferredRender } from '@/hooks/useDeferredRender'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
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
const CLOCK_PANEL_REVEAL_START = 0.4
const CLOCK_PANEL_REVEAL_END = 0.66
const EMBED_PANEL_REVEAL_START = 0.72
const EMBED_PANEL_REVEAL_END = 0.96

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

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function getLocationKeys(location: TravelLocationRecord) {
  return [location.label, location.name].filter((value): value is string =>
    Boolean(value?.trim())
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

export function TravelFootprintPlugin({
  revealProgress,
}: {
  revealProgress?: MotionValue<number>
}) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const prefersReducedMotion = useReducedMotion()
  const isCoarsePointer = useIsCoarsePointer()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const fallbackRevealProgress = useMotionValue(1)
  const pluginReveal = revealProgress ?? fallbackRevealProgress
  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ['start end', 'end start'],
  })
  const smoothedShellProgress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 220 : 110,
    damping: prefersReducedMotion ? 34 : 24,
    mass: 0.4,
  })
  const shellProgress =
    prefersReducedMotion || isCoarsePointer
      ? scrollYProgress
      : smoothedShellProgress

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

  return (
    <motion.div
      ref={shellRef}
      className={cn(styles.shell, styles.shellStatic)}
      style={{
        y: shellRevealY,
        scale: shellRevealScale,
      }}
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

      <div className={styles.grid}>
        <div className={styles.leftRail}>
          <TravelIntroHeader isZh={isZh} />

          <div
            className={cn(
              styles.leftWidgetStack,
              isZh && styles.leftWidgetStackZh
            )}
          >
            <p
              className={cn(
                styles.leftWidgetDescription,
                isZh && styles.leftWidgetDescriptionZh
              )}
            >
              {isZh
                ? '这里记录着我去过的国家、我的人生时间，和一个可以交互的地图，可以查看我所去过的地方。🌏✨'
                : 'Countries I have visited, the time I have lived, and an interactive map for the places I have been. 🌏✨'}
            </p>

            <TravelWorldOverviewPanel
              style={{
                y: worldReveal.y,
                opacity: worldReveal.opacity,
                scale: worldReveal.scale,
              }}
            />

            <TravelClockPanel
              style={{
                y: clockReveal.y,
                opacity: clockReveal.opacity,
                scale: clockReveal.scale,
              }}
            />
          </div>
        </div>

        <TravelFootprintMapPanel
          isZh={isZh}
          style={{
            y: embedReveal.y,
            opacity: embedReveal.opacity,
            scale: embedReveal.scale,
          }}
        />
      </div>
    </motion.div>
  )
}

function TravelIntroHeader({ isZh }: { isZh: boolean }) {
  return (
    <div className={styles.railIntroStage}>
      <div className={styles.introRow}>
        <div className={styles.introCopy}>
          <h2 className={cn('heading-display', styles.introTitle)}>
            {isZh ? '去过的地方' : "Places I've Been"}
          </h2>
        </div>
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
  )
}

function TravelWorldOverviewPanel({ style }: { style?: MotionStyle }) {
  return (
    <motion.section
      className={cn(styles.panel, styles.worldOverviewPanel)}
      style={style}
    >
      <TravelWorldMapPanel
        className={styles.worldOverviewMap}
        viewportClassName={styles.worldOverviewViewport}
        glowClassName={styles.worldOverviewGlow}
        baseClassName={styles.worldOverviewBase}
        highlightClassName={styles.worldOverviewHighlight}
      />
    </motion.section>
  )
}

function TravelWorldMapPanel({
  style,
  className,
  viewportClassName,
  glowClassName,
  showGlow = true,
  baseClassName,
  highlightClassName,
}: {
  style?: MotionStyle
  className?: string
  viewportClassName?: string
  glowClassName?: string
  showGlow?: boolean
  baseClassName?: string
  highlightClassName?: string
}) {
  return (
    <motion.div className={cn(styles.mapPanel, className)} style={style}>
      <div className={cn(styles.mapViewport, viewportClassName)}>
        {showGlow ? (
          <div className={cn(styles.mapGlow, glowClassName)} />
        ) : null}
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
  const [isMapInteractive, setIsMapInteractive] = useState(false)
  const { targetRef, shouldRender } = useDeferredRender<HTMLDivElement>({
    rootMargin: '320px 0px',
  })

  return (
    <motion.section
      className={cn(styles.panel, styles.embedPanel)}
      style={style}
    >
      <div
        ref={targetRef}
        className={cn(
          styles.embedViewport,
          isMapInteractive && styles.embedViewportInteractive
        )}
      >
        <div className={styles.mapActionOverlay}>
          <a
            href={FULL_MAP_URL}
            target="_blank"
            rel="noreferrer"
            className={styles.mapActionButton}
          >
            <ExternalLink className={styles.mapActionIcon} />
            <span>{isZh ? '打开完整地图' : 'Open full map'}</span>
          </a>
          <button
            type="button"
            aria-pressed={isMapInteractive}
            className={cn(
              styles.mapActionButton,
              isMapInteractive && styles.mapActionButtonActive
            )}
            onClick={() => setIsMapInteractive((current) => !current)}
          >
            <MousePointer2 className={styles.mapActionIcon} />
            <span>{isZh ? '进行交互' : 'Interact'}</span>
          </button>
        </div>
        {shouldRender ? (
          <>
            <iframe
              title={isZh ? '旅行地图交互窗口' : 'Interactive travel map'}
              src={EMBED_MAP_URL}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className={cn(
                styles.embedFrame,
                !isMapInteractive && styles.embedFrameLocked
              )}
            />
            {!isMapInteractive ? (
              <div aria-hidden="true" className={styles.embedInteractionVeil} />
            ) : null}
          </>
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

function TravelClockPanel({ style }: { style?: MotionStyle }) {
  return (
    <motion.section
      className={cn(styles.panel, styles.clockCell)}
      style={style}
    >
      <LifeSinceClock bare compact className={styles.clockPanel} />
    </motion.section>
  )
}

function SummaryPill({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.summaryPill}>
      <span className={styles.summaryPillValue}>{value}</span>
      <span className={styles.summaryPillLabel}>{label}</span>
    </div>
  )
}

const styles = {
  shell: 'relative mx-auto w-full max-w-[78rem] overflow-visible',
  shellStatic: 'cursor-default',
  railIntroStage: 'relative overflow-visible',
  introRow: 'relative z-[3] pt-0',
  introCopy: 'relative z-[3]',
  introTitle:
    'max-w-[12ch] text-3xl font-semibold leading-[0.98] text-white/94 text-balance drop-shadow-[0_18px_34px_rgba(5,9,19,0.48)] sm:text-[3.15rem] lg:text-[3.35rem]',
  introMeta:
    'relative z-[3] mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 sm:mt-5 sm:gap-x-6 lg:mt-4',
  summaryPill:
    'inline-flex items-baseline gap-2.5 border-l border-white/10 pl-4 text-white first:border-l-0 first:pl-0',
  summaryPillValue:
    'text-[1.15rem] font-semibold leading-none tabular-nums text-white/86',
  summaryPillLabel:
    'text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/40',
  ambientOrbit:
    'pointer-events-none absolute left-1/2 top-6 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.08)_28%,rgba(56,189,248,0)_68%)] blur-3xl',
  ambientOrbitSecondary:
    'pointer-events-none absolute right-[-2rem] top-[20rem] -z-10 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_30%,rgba(255,255,255,0)_70%)] blur-3xl',
  grid: 'relative grid items-start gap-5 pt-0 sm:gap-6 lg:grid-cols-[minmax(19.5rem,24.5rem)_minmax(0,1fr)] lg:items-stretch lg:gap-x-7 lg:gap-y-5',
  leftRail:
    'relative z-[3] flex min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:max-w-[28rem] xl:max-w-[30rem]',
  leftWidgetStack:
    'mt-8 flex min-w-0 flex-col gap-4 sm:mt-10 sm:gap-5 lg:mt-8 lg:w-[124%]',
  leftWidgetStackZh: 'lg:mt-[5.25rem]',
  leftWidgetDescription:
    'max-w-[34rem] text-sm font-medium leading-6 text-cyan-50/58 text-balance lg:max-w-[32rem]',
  leftWidgetDescriptionZh: 'lg:max-w-[28rem]',
  panel:
    'relative min-w-0 w-full overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,rgba(10,16,22,0.92)_0%,rgba(7,12,18,0.97)_100%)] p-4 text-white shadow-[0_34px_110px_-56px_rgba(2,6,23,0.86)] will-change-transform sm:p-5',
  worldOverviewPanel: 'self-start p-3 sm:p-4',
  worldOverviewMap:
    'relative w-full self-start brightness-[1.08] saturate-[1.12]',
  worldOverviewViewport: 'relative aspect-[2.22/1] w-full overflow-visible',
  worldOverviewGlow:
    'pointer-events-none absolute inset-[-10%_-7%_-16%] bg-[radial-gradient(circle_at_50%_52%,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.08)_36%,rgba(56,189,248,0)_74%)] blur-3xl',
  worldOverviewBase: 'absolute inset-0 h-full w-full object-contain opacity-30',
  worldOverviewHighlight:
    'absolute inset-0 h-full w-full object-contain opacity-100 drop-shadow-[0_0_54px_rgba(181,232,251,0.34)]',
  mapPanel: 'relative z-[2] w-full self-start',
  embedPanel:
    'z-[4] self-start p-2 sm:p-2.5 lg:col-start-2 lg:row-start-1 lg:ml-auto lg:h-full lg:w-[87%] lg:max-w-[44rem] lg:self-stretch',
  clockCell: 'w-full self-start will-change-transform p-3 sm:p-4',
  clockPanel: 'h-full w-full overflow-visible',
  mapActionOverlay:
    'absolute right-5 top-5 z-20 flex flex-wrap justify-end gap-2 sm:right-6 sm:top-6',
  mapActionButton:
    'group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950/64 px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_-22px_rgba(0,0,0,0.82)] backdrop-blur-md transition-[transform,color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-cyan-200/[0.12] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:translate-y-0.5',
  mapActionButtonActive:
    'translate-y-0.5 bg-cyan-300/[0.16] text-cyan-50 shadow-[inset_0_2px_8px_rgba(8,47,73,0.36),0_0_28px_rgba(34,211,238,0.14)] hover:translate-y-0.5',
  mapActionIcon:
    'h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-105',
  mapViewport:
    'relative aspect-[2.28/1] w-full overflow-visible sm:aspect-[2.42/1]',
  mapGlow:
    'pointer-events-none absolute inset-[-8%_-6%_-14%] bg-[radial-gradient(circle_at_50%_52%,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0.07)_32%,rgba(56,189,248,0)_72%)] blur-3xl',
  mapBase: 'absolute inset-0 h-full w-full object-contain opacity-38',
  mapHighlight:
    'absolute inset-0 h-full w-full object-contain opacity-100 drop-shadow-[0_0_32px_rgba(181,232,251,0.36)]',
  embedViewport:
    'relative overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#0d141a_0%,#091016_100%)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-2 lg:h-full',
  embedViewportInteractive:
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_36px_rgba(34,211,238,0.08)]',
  embedFrame:
    'relative block aspect-square w-full rounded-[20px] border-0 bg-[#10161a] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.78)] lg:h-full lg:aspect-auto',
  embedFrameLocked: 'pointer-events-none saturate-[0.92]',
  embedInteractionVeil:
    'absolute inset-2 rounded-[20px] bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0)_48%)]',
  embedPlaceholder:
    'flex items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#0f171d_0%,#101921_52%,#0d141a_100%)] text-center',
  embedPlaceholderGlow:
    'pointer-events-none absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.16)_0%,rgba(34,211,238,0.06)_34%,rgba(34,211,238,0)_72%)] blur-3xl',
  embedPlaceholderGrid:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:20px_20px] opacity-40',
  embedPlaceholderLabel:
    'relative z-10 max-w-[18ch] px-6 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-cyan-100/62',
}
