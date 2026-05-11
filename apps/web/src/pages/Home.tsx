import {
  lazy,
  useRef,
  Suspense,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Footer } from '@/components/layout/Footer'
import {
  HomeRadarPlaceholder,
  HomeWidgetStackPlaceholder,
} from '@/components/home/HomeDeferredPlaceholders'
import { HomeBlogRailSection } from '@/components/home/HomeBlogRailSection'
import { HomeHeroSection } from '@/components/home/HomeHeroSection'
import { useHomePageSceneMotion } from '@/components/home/useHomePageSceneMotion'
import { useHomePageRuntime } from '@/components/home/useHomePageRuntime'
import { useHomeGsapReveal } from '@/components/home/useHomeGsapReveal'
import { useHomeSectionPager } from '@/components/home/useHomeSectionPager'
import { Seo } from '@/components/seo/Seo'
import {
  DEFAULT_DESCRIPTION,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '@/components/seo/shared'
import { useDeferredRender } from '@/hooks/useDeferredRender'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { getImageUrl } from '@/utils/image'

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
  const {
    targetRef: widgetStackPlaceholderRef,
    shouldRender: shouldRenderWidgetStack,
  } = useDeferredRender<HTMLElement>({
    rootMargin: isCoarsePointer ? '520px 0px' : '1600px 0px',
  })
  const { targetRef: radarPlaceholderRef, shouldRender: shouldRenderRadar } =
    useDeferredRender<HTMLDivElement>({
      rootMargin: isCoarsePointer ? '420px 0px' : '1400px 0px',
    })

  return (
    <>
      {shouldRenderWidgetStack ? (
        <Suspense fallback={<HomeWidgetStackPlaceholder />}>
          <div className="snap-start">
            <LazyHomeWidgetStackSection avatarSrc={avatarSrc} />
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

  const { hero, blog, prefersReducedMotion } =
    useHomePageSceneMotion(isCoarsePointer)

  useHomeSectionPager({
    enabled: !isCoarsePointer,
    prefersReducedMotion,
  })
  useHomeGsapReveal(pageRef, { prefersReducedMotion })

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
          avatarSrc={avatarSrc}
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
