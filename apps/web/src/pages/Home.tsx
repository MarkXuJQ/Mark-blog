import { lazy, useRef, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Footer } from '@/components/layout/Footer'
import { HomeRadarPlaceholder } from '@/components/home/HomeDeferredPlaceholders'
import { HomeBlogRailSection } from '@/components/home/HomeBlogRailSection'
import { HomeHeroSection } from '@/components/home/HomeHeroSection'
import { HomeWidgetStackSection } from '@/components/home/HomeWidgetStackSection'
import { useHomePageSceneMotion } from '@/hooks/useHomePageSceneMotion'
import { useHomePageRuntime } from '@/hooks/useHomePageRuntime'
import { useHomeReveal } from '@/hooks/useHomeReveal'
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

const LazyHomeRadarSection = lazy(() =>
  import('@/components/home/HomeRadarSection').then((module) => ({
    default: module.HomeRadarSection,
  }))
)

function HomeDeferredScenes({ avatarSrc }: { avatarSrc: string }) {
  const isPrerender =
    typeof window !== 'undefined' && Boolean(window.__PRERENDER__)
  const { targetRef: radarPlaceholderRef, shouldRender: shouldRenderRadar } =
    useDeferredRender<HTMLDivElement>({
      rootMargin: '640px 0px',
    })

  return (
    <>
      <div className="snap-start">
        <HomeWidgetStackSection />
      </div>
      {!isPrerender && shouldRenderRadar ? (
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
  useHomeReveal(pageRef, { prefersReducedMotion })

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

        <HomeDeferredScenes avatarSrc={avatarSrc} />

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
