import {
  useEffect,
  lazy,
  useRef,
  Suspense,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import { useLenis } from 'lenis/react'
import { useTranslation } from 'react-i18next'
import { getImageUrl } from '../utils/image'
import { Seo } from '../components/seo/Seo'
import { Footer } from '../components/layout/Footer'
import { requestPageTransition } from '../components/transitions/pageTransitionBus'
import { HomeHeroSection } from '../components/home/HomeHeroSection'
import { HomeBlogRailSection } from '../components/home/HomeBlogRailSection'
import { HomeMeteorAvatar } from '../components/home/HomeMeteorAvatar'
import { useHomePageSceneMotion } from '../components/home/useHomePageSceneMotion'
import { useDeferredRender } from '../hooks/useDeferredRender'
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '../components/seo/shared'

const LazyHomeRadarSection = lazy(() =>
  import('../components/home/HomeRadarSection').then((module) => ({
    default: module.HomeRadarSection,
  }))
)

const LazyHomeWidgetStackSection = lazy(() =>
  import('../components/home/HomeWidgetStackSection').then((module) => ({
    default: module.HomeWidgetStackSection,
  }))
)

const HOME_WIDGET_STACK_PLACEHOLDER_MIN_HEIGHT = '320svh'
const HOME_WIDGET_STACK_PLACEHOLDER_MARGIN_TOP = '-160svh'

function HomeWidgetStackPlaceholder({
  placeholderRef,
}: {
  placeholderRef?: RefObject<HTMLElement | null>
}) {
  return (
    <section
      ref={placeholderRef}
      aria-hidden="true"
      className="relative z-20 isolate"
      style={{
        minHeight: HOME_WIDGET_STACK_PLACEHOLDER_MIN_HEIGHT,
        marginTop: HOME_WIDGET_STACK_PLACEHOLDER_MARGIN_TOP,
      }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="relative h-full">
          <div className="absolute inset-[-14px] z-0 overflow-hidden bg-[linear-gradient(180deg,#050913_0%,#060c17_24%,#07101c_56%,#091522_100%)]">
            <div className="pointer-events-none absolute left-[-10rem] top-[8rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl" />
            <div className="pointer-events-none absolute bottom-[4rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.14)_0%,rgba(251,191,36,0.04)_30%,rgba(251,191,36,0)_74%)] blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_0px,transparent_1px)] [background-size:22px_22px] opacity-30" />
          </div>

          <div className="relative z-10 h-full">
            <div className="mx-auto h-full w-full max-w-[96rem] overflow-hidden px-4 sm:px-6 lg:px-8">
              <div className="relative min-h-full pt-[14svh] pb-[20svh] sm:pt-[16svh] sm:pb-[22svh] lg:pt-[18svh] lg:pb-[24svh]">
                <div className="relative w-full">
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(88vw,48rem)] w-[min(88vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/7" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(68vw,36rem)] w-[min(68vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HomeRadarPlaceholder({
  placeholderRef,
}: {
  placeholderRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={placeholderRef}
      aria-hidden="true"
      className="relative isolate z-[30] min-h-[100svh] overflow-hidden"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(6,182,212,0.1)_0%,rgba(6,182,212,0.04)_26%,rgba(6,182,212,0)_58%),radial-gradient(circle_at_80%_72%,rgba(249,115,22,0.08)_0%,rgba(249,115,22,0.03)_28%,rgba(249,115,22,0)_56%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.05)_0px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_0px,transparent_1px)] [background-size:24px_24px]" />
    </div>
  )
}

