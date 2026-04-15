import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useTranslation, Trans } from 'react-i18next'
import { cn } from '../utils/cn'
import { getImageUrl } from '../utils/image'
import { Seo } from '../components/seo/Seo'
import { requestPageTransition } from '../components/transitions/pageTransitionBus'
import { TravelFootprintPlugin } from '../components/home/TravelFootprintPlugin'
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '../components/seo/shared'

interface ResponsiveBackgroundSources {
  avif: string
  webp: string
  fallback: string
}

type ThemeVariant = 'day' | 'night'

const DAY_SOURCES: ResponsiveBackgroundSources = {
  avif: [
    `${getImageUrl('/images/day-640.avif')} 640w`,
    `${getImageUrl('/images/day-960.avif')} 960w`,
    `${getImageUrl('/images/day-1280.avif')} 1280w`,
    `${getImageUrl('/images/day-1600.avif')} 1600w`,
    `${getImageUrl('/images/day-1633.avif')} 1633w`,
  ].join(', '),
  webp: [
    `${getImageUrl('/images/day-640.webp')} 640w`,
    `${getImageUrl('/images/day-960.webp')} 960w`,
    `${getImageUrl('/images/day-1280.webp')} 1280w`,
    `${getImageUrl('/images/day-1600.webp')} 1600w`,
    `${getImageUrl('/images/day-1633.webp')} 1633w`,
  ].join(', '),
  fallback: '/images/day.png',
}

const NIGHT_SOURCES: ResponsiveBackgroundSources = {
  avif: [
    `${getImageUrl('/images/night-640.avif')} 640w`,
    `${getImageUrl('/images/night-960.avif')} 960w`,
    `${getImageUrl('/images/night-1280.avif')} 1280w`,
    `${getImageUrl('/images/night-1392.avif')} 1392w`,
  ].join(', '),
  webp: [
    `${getImageUrl('/images/night-640.webp')} 640w`,
    `${getImageUrl('/images/night-960.webp')} 960w`,
    `${getImageUrl('/images/night-1280.webp')} 1280w`,
    `${getImageUrl('/images/night-1392.webp')} 1392w`,
  ].join(', '),
  fallback: '/images/night.png',
}

const HOME_BACKGROUND_SOURCES: Record<ThemeVariant, ResponsiveBackgroundSources> = {
  day: DAY_SOURCES,
  night: NIGHT_SOURCES,
}

function getInitialIsDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function useIsDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const syncTheme = () => {
      setIsDarkMode(root.classList.contains('dark'))
    }

    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return isDarkMode
}

function HomeHeroBackground({ isDarkMode }: { isDarkMode: boolean }) {
  const theme = isDarkMode ? 'night' : 'day'
  const sources = HOME_BACKGROUND_SOURCES[theme]

  return (
    <picture>
      <source type="image/avif" srcSet={sources.avif} sizes="100vw" />
      <source type="image/webp" srcSet={sources.webp} sizes="100vw" />
      <img
        src={getImageUrl(sources.fallback)}
        alt=""
        aria-hidden="true"
        className={styles.heroImage}
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  )
}

