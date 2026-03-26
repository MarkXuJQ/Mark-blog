import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Star } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Seo } from '../components/seo/Seo'
import { cn } from '../utils/cn'
import { getMovieReviewBySlug } from '../utils/movieReviews'
import { rewriteHtmlImageSrc } from '../utils/image'

export function MovieReviewPost() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const review = slug ? getMovieReviewBySlug(slug) : undefined

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

  const contentHtml = rewriteHtmlImageSrc(review.content)
  const pageTitle = `${review.title} | ${t('movies.reviews.pageTitle')}`

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Seo title={pageTitle} description={review.summary} />

      <Card className="block w-full">
        <Link to="/movies" className={styles.backLink}>
          ← {t('movies.reviews.backToMovies')}
        </Link>

        <article className={styles.article}>
          <h1 className={styles.title}>{review.title}</h1>

          <div className={styles.metaContainer}>
            <div className={styles.iconText}>
              <Calendar className="h-4 w-4" />
              <time dateTime={review.date}>{review.date}</time>
            </div>
            {review.movieTitle ? (
              <span className={styles.movieTitleTag}>{review.movieTitle}</span>
            ) : null}
            {typeof review.rating === 'number' ? (
              <span className={styles.iconText}>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {t('movies.rating.value', { rating: review.rating })}
              </span>
            ) : null}
          </div>

          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </article>
      </Card>
    </div>
  )
}

const styles = {
  notFoundContainer: 'flex flex-col items-center justify-center py-12',
  notFoundTitle: 'mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100',
  notFoundLink: 'text-blue-600 hover:underline dark:text-blue-400',
  backLink: cn(
    'mb-6 inline-flex items-center text-sm font-medium transition-colors',
    'text-slate-500 hover:text-slate-800',
    'dark:text-slate-400 dark:hover:text-slate-200'
  ),
  article: cn(
    'prose prose-slate dark:prose-invert max-w-none',
    'prose-a:text-blue-600 hover:prose-a:text-blue-500',
    'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
    'prose-a:no-underline hover:prose-a:underline'
  ),
  title:
    'mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100',
  metaContainer:
    'mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400',
  iconText: 'inline-flex items-center gap-1',
  movieTitleTag:
    'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

