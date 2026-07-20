import { motion, type MotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { VerticalCutReveal } from '../ui/vertical-cut-reveal'
import { TextRotate } from '../ui/text-rotate'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/utils/image'
import { HomeHeroAvatarScene } from './HomeHeroAvatarScene'

interface HomeHeroSectionProps {
  avatarSrc: string
  sceneProgress: MotionValue<number>
  isDarkMode: boolean
  prefersReducedMotion: boolean
  isZh: boolean
  heroScale: MotionValue<number>
  heroOpacity: MotionValue<number>
  heroY: MotionValue<number>
  heroShadow: MotionValue<string>
  heroPointerEvents: MotionValue<string>
  heroMediaScale: MotionValue<number>
  heroMediaY: MotionValue<number>
  heroContentOpacity: MotionValue<number>
  heroContentY: MotionValue<number>
  handleNameClick: () => void
  handleNameKeyDown: (event: React.KeyboardEvent<HTMLSpanElement>) => void
}

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

const HOME_BACKGROUND_SOURCES: Record<
  ThemeVariant,
  ResponsiveBackgroundSources
> = {
  day: DAY_SOURCES,
  night: NIGHT_SOURCES,
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
        className={cn(
          styles.heroImage,
          isDarkMode ? styles.heroImageNight : styles.heroImageDay
        )}
        decoding="async"
        loading="eager"
        fetchPriority="high"
      />
    </picture>
  )
}

const HERO_TITLE_REVEAL_TRANSITION = {
  type: 'spring',
  stiffness: 200,
  damping: 21,
} as const

const HERO_COPY_REVEAL_TRANSITION = {
  type: 'spring',
  stiffness: 210,
  damping: 26,
} as const