export function Home() {
  const { t, i18n } = useTranslation()
  const nameClickCountRef = useRef<number>(0)
  const lastNameClickMsRef = useRef<number>(0)
  const heroSceneRef = useRef<HTMLDivElement>(null)
  const isDarkMode = useIsDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const siteUrl = getSiteUrl()
  const isZh = i18n.language?.startsWith('zh')
  const language = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const webSiteSchema: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('siteTitle'),
    alternateName: "Mark's Backyard",
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    inLanguage: language,
    publisher: {
      '@type': 'Person',
      name: 'Mark Xu',
      url: siteUrl,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: toAbsoluteUrl('/blog?q={search_term_string}', siteUrl),
      'query-input': 'required name=search_term_string',
    },
  }

  const { scrollYProgress } = useScroll({
    target: heroSceneRef,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: prefersReducedMotion ? 260 : 180,
    damping: prefersReducedMotion ? 40 : 26,
    mass: 0.32,
  })

  const heroY = useTransform(
    smoothProgress,
    [0, 0.18, 0.55, 0.86],
    prefersReducedMotion ? [0, -6, -20, -46] : [0, -18, -78, -172]
  )
  const heroRotateX = useTransform(
    smoothProgress,
    [0, 0.24, 0.6, 0.86],
    prefersReducedMotion ? [0, 0, -3, -10] : [0, 0, -13, -46]
  )
  const heroScale = useTransform(
    smoothProgress,
    [0, 0.16, 0.6, 0.86],
    prefersReducedMotion ? [1, 1, 0.994, 0.985] : [1, 1.008, 0.968, 0.912]
  )
  const heroOpacity = useTransform(
    smoothProgress,
    [0, 0.62, 0.86, 1],
    [1, 1, prefersReducedMotion ? 0.38 : 0.14, 0]
  )
  const heroShadow = useTransform(
    smoothProgress,
    [0, 0.22, 0.86],
    [
      '0 24px 70px -34px rgba(15,23,42,0.56)',
      '0 44px 110px -52px rgba(15,23,42,0.64)',
      '0 66px 120px -76px rgba(15,23,42,0.16)',
    ]
  )
  const heroPointerEvents = useTransform(smoothProgress, (value) =>
    value > 0.8 ? 'none' : 'auto'
  )
  const heroContentOpacity = useTransform(smoothProgress, [0, 0.58, 0.84], [1, 1, 0.18])
  const heroContentY = useTransform(
    smoothProgress,
    [0, 0.84],
    [0, prefersReducedMotion ? -8 : -28]
  )
  const heroMediaScale = useTransform(
    smoothProgress,
    [0, 0.84],
    [1.06, prefersReducedMotion ? 1.08 : 1.12]
  )
  const heroMediaY = useTransform(
    smoothProgress,
    [0, 0.84],
    [0, prefersReducedMotion ? -8 : -18]
  )

  const handleNameClick = () => {
    const now = Date.now()
    const isWithinWindow = now - lastNameClickMsRef.current <= 600
    if (!isWithinWindow) {
      nameClickCountRef.current = 0
    }
    lastNameClickMsRef.current = now
    nameClickCountRef.current += 1

    if (nameClickCountRef.current >= 7) {
      nameClickCountRef.current = 0
      lastNameClickMsRef.current = 0
      requestPageTransition('/about')
    }
  }

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      requestPageTransition('/about')
    }
  }

  return (
    <div className={styles.page}>
      <Seo jsonLd={webSiteSchema} />

      <div ref={heroSceneRef} className={styles.heroScene}>
        <div className={styles.heroSticky}>
          <motion.section
            className={styles.heroBoard}
            style={{
              y: heroY,
              rotateX: heroRotateX,
              scale: heroScale,
              opacity: heroOpacity,
              boxShadow: heroShadow,
              pointerEvents: heroPointerEvents,
            }}
          >
            <motion.div
              aria-hidden="true"
              className={styles.heroMedia}
              style={{ scale: heroMediaScale, y: heroMediaY }}
            >
              <HomeHeroBackground isDarkMode={isDarkMode} />
            </motion.div>
            <div aria-hidden="true" className={styles.heroFog} />
            <div aria-hidden="true" className={styles.heroScrim} />
            <div aria-hidden="true" className={styles.heroFrame} />

            <motion.div
              className={styles.heroContent}
              style={{ opacity: heroContentOpacity, y: heroContentY }}
            >
              <div className={styles.avatarContainer}>
                <img
                  src={getImageUrl('/images/IMG_1766.JPG')}
                  alt="Mark's Blog Logo"
                  width={160}
                  height={160}
                  decoding="async"
                  fetchPriority="high"
                  className={styles.avatar}
                />
              </div>

              <h1 className={cn(styles.title, 'no-heading-letter-spacing')}>
                {isZh ? (
                  <>
                    <span className="block sm:hidden">欢迎来到</span>
                    <span className="block sm:hidden">
                      <span
                        className={styles.highlightText}
                        role="link"
                        tabIndex={0}
                        onClick={handleNameClick}
                        onKeyDown={handleNameKeyDown}
                      >
                        Mark
                      </span>
                      的自留地
                    </span>
                    <span className="hidden sm:inline">
                      <Trans
                        i18nKey="home.title"
                        components={[
                          <span
                            key="0"
                            className={styles.highlightText}
                            role="link"
                            tabIndex={0}
                            onClick={handleNameClick}
                            onKeyDown={handleNameKeyDown}
                          />,
                        ]}
                      />
                    </span>
                  </>
                ) : (
                  <Trans
                    i18nKey="home.title"
                    components={[
                      <span
                        key="0"
                        className={styles.highlightText}
                        role="link"
                        tabIndex={0}
                        onClick={handleNameClick}
                        onKeyDown={handleNameKeyDown}
                      />,
                    ]}
                  />
                )}
              </h1>

              <div className={styles.contentContainer}>
                <p>{t('home.intro')}</p>
                <p>{t('home.description')}</p>
              </div>

              <div className={styles.heroFooter}>
                <div className={styles.decorativeContainer}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
                <p className={styles.scrollHint}>
                  {isZh ? '继续下滑，向上翻开首页' : 'Keep scrolling to fold the homepage upward'}
                </p>
              </div>
            </motion.div>
          </motion.section>
        </div>
      </div>

      <section className={styles.travelSection}>
        <div className={styles.travelSectionInner}>
          <div className={styles.travelSectionHeader}>
            <div className={styles.travelCopy}>
              <p className={styles.travelEyebrow}>
                {isZh ? '下一页' : 'Next frame'}
              </p>
              <h2 className={styles.travelTitle}>
                {isZh ? '旅行地图' : 'Travel Map'}
              </h2>
              <p className={styles.travelDescription}>
                {isZh
                  ? '这一页只留给旅行地图，让去过与将去的地方成为真正的视觉主角。'
                  : 'This page is reserved for the travel map, so places I have visited and places I still want to reach stay in focus.'}
              </p>
            </div>
          </div>

          <TravelFootprintPlugin />
        </div>
      </section>
    </div>
  )
}

