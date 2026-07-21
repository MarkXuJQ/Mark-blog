import { lazy, useEffect, useRef, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Footer } from '@/components/layout/Footer'
import {
  HomeRadarPlaceholder,
  HomeWidgetStackPlaceholder,
} from '@/components/home/HomeDeferredPlaceholders'
import { HomeBlogRailSection } from '@/components/home/HomeBlogRailSection'
import { HomeHeroSection } from '@/components/home/HomeHeroSection'
import { useHomePageSceneMotion } from '@/hooks/useHomePageSceneMotion'
import { useHomePageRuntime } from '@/hooks/useHomePageRuntime'
import { useHomeGsapReveal } from '@/hooks/useHomeGsapReveal'
import { useHomeSectionPager } from '@/hooks/useHomeSectionPager'
import { Seo } from '@/app/seo/Seo'
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '@/lib/seo'
import { useDeferredRender } from '@/hooks/useDeferredRender'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { getImageUrl } from '@/lib/image'

const HOME_DEFERRED_PRELOAD_DELAY_MS = 2400
const HOME_CHUNK_PRELOAD_DELAY_MS = 2600
const HOME_CHUNK_PRELOAD_IDLE_TIMEOUT_MS = 3000
const HOME_CHUNK_PRELOAD_FALLBACK_DELAY_MS = 1000
const SLOW_NETWORK_TYPES = new Set(['slow-2g', '2g', '3g'])

type NetworkInformation = {
  effectiveType?: string
  saveData?: boolean
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation
}

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number }
  ) => number
  cancelIdleCallback?: (handle: number) => void
}

function useDeferredMount(enabled: boolean, delayMs: number) {
  const [isMounted, setIsMounted] = useState(() => !enabled)

  useEffect(() => {
    if (!enabled) {
      setIsMounted(false)
      return
    }

    setIsMounted(false)
    let timeoutHandle = 0
    let fallbackHandle = 0
    let idleHandle: number | null = null

    timeoutHandle = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => {
          setIsMounted(true)
        })
        return
      }

      fallbackHandle = window.setTimeout(() => {
        setIsMounted(true)
      }, 0)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutHandle)
      window.clearTimeout(fallbackHandle)
      if (
        idleHandle !== null &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleHandle)
      }
    }
  }, [delayMs, enabled])

  return isMounted
}

function useHomeChunkPreload() {
  useEffect(() => {
    if (window.__PRERENDER__) return

    const connection = (navigator as NavigatorWithConnection).connection
    if (
      connection?.saveData ||
      (connection?.effectiveType &&
        SLOW_NETWORK_TYPES.has(connection.effectiveType))
    ) {
      return
    }

    const idleWindow = window as IdleCapableWindow
    let idleHandle: number | null = null
    let preloadDelayHandle = 0
    let fallbackHandle = 0

    const preloadChunks = () => {
      void import('@/components/home/HomeWidgetStackSection')
      void import('@/components/home/HomeRadarSection')
    }

    const preloadWhenIdle = () => {
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(preloadChunks, {
          timeout: HOME_CHUNK_PRELOAD_IDLE_TIMEOUT_MS,
        })
        return
      }

      fallbackHandle = window.setTimeout(
        preloadChunks,
        HOME_CHUNK_PRELOAD_FALLBACK_DELAY_MS
      )
    }

    const schedulePreload = () => {
      preloadDelayHandle = window.setTimeout(
        preloadWhenIdle,
        HOME_CHUNK_PRELOAD_DELAY_MS
      )
    }

    if (document.readyState === 'complete') {
      schedulePreload()
    } else {
      window.addEventListener('load', schedulePreload, { once: true })
    }

    return () => {
      window.removeEventListener('load', schedulePreload)
      window.clearTimeout(preloadDelayHandle)
      window.clearTimeout(fallbackHandle)
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle)
      }
    }
  }, [])
}

const LazyHomeRadarSection = lazy(() =>
  import('@/components/home/HomeRadarSection').then((module) => ({
    default: module.HomeRadarSection,
  }))
)