export function HomeHeroSection({
  avatarSrc,
  sceneProgress,
  isDarkMode,
  prefersReducedMotion,
  isZh,
  heroScale,
  heroOpacity,
  heroY,
  heroShadow,
  heroPointerEvents,
  heroMediaScale,
  heroMediaY,
  heroContentOpacity,
  heroContentY,
  handleNameClick,
  handleNameKeyDown,
}: HomeHeroSectionProps) {
  const { t } = useTranslation()
  const frameClass = isDarkMode ? styles.heroFrameNight : styles.heroFrameLight
  const auraClass = isDarkMode ? styles.heroAuraNight : styles.heroAuraLight
  const contentToneClass = isDarkMode
    ? styles.heroContentDark
    : styles.heroContentLight
  const titleClass = isDarkMode ? styles.titleDark : styles.titleLight
  const contentClass = isDarkMode
    ? styles.contentContainerDark
    : styles.contentContainerLight
  const dotClass = isDarkMode ? styles.dotDark : styles.dotLight
  const titlePrefix = isZh ? '欢迎来到' : 'Welcome to '
  const titlePossessive = isZh ? '' : "'s"
  const titleSuffixLead = isZh ? '的' : ''
  const titleMorphTexts = isZh
    ? ['自留地', '小屋', '小破站', '内陆帝国']
    : ['Backyard', 'little site', 'tiny nook', 'Inland Empire']
  const introText = t('home.intro')
  const descriptionText = t('home.description')
  const titleStagger = prefersReducedMotion ? 0 : 0.018
  const copyStagger = prefersReducedMotion ? 0 : 0.035

  return (
    <motion.section
      data-home-snap="hero"
      aria-label={isZh ? '首页封面' : 'Homepage cover'}
      className={styles.heroLayer}
      style={{
        scale: heroScale,
        opacity: heroOpacity,
        y: heroY,
        boxShadow: heroShadow,
        pointerEvents: heroPointerEvents,
      }}
    >
      <div className={styles.heroSection}>
        <motion.div
          aria-hidden="true"
          className={styles.heroMedia}
          style={{ scale: heroMediaScale, y: heroMediaY }}
        >
          <HomeHeroBackground isDarkMode={isDarkMode} />
        </motion.div>
        {isDarkMode ? (
          <>
            <div
              aria-hidden="true"
              className={cn(styles.heroFrame, frameClass)}
            />
            <div
              aria-hidden="true"
              className={cn(styles.heroAura, auraClass)}
            />
          </>
        ) : null}

        <motion.div
          className={cn(styles.heroContent, contentToneClass)}
          style={{ opacity: heroContentOpacity, y: heroContentY }}
        >
          <div className={styles.heroContentInner}>
            <div data-home-reveal="hero-copy" className={styles.heroCopy}>
              <h1
                className={cn(
                  styles.title,
                  titleClass,
                  'heading-brand',
                  'no-heading-letter-spacing'
                )}
              >
                <span className={styles.titleLine}>
                  <VerticalCutReveal
                    splitBy="characters"
                    staggerDuration={titleStagger}
                    staggerFrom="first"
                    transition={HERO_TITLE_REVEAL_TRANSITION}
                    containerClassName="inline-flex"
                  >
                    {titlePrefix}
                  </VerticalCutReveal>
                  {isZh ? <br /> : null}
                  <span className={styles.titleTailLine}>
                    <span className={styles.titleNameGroup}>
                      <span
                        className={styles.highlightText}
                        role="link"
                        tabIndex={0}
                        onClick={handleNameClick}
                        onKeyDown={handleNameKeyDown}
                      >
                        <VerticalCutReveal
                          splitBy="characters"
                          staggerDuration={titleStagger}
                          staggerFrom="center"
                          transition={{
                            ...HERO_TITLE_REVEAL_TRANSITION,
                            delay: prefersReducedMotion ? 0 : 0.22,
                          }}
                          containerClassName="inline-flex"
                          elementLevelClassName={styles.highlightGlyph}
                        >
                          Mark
                        </VerticalCutReveal>
                      </span>
                      {titlePossessive ? (
                        <VerticalCutReveal
                          splitBy="characters"
                          staggerDuration={titleStagger}
                          staggerFrom="last"
                          reverse
                          transition={{
                            ...HERO_TITLE_REVEAL_TRANSITION,
                            delay: prefersReducedMotion ? 0 : 0.34,
                          }}
                          containerClassName="inline-flex"
                        >
                          {titlePossessive}
                        </VerticalCutReveal>
                      ) : null}
                      {titlePossessive ? (
                        <span
                          aria-hidden="true"
                          className={styles.titleNameSpace}
                        >
                          {' '}
                        </span>
                      ) : null}
                    </span>
                    {titleSuffixLead ? (
                      <VerticalCutReveal
                        splitBy="characters"
                        staggerDuration={titleStagger}
                        staggerFrom="last"
                        reverse
                        transition={{
                          ...HERO_TITLE_REVEAL_TRANSITION,
                          delay: prefersReducedMotion ? 0 : 0.34,
                        }}
                        containerClassName="inline-flex"
                      >
                        {titleSuffixLead}
                      </VerticalCutReveal>
                    ) : null}
                    <span className={styles.titleRotateBadge}>
                      <TextRotate
                        texts={titleMorphTexts}
                        auto={!prefersReducedMotion}
                        rotationInterval={2300}
                        staggerFrom="last"
                        staggerDuration={0.018}
                        initial={{ y: '105%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-105%', opacity: 0 }}
                        transition={{
                          type: 'spring',
                          damping: 24,
                          stiffness: 360,
                          mass: 0.65,
                        }}
                        layoutTransition={{
                          type: 'tween',
                          duration: 0.46,
                          ease: [0.33, 1, 0.68, 1],
                        }}
                        mainClassName={styles.titleRotateWrap}
                        splitLevelClassName={styles.titleRotateSplit}
                        elementLevelClassName={styles.titleRotateGlyph}
                      />
                      <span
                        aria-hidden="true"
                        className={styles.titleRotateStar}
                      >
                        *
                      </span>
                    </span>
                  </span>
                </span>
              </h1>

              <div className={cn(styles.contentContainer, contentClass)}>
                <p>
                  <VerticalCutReveal
                    splitBy="words"
                    staggerDuration={copyStagger}
                    staggerFrom="first"
                    transition={{
                      ...HERO_COPY_REVEAL_TRANSITION,
                      delay: prefersReducedMotion ? 0 : 0.52,
                    }}
                    containerClassName="inline-flex"
                  >
                    {introText}
                  </VerticalCutReveal>
                </p>
                <p>
                  <VerticalCutReveal
                    splitBy="words"
                    staggerDuration={copyStagger}
                    staggerFrom="first"
                    reverse
                    transition={{
                      ...HERO_COPY_REVEAL_TRANSITION,
                      delay: prefersReducedMotion ? 0 : 0.68,
                    }}
                    containerClassName="inline-flex"
                  >
                    {descriptionText}
                  </VerticalCutReveal>
                </p>
              </div>

              <div className={styles.heroFooter}>
                <div className={styles.decorativeContainer}>
                  <div className={cn(styles.dot, dotClass)} />
                  <div className={cn(styles.dot, dotClass)} />
                  <div className={cn(styles.dot, dotClass)} />
                </div>
              </div>
            </div>

            <div
              data-home-reveal="hero-visual"
              data-home-reveal-delay={prefersReducedMotion ? undefined : 0.16}
              className={styles.heroVisualWrap}
            >
              <HomeHeroAvatarScene
                avatarSrc={avatarSrc}
                sceneProgress={sceneProgress}
                isDarkMode={isDarkMode}
                prefersReducedMotion={prefersReducedMotion}
                isZh={isZh}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}

const styles = {
  heroLayer:
    'relative h-[100vh] snap-start snap-always overflow-hidden origin-top will-change-transform [transform:translateZ(0)]',
  heroSection:
    'relative h-[100vh] w-full overflow-hidden bg-[var(--page-background)] transition-colors duration-300',
  heroMedia: 'absolute inset-0',
  heroImage: 'h-full w-full object-cover blur-[10px] scale-[1.08]',
  heroImageDay: 'brightness-[1.02] saturate-[1.01]',
  heroImageNight: 'brightness-[0.84] saturate-[1.04]',
  heroFrame: 'pointer-events-none absolute inset-0 ring-1 ring-inset',
  heroFrameLight: 'hidden',
  heroFrameNight: 'ring-white/12',
  heroAura: 'pointer-events-none absolute inset-0',
  heroAuraLight: 'hidden',
  heroAuraNight:
    'bg-[radial-gradient(circle_at_18%_28%,rgba(56,189,248,0.18),rgba(56,189,248,0)_32%),radial-gradient(circle_at_78%_24%,rgba(251,191,36,0.16),rgba(251,191,36,0)_28%),radial-gradient(circle_at_52%_78%,rgba(255,255,255,0.1),rgba(255,255,255,0)_36%)]',
  heroContent:
    'relative z-10 flex h-[100vh] items-center px-5 pt-28 pb-10 sm:px-8 sm:pt-32 lg:px-10',
  heroContentLight: 'text-black',
  heroContentDark: 'text-white',
  heroContentInner:
    'mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.96fr)] lg:gap-12',
  heroCopy:
    'order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left',
  title: cn(
    'mt-2 max-w-4xl text-center text-4xl font-semibold tracking-tight sm:text-6xl lg:mt-6 lg:text-left lg:text-7xl'
  ),
  titleLine: 'inline-block',
  titleTailLine:
    'inline-flex flex-wrap items-baseline justify-center lg:justify-start',
  titleNameGroup: 'inline-flex flex-nowrap items-baseline whitespace-nowrap',
  titleNameSpace: 'whitespace-pre',
  titleRotateBadge:
    'relative mx-[0.1em] inline-flex items-baseline align-baseline',
  titleRotateWrap:
    'inline-flex min-h-[1.12em] flex-nowrap items-center justify-center overflow-hidden whitespace-nowrap rounded-[0.18em] bg-[#ff5941] px-[0.25em] py-[0.07em] pr-[0.4em] align-baseline leading-none text-white shadow-[0_0.1em_0_rgba(190,55,34,0.28)]',
  titleRotateSplit: 'overflow-hidden pb-[0.03em]',
  titleRotateGlyph: 'leading-[0.98] text-white',
  titleRotateStar:
    'pointer-events-none absolute right-[0.18em] top-[0.14em] z-10 text-[0.42em] font-black leading-none text-white/95 drop-shadow-[0_1px_0_rgba(154,52,18,0.4)]',
  titleLight: 'text-black',
  titleDark: 'text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.35)]',
  highlightText: cn(
    'inline-flex cursor-pointer items-baseline',
    'transition-transform duration-300 hover:-translate-y-1 hover:scale-105 hover:rotate-3'
  ),
  highlightGlyph:
    'bg-gradient-to-r from-orange-500 via-orange-500 to-red-500 bg-clip-text text-transparent',
  contentContainer:
    'mx-auto mt-6 max-w-2xl space-y-5 px-2 text-base font-medium leading-relaxed sm:text-lg lg:mx-0 lg:px-0',
  contentContainerLight: 'text-black/80',
  contentContainerDark: 'text-white/80',
  heroFooter: 'mt-10 hidden flex-col items-center gap-4 lg:flex lg:items-start',
  decorativeContainer: 'flex justify-center gap-2 opacity-70 lg:justify-start',
  dot: 'h-2 w-2 rounded-full',
  dotLight: 'bg-black/26',
  dotDark: 'bg-white/55',
  heroVisualWrap:
    'order-1 relative flex w-full items-center justify-center lg:order-2 lg:justify-end',
}