const styles = {
  page: 'relative overflow-x-clip animate-in fade-in zoom-in-95 duration-1000',
  heroScene: 'relative min-h-[138svh]',
  heroSticky: 'sticky top-0 h-[100svh] min-h-[100svh]',
  heroBoard: cn(
    'relative h-full origin-top overflow-hidden bg-slate-950',
    'will-change-transform [transform-style:preserve-3d]'
  ),
  heroMedia: 'absolute inset-0',
  heroImage:
    'h-full w-full object-cover brightness-[0.78] saturate-[1.05] blur-[10px] scale-[1.08]',
  heroFog:
    'absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_24%,rgba(255,255,255,0)_48%)]',
  heroScrim:
    'absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,17,0.22)_0%,rgba(7,10,17,0.40)_48%,rgba(5,8,16,0.72)_100%)]',
  heroFrame: 'pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12',
  heroContent:
    'relative z-10 flex h-full flex-col items-center justify-center px-5 pt-28 pb-10 text-center text-white sm:px-8 sm:pt-32 lg:px-10',
  avatarContainer: 'mb-8 flex justify-center',
  avatar: cn(
    'h-24 w-24 rounded-full border border-white/55 shadow-[0_18px_36px_-20px_rgba(15,23,42,0.95)] sm:h-28 sm:w-28',
    'transition-transform duration-500 hover:scale-105 hover:rotate-3'
  ),
  title: cn(
    'text-center text-4xl font-semibold tracking-tight text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.35)] sm:text-6xl'
  ),
  highlightText: cn(
    'inline-block cursor-pointer bg-gradient-to-r from-amber-200 via-orange-200 to-amber-100 bg-clip-text text-transparent',
    'transition-transform duration-300 hover:-translate-y-1 hover:scale-105 hover:rotate-3'
  ),
  contentContainer:
    'mx-auto mt-6 max-w-2xl space-y-5 px-2 text-base font-medium leading-relaxed text-white/82 sm:text-lg',
  heroFooter: 'mt-10 flex flex-col items-center gap-4',
  decorativeContainer: 'flex justify-center gap-2 opacity-70',
  dot: 'h-2 w-2 rounded-full bg-white/55',
  scrollHint:
    'text-center text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/76',
  travelSection: cn(
    'relative z-10 -mt-[22svh] flex min-h-[100svh] items-end overflow-hidden pb-10 pt-[24svh]',
    'bg-[linear-gradient(180deg,rgba(238,241,244,0.78)_0%,rgba(229,233,237,0.96)_16%,rgba(225,230,235,1)_100%)]',
    'dark:bg-[linear-gradient(180deg,rgba(15,18,23,0.78)_0%,rgba(13,16,20,0.96)_16%,rgba(10,13,18,1)_100%)]'
  ),
  travelSectionInner: 'mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8',
  travelSectionHeader: 'grid gap-6',
  travelCopy: 'max-w-3xl text-left',
  travelEyebrow:
    'text-xs font-semibold uppercase tracking-[0.32em] text-slate-500/85 dark:text-slate-400/85',
  travelTitle: cn(
    'mt-4 max-w-4xl text-left text-3xl leading-tight text-slate-900 dark:text-white sm:text-5xl'
  ),
  travelDescription:
    'mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base',
}