const LazyHomeWidgetStackSection = lazy(() =>
  import('@/components/home/HomeWidgetStackSection').then((module) => ({
    default: module.HomeWidgetStackSection,
  }))
)

function HomeDeferredScenes({
  avatarSrc,
  isCoarsePointer,
}: {
  avatarSrc: string
  isCoarsePointer: boolean
}) {
  const isPrerender =
    typeof window !== 'undefined' && Boolean(window.__PRERENDER__)
  const shouldPreloadDeferredScenes = useDeferredMount(
    true,
    HOME_DEFERRED_PRELOAD_DELAY_MS
  )
  const {
    targetRef: widgetStackPlaceholderRef,
    shouldRender: shouldRenderWidgetStack,
  } = useDeferredRender<HTMLElement>({
    rootMargin: isCoarsePointer ? '260px 0px' : '720px 0px',
    initial: shouldPreloadDeferredScenes,
  })
  const { targetRef: radarPlaceholderRef, shouldRender: shouldRenderRadar } =
    useDeferredRender<HTMLDivElement>({
      rootMargin: isCoarsePointer ? '220px 0px' : '640px 0px',
      initial: shouldPreloadDeferredScenes,
    })

  if (isPrerender) {
    return (
      <>
        <HomeWidgetStackPlaceholder
          placeholderRef={widgetStackPlaceholderRef}
        />
        <HomeRadarPlaceholder placeholderRef={radarPlaceholderRef} />
      </>
    )
  }

  return (
    <>
      {shouldRenderWidgetStack ? (
        <Suspense fallback={<HomeWidgetStackPlaceholder />}>
          <div className="snap-start">
            <LazyHomeWidgetStackSection />
          </div>
        </Suspense>
      ) : (
        <HomeWidgetStackPlaceholder
          placeholderRef={widgetStackPlaceholderRef}
        />
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

export function Home() {
  const { t, i18n } = useTranslation()
  const pageRef = useRef<HTMLDivElement | null>(null)
  const isCoarsePointer = useIsCoarsePointer()
  const avatarSrc = getImageUrl('/images/avatar-384.webp')
  const compactAvatarSrc = getImageUrl('/images/avatar-96.webp')
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

  const { hero, blog, prefersReducedMotion } =
    useHomePageSceneMotion(isCoarsePointer)

  useHomeSectionPager({
    enabled: !isCoarsePointer,
    prefersReducedMotion,
  })
  useHomeGsapReveal(pageRef, { prefersReducedMotion })
  useHomeChunkPreload()

  return (
    <>
      <Seo jsonLd={webSiteSchema} />

      <div ref={pageRef}>
        <HomeHeroSection
          avatarSrc={avatarSrc}
          sceneProgress={hero.sceneProgress}
          isDarkMode={isDarkMode}
          prefersReducedMotion={prefersReducedMotion}
          isZh={isZh}
          heroScale={hero.scale}
          heroOpacity={hero.opacity}
          heroY={hero.y}
          heroShadow={hero.shadow}
          heroPointerEvents={hero.pointerEvents}
          heroMediaScale={hero.mediaScale}
          heroMediaY={hero.mediaY}
          heroContentOpacity={hero.contentOpacity}
          heroContentY={hero.contentY}
          handleNameClick={handleNameClick}
          handleNameKeyDown={handleNameKeyDown}
        />

        <HomeBlogRailSection
          avatarSrc={compactAvatarSrc}
          sectionScale={blog.scale}
          sectionY={blog.y}
          sectionOpacity={blog.opacity}
          sectionPointerEvents={blog.pointerEvents}
        />

        <HomeDeferredScenes
          avatarSrc={avatarSrc}
          isCoarsePointer={isCoarsePointer}
        />

        <div
          data-home-reveal="footer"
          className="relative z-20 mx-auto w-full max-w-3xl px-4 pb-8"
        >
          <Footer className="mt-0" />
        </div>
      </div>
    </>
  )
}
