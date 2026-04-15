import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import worldFootprintBaseSvg from '../../assets/travel/world-footprint-base.svg'
import worldFootprintHighlightSvg from '../../assets/travel/world-footprint-highlight.svg'

const EMBED_MAP_URL = 'https://travel.markxu.icu/?embed=1&bare=1&baseMap=liberty'
const FULL_MAP_URL = 'https://travel.markxu.icu'

export function TravelFootprintPlugin() {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')

  return (
    <div className={styles.shell}>
      <div className={styles.shellGlow} />

      <div className={styles.grid}>
        <section className={styles.ledPanel}>
          <div className={styles.ledGlow} />
          <div className={styles.ledFrame}>
            <img
              alt=""
              aria-hidden="true"
              src={worldFootprintBaseSvg}
              className={styles.ledBase}
            />
            <img
              alt={isZh ? '已去过国家高亮世界地图' : 'Highlighted visited countries map'}
              src={worldFootprintHighlightSvg}
              className={styles.ledHighlight}
            />
          </div>
        </section>

        <section className={styles.embedPanel}>
          <div className={styles.embedGlow} />
          <div className={styles.embedViewport}>
            <div className={styles.embedOverlay}>
              <a href={FULL_MAP_URL} className={styles.primaryAction}>
                {isZh ? '查看完整地图' : 'Open full map'}
              </a>
            </div>

            <iframe
              title={isZh ? '旅行地图交互窗口' : 'Interactive travel map'}
              src={EMBED_MAP_URL}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className={styles.embedFrame}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

const styles = {
  shell: cn(
    'relative isolate overflow-hidden rounded-[34px] border border-white/55 bg-[#12171b] p-4 shadow-[0_32px_90px_-44px_rgba(15,23,42,0.58)]',
    'dark:border-white/10'
  ),
  shellGlow:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(181,232,251,0.14)_0%,rgba(181,232,251,0)_46%)]',
  grid: 'relative grid gap-4 xl:grid-cols-[minmax(23rem,1.14fr)_minmax(18rem,0.9fr)] xl:items-stretch',
  ledPanel: 'order-2 relative overflow-hidden rounded-[24px] border border-white/10 bg-[#171d21] p-3 sm:p-4 xl:order-1 xl:rounded-[28px]',
  ledGlow:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px)] [background-size:18px_18px]',
  ledFrame: 'relative aspect-[2.45/1] min-h-[8.5rem] sm:aspect-[2.7/1] sm:min-h-[10rem] md:min-h-[11rem] xl:h-full xl:min-h-0 xl:aspect-auto',
  ledBase: 'absolute inset-0 h-full w-full object-contain opacity-58',
  ledHighlight:
    'absolute inset-0 h-full w-full object-contain opacity-100 drop-shadow-[0_0_22px_rgba(181,232,251,0.34)]',
  embedPanel:
    'order-1 relative overflow-hidden rounded-[24px] border border-white/10 bg-[#10161a] p-2 xl:order-2 xl:rounded-[28px]',
  embedGlow:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(181,232,251,0.1)_0%,rgba(181,232,251,0)_58%)]',
  embedViewport: 'relative h-full overflow-hidden rounded-[20px] sm:rounded-[22px]',
  embedOverlay:
    'pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-end sm:inset-x-4 sm:top-4',
  embedFrame:
    'relative aspect-square w-full rounded-[20px] border-0 bg-[#10161a] min-[420px]:min-h-[22rem] sm:rounded-[22px] sm:min-h-[28rem] xl:h-full xl:min-h-0',
  primaryAction: cn(
    'pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/15 bg-slate-950/68 px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.95)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-slate-950/80'
  ),
}
