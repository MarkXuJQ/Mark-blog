import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useLenis } from 'lenis/react'
import { useTranslation } from 'react-i18next'
import { getImageUrl } from '../utils/image'
import { Seo } from '../components/seo/Seo'
import { Footer } from '../components/layout/Footer'
import { requestPageTransition } from '../components/transitions/pageTransitionBus'
import { HomeHeroSection } from '../components/home/HomeHeroSection'
import { HomeWidgetStackSection } from '../components/home/HomeWidgetStackSection'
import { HomeRadarSection } from '../components/home/HomeRadarSection'
import { HomeBlogRailSection } from '../components/home/HomeBlogRailSection'
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '../components/seo/shared'

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

export function Home() {
  const { t, i18n } = useTranslation()
  const nameClickCountRef = useRef<number>(0)
  const lastNameClickMsRef = useRef<number>(0)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const isDarkMode = useIsDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const lenis = useLenis()
  const avatarSrc = getImageUrl('/images/IMG_1766.JPG')
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

  const { scrollY } = useScroll()

  const sceneProgressSource = useTransform(
    scrollY,
    [0, prefersReducedMotion ? 960 : 1320],
    [0, 1]
  )

  const sceneProgress = useSpring(sceneProgressSource, {
    stiffness: prefersReducedMotion ? 240 : 160,
    damping: prefersReducedMotion ? 36 : 24,
    mass: 0.3,
  })

  const heroScale = useTransform(
    sceneProgress,
    [0, 0.12, 0.34, 0.58],
    prefersReducedMotion ? [1, 0.997, 0.992, 0.988] : [1, 0.988, 0.9, 0.78]
  )
  const heroOpacity = useTransform(
    sceneProgress,
    [0, 0.24, 0.44, 0.6],
    prefersReducedMotion ? [1, 1, 0.96, 0.9] : [1, 1, 0.54, 0.12]
  )
  const heroY = useTransform(
    sceneProgress,
    [0, 0.14, 0.38, 0.62],
    prefersReducedMotion ? [0, -3, -10, -18] : [0, -18, -132, -228]
  )
  const heroRadius = useTransform(sceneProgress, [0, 1], [0, 0])
  const heroClipPath = useTransform(
    sceneProgress,
    [0, 1],
    ['inset(0% 0% 0% 0% round 0px)', 'inset(0% 0% 0% 0% round 0px)']
  )
  const heroPointerEvents = useTransform(sceneProgress, (value) =>
    value > 0.44 ? 'none' : 'auto'
  ) as MotionValue<string>
  const heroShadow = useTransform(
    sceneProgress,
    [0, 0.2, 0.42, 0.6],
    [
      '0 24px 70px -34px rgba(15,23,42,0.56)',
      '0 52px 128px -56px rgba(15,23,42,0.66)',
      '0 46px 96px -62px rgba(15,23,42,0.14)',
      '0 20px 42px -34px rgba(15,23,42,0.04)',
    ]
  )
  const heroFilter = useTransform(
    sceneProgress,
    [0, 0.18, 0.36, 0.56],
    prefersReducedMotion
      ? ['blur(0px)', 'blur(0px)', 'blur(1px)', 'blur(2px)']
      : ['blur(0px)', 'blur(0px)', 'blur(6px)', 'blur(14px)']
  )
  const heroContentOpacity = useTransform(
    sceneProgress,
    [0, 0.18, 0.38, 0.54],
    prefersReducedMotion ? [1, 1, 0.96, 0.9] : [1, 1, 0.44, 0]
  )
  const heroContentY = useTransform(
    sceneProgress,
    [0, 0.18, 0.46],
    prefersReducedMotion ? [0, -6, -10] : [0, -14, -58]
  )
  const heroMediaScale = useTransform(
    sceneProgress,
    [0, 0.22, 0.5],
    prefersReducedMotion ? [1.02, 1.03, 1.04] : [1.02, 1.08, 1.18]
  )
  const heroMediaY = useTransform(
    sceneProgress,
    [0, 0.22, 0.5],
    prefersReducedMotion ? [0, -4, -8] : [0, -16, -42]
  )

  const widgetScale = useTransform(
    sceneProgress,
    [0.04, 0.18, 0.42, 0.66],
    prefersReducedMotion ? [1.003, 1.002, 1.001, 1] : [1.06, 1.03, 1.008, 1]
  )
  const widgetY = useTransform(
    sceneProgress,
    [0.02, 0.22, 0.46, 0.66],
    prefersReducedMotion ? [8, 3, 0, -2] : [72, 26, 0, -6]
  )
  const widgetOpacity = useTransform(
    sceneProgress,
    [0.02, 0.16, 0.38, 0.56],
    prefersReducedMotion ? [0.92, 0.96, 0.99, 1] : [0.18, 0.4, 0.82, 1]
  )
  const widgetFilter = useTransform(
    sceneProgress,
    [0.02, 0.22, 0.44, 0.6],
    prefersReducedMotion
      ? ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)']
      : ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)']
  )
  const widgetPointerEvents = useTransform(sceneProgress, (value) =>
    value > 0.18 ? 'auto' : 'none'
  ) as MotionValue<string>

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
  }, [lenis])

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

  return (
    <>
      <Seo jsonLd={webSiteSchema} />

      <div ref={pageRef}>
        <HomeHeroSection
          avatarSrc={avatarSrc}
          sceneProgress={sceneProgress}
          isDarkMode={isDarkMode}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
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
        <HomeWidgetStackSection />
        <HomeRadarSection avatarSrc={avatarSrc} />

        <div className="relative z-20 mx-auto w-full max-w-3xl px-4 pb-8">
          <Footer className="mt-0" />
        </div>
      </div>
    </>
  )
}
