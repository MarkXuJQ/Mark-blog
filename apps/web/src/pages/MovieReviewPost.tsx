import { useMemo, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { Calendar, Star } from 'lucide-react'
import { Seo } from '@/app/seo/Seo'
import { Card } from '@/components/ui/Card'
import { decorateArticleContent } from '@/lib/article/decorateArticleContent'
import { getMovieReviewBySlug } from '@/lib/content/movieReviews'
import { cn } from '@/lib/classNames'
import { useArticleImageLightbox } from '@/hooks/useArticleImageLightbox'
import { useArticleProgressiveImages } from '@/hooks/useArticleProgressiveImages'
import { getImageUrl } from '@/lib/image'
import { SharedTransitionFrame } from '@/components/transitions/SharedTransitionFrame'
import { getPostSharedTransitionIds } from '@/lib/transitions/postSharedTransition'
import { getBlogNavigationState } from '@/lib/blog/blogNavigation'

export function MovieReviewPost() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const review = slug ? getMovieReviewBySlug(slug) : undefined
  const contentHtml = useMemo(() => {
    if (!review) {
      return ''
    }

    return decorateArticleContent(review.content, i18n.language)
  }, [i18n.language, review])
  const contentRef = useArticleImageLightbox([contentHtml])
  useArticleProgressiveImages(contentRef, [contentHtml])

  if (!review) {
    return (
      <div className="mx-auto max-w-4xl">
        <Seo title="Review Not Found" noindex />
        <Card>
          <div className={styles.notFoundContainer}>
            <h1 className={styles.notFoundTitle}>
              {t('movies.reviews.notFoundTitle')}
            </h1>
            <Link to="/movies" className={styles.notFoundLink}>
              {t('movies.reviews.backToMovies')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }
  const pageTitle = `${review.title} | ${t('movies.reviews.pageTitle')}`
  const coverImage = review.image ? getImageUrl(review.image) : ''
  const backgroundImage = review.background
    ? getImageUrl(review.background)
    : ''
  const navigationState = getBlogNavigationState(location.state)
  const cameFromBlogList = Boolean(navigationState.fromBlogList)
  const transitionPostSlug = navigationState.transitionPostSlug
  const returnTo = navigationState.returnTo
  const viewState = navigationState.viewState
  const { coverLayoutId, titleLayoutId, metaLayoutId } =
    getPostSharedTransitionIds(
      review.slug,
      cameFromBlogList &&
        transitionPostSlug === review.slug &&
        prefersReducedMotion !== true
    )
  const backPath = cameFromBlogList ? '/blog' : '/movies'
  const backLabel = t(
    cameFromBlogList ? 'blog.back' : 'movies.reviews.backToMovies'
  )
  const handleBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      !cameFromBlogList ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    navigate(returnTo ?? '/blog', {
      replace: true,
      state: {
        preserveScroll: true,
        transitionPostSlug: transitionPostSlug ?? review.slug,
        viewState,
      },
    })
  }

  return (
    <div className={styles.page}>
      {backgroundImage ? (
        <div aria-hidden="true" className={styles.background}>
          <img
            src={backgroundImage}
            alt=""
            className={styles.backgroundImage}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
          />
          <div className={styles.backgroundTint} />
          <div className={styles.backgroundFade} />
        </div>
      ) : null}

      <div className={styles.content}>
        <Seo
          title={pageTitle}
          description={review.summary}
          image={coverImage || undefined}
          type="article"
        />

        <Card
          className={cn(
            styles.card,
            coverImage ? 'overflow-hidden p-0 sm:p-0' : ''
          )}
        >
          {coverImage ? (
            <>
              <section className={styles.cover}>
                <SharedTransitionFrame
                  layoutId={coverLayoutId}
                  className="absolute inset-0 overflow-hidden rounded-none"
                >
                  <img
                    src={coverImage}
                    alt={review.movieTitle || review.title}
                    className={styles.coverImage}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </SharedTransitionFrame>
                {review.imageOverlay ? (
                  <div className={styles.imageOverlay} aria-hidden="true" />
                ) : null}
                <div className={styles.coverOverlay} aria-hidden="true" />

                <Link
                  to={backPath}
                  onClick={handleBack}
                  className={styles.coverBackLink}
                >
                  ← {backLabel}
                </Link>

                <header className={styles.coverHeader}>
                  <SharedTransitionFrame
                    layoutId={titleLayoutId}
                    className="overflow-hidden rounded-none"
                  >
                    <h1 className={styles.coverTitle}>{review.title}</h1>
                  </SharedTransitionFrame>
                  <SharedTransitionFrame
                    layoutId={metaLayoutId}
                    className="mt-4 overflow-hidden rounded-xl"
                  >
                    <ReviewMeta review={review} inverse />
                  </SharedTransitionFrame>
                </header>
              </section>

              <article className={cn(styles.article, styles.coverArticle)}>
                <div
                  ref={contentRef}
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              </article>
            </>
          ) : (
            <article className={styles.article}>
              <Link
                to={backPath}
                onClick={handleBack}
                className={styles.backLink}
              >
                ← {backLabel}
              </Link>

              <SharedTransitionFrame
                layoutId={titleLayoutId}
                className="overflow-hidden rounded-none"
              >
                <h1 className={styles.title}>{review.title}</h1>
              </SharedTransitionFrame>
              <SharedTransitionFrame
                layoutId={metaLayoutId}
                className="overflow-hidden rounded-xl"
              >
                <ReviewMeta review={review} />
              </SharedTransitionFrame>

              <div
                ref={contentRef}
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </article>
          )}
        </Card>
      </div>
    </div>
  )
}

function ReviewMeta({
  review,
  inverse = false,
}: {
  review: NonNullable<ReturnType<typeof getMovieReviewBySlug>>
  inverse?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        styles.metaContainer,
        inverse && 'text-white/90 drop-shadow-[0_2px_12px_rgba(15,23,42,0.58)]'
      )}
    >
      <div className={styles.iconText}>
        <Calendar className="h-4 w-4" />
        <time dateTime={review.date}>{review.date}</time>
      </div>
      {review.movieTitle ? (
        <span
          className={cn(
            styles.movieTitleTag,
            inverse &&
              'border-white/18 bg-white/12 text-white/90 backdrop-blur dark:border-white/18 dark:bg-white/12 dark:text-white/90'
          )}
        >
          {review.movieTitle}
        </span>
      ) : null}
      {typeof review.rating === 'number' ? (
        <span className={styles.iconText}>
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {t('movies.rating.value', { rating: review.rating })}
        </span>
      ) : null}
    </div>
  )
}

