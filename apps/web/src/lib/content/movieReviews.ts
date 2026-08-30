import type { MarkdownPost } from './markdown'
import { countWords, normalizeCountableText } from './readingTime'
import type { BlogPost } from './posts'

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
  { eager: true }
)

let cachedReviews: MovieReview[] | null = null
let cachedBlogPosts: BlogPost[] | null = null

const MOVIE_REVIEW_BLOG_CATEGORY = 'Experience'
const REVIEW_SUMMARY_MAX_LENGTH = 140

function buildReviewSummary(content: string): string {
  const paragraphs = content.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [content]
  const normalized =
    paragraphs
      .map((paragraph) => normalizeCountableText(paragraph))
      .find(
        (paragraph) =>
          paragraph.length > 0 &&
          !/^(?:版权归作者所有|作者[:：]|来源[:：]|https?:\/\/)/i.test(
            paragraph
          )
      ) ?? normalizeCountableText(content)

  if (normalized.length <= REVIEW_SUMMARY_MAX_LENGTH) return normalized

  return `${normalized.slice(0, REVIEW_SUMMARY_MAX_LENGTH).trimEnd()}…`
}

function toReview(
  path: string,
  module: MarkdownMovieReview
): MovieReview | null {
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
    summary: summary || buildReviewSummary(html),
    movieSubjectId,
    movieTitle: String(attributes.movieTitle || '').trim() || undefined,
    rating:
      typeof attributes.rating === 'number' &&
      Number.isFinite(attributes.rating)
        ? attributes.rating
        : undefined,
    tags: Array.isArray(attributes.tags)
      ? attributes.tags.map((tag) => String(tag))
      : undefined,
    content: html,
  }
}

export function getAllMovieReviews(): MovieReview[] {
  if (cachedReviews) return cachedReviews

  cachedReviews = Object.entries(markdownFiles)
    .map(([path, module]) => toReview(path, module))
    .filter((review): review is MovieReview => Boolean(review))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return cachedReviews
}

export function getMovieReviewBySlug(slug: string): MovieReview | undefined {
  return getAllMovieReviews().find((review) => review.slug === slug)
}

export function getMovieReviewBySubjectId(
  subjectId: string
): MovieReview | undefined {
  if (!subjectId) return undefined
  return getAllMovieReviews().find(
    (review) => review.movieSubjectId === subjectId
  )
}

function toMovieReviewBlogPost(review: MovieReview): BlogPost {
  return {
    id: review.slug,
    title: review.title,
    slug: review.slug,
    sourceSlug: review.slug,
    date: review.date,
    summary: review.summary,
    wordCount: countWords(review.content),
    tags: review.tags,
    category: MOVIE_REVIEW_BLOG_CATEGORY,
    content: review.content,
  }
}

export function getAllMovieReviewBlogPosts(): BlogPost[] {
  if (cachedBlogPosts) return cachedBlogPosts

  cachedBlogPosts = getAllMovieReviews().map(toMovieReviewBlogPost)
  return cachedBlogPosts
}