function HomeDeferredScenes({ avatarSrc }: { avatarSrc: string }) {
  const {
    targetRef: widgetStackPlaceholderRef,
    shouldRender: shouldRenderWidgetStack,
  } = useDeferredRender<HTMLElement>({
    rootMargin: '1600px 0px',
  })
  const {
    targetRef: radarPlaceholderRef,
    shouldRender: shouldRenderRadar,
  } = useDeferredRender<HTMLDivElement>({
    rootMargin: '1400px 0px',
  })

  return (
    <>
      {shouldRenderWidgetStack ? (
        <Suspense fallback={<HomeWidgetStackPlaceholder />}>
          <LazyHomeWidgetStackSection avatarSrc={avatarSrc} />
        </Suspense>
      ) : (
        <HomeWidgetStackPlaceholder placeholderRef={widgetStackPlaceholderRef} />
      )}
      {shouldRenderRadar ? (
        <Suspense fallback={<HomeRadarPlaceholder />}>
          <LazyHomeRadarSection avatarSrc={avatarSrc} />
        </Suspense>
      ) : (
        <HomeRadarPlaceholder placeholderRef={radarPlaceholderRef} />
      )}
    </>
  )
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

function useLenisPageResize(pageRef: RefObject<HTMLDivElement | null>) {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return

    const pageNode = pageRef.current
    let frameId = 0

    const scheduleResize = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        lenis.resize()
      })
    }

    scheduleResize()
    window.addEventListener('load', scheduleResize)

    if (!pageNode || typeof ResizeObserver === 'undefined') {
      return () => {
        cancelAnimationFrame(frameId)
        window.removeEventListener('load', scheduleResize)
      }
    }

    const observer = new ResizeObserver(scheduleResize)
    observer.observe(pageNode)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('load', scheduleResize)
    }
  }, [lenis, pageRef])
}

function useHomePageRuntime(pageRef: RefObject<HTMLDivElement | null>) {
  const isDarkMode = useIsDarkMode()
  const nameClickCountRef = useRef(0)
  const lastNameClickMsRef = useRef(0)

  useLenisPageResize(pageRef)

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

  const handleNameKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      requestPageTransition('/about')
    }
  }

  return {
    handleNameClick,
    handleNameKeyDown,
    isDarkMode,
  }
}

export function Home() {
  const { t, i18n } = useTranslation()
  const pageRef = useRef<HTMLDivElement | null>(null)
  const avatarSrc = getImageUrl('/images/IMG_1766.JPG')
  const siteUrl = getSiteUrl()
  const isZh = i18n.language?.startsWith('zh')
  const { handleNameClick, handleNameKeyDown, isDarkMode } =
    useHomePageRuntime(pageRef)
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

  const {
    heroClipPath,
    heroContentOpacity,
    heroContentY,
    heroFilter,
    heroMediaScale,
    heroMediaY,
    heroOpacity,
    heroPointerEvents,
    heroRadius,
    heroScale,
    heroSceneProgress,
    heroShadow,
    heroY,
    pageProgress,
    prefersReducedMotion,
    widgetFilter,
    widgetOpacity,
    widgetPointerEvents,
    widgetScale,
    widgetY,
  } = useHomePageSceneMotion({ pageRef })

  return (
    <>
      <Seo jsonLd={webSiteSchema} />

      <div ref={pageRef}>
        <HomeMeteorAvatar
          avatarSrc={avatarSrc}
          pageProgress={pageProgress}
          heroSceneProgress={heroSceneProgress}
          isDarkMode={isDarkMode}
          prefersReducedMotion={prefersReducedMotion}
        />

        <HomeHeroSection
          avatarSrc={avatarSrc}
          sceneProgress={heroSceneProgress}
          isDarkMode={isDarkMode}
          prefersReducedMotion={prefersReducedMotion}
          isZh={isZh}
          heroScale={heroScale}
          heroOpacity={heroOpacity}
          heroY={heroY}
          heroRadius={heroRadius}
          heroClipPath={heroClipPath}
          heroShadow={heroShadow}
          heroFilter={heroFilter}
          heroPointerEvents={heroPointerEvents}
          heroMediaScale={heroMediaScale}
          heroMediaY={heroMediaY}
          heroContentOpacity={heroContentOpacity}
          heroContentY={heroContentY}
          handleNameClick={handleNameClick}
          handleNameKeyDown={handleNameKeyDown}
        />

        <HomeBlogRailSection
          avatarSrc={avatarSrc}
          sectionScale={widgetScale}
          sectionY={widgetY}
          sectionOpacity={widgetOpacity}
          sectionFilter={widgetFilter}
          sectionPointerEvents={widgetPointerEvents}
        />

        <HomeDeferredScenes avatarSrc={avatarSrc} />

        <div className="relative z-20 mx-auto w-full max-w-3xl px-4 pb-8">
          <Footer className="mt-0" />
        </div>
      </div>
    </>
  )
}