const styles = {
  page: 'relative isolate min-h-full w-full overflow-hidden pt-28 pb-8',
  background:
    'pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden',
  backgroundImage: 'block h-auto w-full saturate-[0.82]',
  backgroundTint:
    'absolute inset-0 bg-[var(--page-background)] opacity-18 dark:opacity-28',
  backgroundFade:
    'absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--page-background)_32%,transparent)_0%,transparent_38%,var(--page-background)_100%)]',
  content: 'relative z-10 mx-auto w-full max-w-4xl px-4',
  card: 'block w-full border border-slate-200/70 bg-white/84 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.42)] dark:border-[#2b2f36] dark:bg-[#17191c]/88 dark:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.72)]',
  notFoundContainer: 'flex flex-col items-center justify-center py-12',
  notFoundTitle: 'mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100',
  notFoundLink: 'text-blue-600 hover:underline dark:text-blue-400',
  backLink: cn(
    'mb-6 inline-flex items-center text-sm font-medium transition-colors',
    'text-slate-500 hover:text-slate-800',
    'dark:text-slate-400 dark:hover:text-slate-200'
  ),
  cover: 'relative isolate min-h-[22rem] overflow-hidden sm:min-h-[26rem]',
  coverImage: 'absolute inset-0 h-full w-full object-cover object-center',
  imageOverlay: 'pointer-events-none absolute inset-0 bg-black/35',
  coverOverlay:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.16)_0%,rgba(2,6,23,0.06)_34%,rgba(2,6,23,0.78)_100%)]',
  coverBackLink:
    'absolute top-5 left-5 z-10 inline-flex w-fit items-center rounded-full border border-white/18 bg-black/18 px-3 py-1.5 text-sm font-medium text-white/95 shadow-sm backdrop-blur transition-colors hover:bg-black/28 sm:top-8 sm:left-8',
  coverHeader:
    'absolute right-5 bottom-5 left-5 z-10 sm:right-8 sm:bottom-8 sm:left-8',
  coverTitle:
    'm-0 max-w-3xl text-3xl font-medium tracking-tight text-white drop-shadow-[0_2px_18px_rgba(15,23,42,0.45)] sm:text-4xl md:text-5xl',
  coverArticle: 'px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6',
  article: cn(
    'article-rich prose prose-slate dark:prose-invert max-w-none',
    'prose-a:text-blue-600 hover:prose-a:text-blue-500',
    'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
    'prose-a:no-underline'
  ),
  title:
    'mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100',
  metaContainer:
    'mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400',
  iconText: 'inline-flex items-center gap-1',
  movieTitleTag:
    'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}
