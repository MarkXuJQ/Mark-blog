import { motion, type MotionValue } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { cn } from '../../utils/cn'
import { getImageUrl } from '../../utils/image'
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
  heroRadius: MotionValue<number>
  heroClipPath: MotionValue<string>
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
        className={styles.heroImage}
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  )
}

export function HomeHeroSection({
  avatarSrc,
  sceneProgress,
  isDarkMode,
  prefersReducedMotion,
  isZh,
  heroScale,
  heroOpacity,
  heroY,
  heroRadius,
  heroClipPath,
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

  return (
    <motion.section
      aria-label={isZh ? '首页封面' : 'Homepage cover'}
      className={styles.heroLayer}
      style={{
        scale: heroScale,
        opacity: heroOpacity,
        y: heroY,
        borderRadius: heroRadius,
        clipPath: heroClipPath,
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
        <div aria-hidden="true" className={styles.heroScrim} />
        <div aria-hidden="true" className={styles.heroFrame} />
        <div aria-hidden="true" className={styles.heroAura} />

        <motion.div
          className={styles.heroContent}
          style={{ opacity: heroContentOpacity, y: heroContentY }}
        >
          <div className={styles.heroContentInner}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>
                {isZh ? '个人主页 / Personal Hub' : 'Personal Hub'}
              </p>

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

              <div className={styles.heroActions}>
                <Link to="/blog" className={styles.primaryAction}>
                  {isZh ? '进入 Blog' : 'Enter the Blog'}
                </Link>
                <Link to="/about" className={styles.secondaryAction}>
                  {isZh ? '认识一下我' : 'Meet Mark'}
                </Link>
              </div>

              <div className={styles.heroFooter}>
                <div className={styles.decorativeContainer}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
              </div>
            </div>

            <div className={styles.heroVisualWrap}>
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
    'relative overflow-hidden origin-top will-change-transform [transform:translateZ(0)]',
  heroSection: 'relative min-h-[100vh] w-full overflow-hidden bg-slate-950',
  heroMedia: 'absolute inset-0',
  heroImage:
    'h-full w-full object-cover brightness-[0.78] saturate-[1.05] blur-[10px] scale-[1.08]',
  heroScrim:
    'absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,17,0.22)_0%,rgba(7,10,17,0.40)_48%,rgba(5,8,16,0.72)_100%)]',
  heroFrame:
    'pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12',
  heroAura:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(56,189,248,0.18),rgba(56,189,248,0)_32%),radial-gradient(circle_at_78%_24%,rgba(251,191,36,0.16),rgba(251,191,36,0)_28%),radial-gradient(circle_at_52%_78%,rgba(255,255,255,0.1),rgba(255,255,255,0)_36%)]',
  heroContent:
    'relative z-10 flex min-h-[100vh] items-center px-5 pt-28 pb-10 text-white sm:px-8 sm:pt-32 lg:px-10',
  heroContentInner:
    'mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.96fr)] lg:gap-12',
  heroCopy:
    'order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left',
  heroEyebrow:
    'hidden items-center rounded-full border border-white/18 bg-white/10 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/78 backdrop-blur-xl lg:inline-flex',
  title: cn(
    'mt-2 max-w-4xl text-center text-4xl font-semibold tracking-tight text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.35)] sm:text-6xl lg:mt-6 lg:text-left lg:text-7xl'
  ),
  highlightText: cn(
    'inline-block cursor-pointer bg-gradient-to-r from-amber-200 via-orange-200 to-amber-100 bg-clip-text text-transparent',
    'transition-transform duration-300 hover:-translate-y-1 hover:scale-105 hover:rotate-3'
  ),
  contentContainer:
    'mx-auto mt-6 max-w-2xl space-y-5 px-2 text-base font-medium leading-relaxed text-white/82 sm:text-lg lg:mx-0 lg:px-0',
  heroActions:
    'mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start',
  primaryAction:
    'inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.01]',
  secondaryAction:
    'inline-flex items-center rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/14',
  heroFooter: 'mt-10 hidden flex-col items-center gap-4 lg:flex lg:items-start',
  decorativeContainer: 'flex justify-center gap-2 opacity-70 lg:justify-start',
  dot: 'h-2 w-2 rounded-full bg-white/55',
  heroVisualWrap:
    'order-1 relative flex w-full items-center justify-center lg:order-2 lg:justify-end',
}
