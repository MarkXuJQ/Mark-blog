import type { MarkdownPost } from '../types'

export interface MovieReview {
  slug: string
  title: string
  date: string
  summary: string
  movieSubjectId: string
  movieTitle?: string
  rating?: number
  tags?: string[]
  content: string
}

interface MarkdownMovieReview extends MarkdownPost {
  attributes: MarkdownPost['attributes'] & {
    movieSubjectId?: string
    movieTitle?: string
    rating?: number
  }
}

const markdownFiles = import.meta.glob<MarkdownMovieReview>(
  '@content/movies/reviews/*.md',
  { eager: true },
)

let __cachedReviews: MovieReview[] | null = null

function toReview(path: string, module: MarkdownMovieReview): MovieReview | null {
  const slug = path.split('/').pop()?.replace('.md', '') || ''
  if (!slug) return null

  const { attributes, html } = module
  const title = String(attributes.title || '').trim()
  const date = String(attributes.date || '').trim()
  const summary = String(attributes.summary || '').trim()
  const movieSubjectId = String(attributes.movieSubjectId || '').trim()

  if (!title || !date || !movieSubjectId) {
    return null
  }

  return {
    slug,
    title,
    date,
    summary,
    movieSubjectId,
    movieTitle: String(attributes.movieTitle || '').trim() || undefined,
    rating:
      typeof attributes.rating === 'number' && Number.isFinite(attributes.rating)
        ? attributes.rating
        : undefined,
    tags: Array.isArray(attributes.tags)
      ? attributes.tags.map((tag) => String(tag))
      : undefined,
    content: html,
  }
}

export function getAllMovieReviews(): MovieReview[] {
  if (__cachedReviews) return __cachedReviews

  __cachedReviews = Object.entries(markdownFiles)
    .map(([path, module]) => toReview(path, module))
    .filter((review): review is MovieReview => Boolean(review))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return __cachedReviews
}

export function getMovieReviewBySlug(slug: string): MovieReview | undefined {
  return getAllMovieReviews().find((review) => review.slug === slug)
}

export function getMovieReviewBySubjectId(
  subjectId: string
): MovieReview | undefined {
  if (!subjectId) return undefined
  return getAllMovieReviews().find((review) => review.movieSubjectId === subjectId)
}

