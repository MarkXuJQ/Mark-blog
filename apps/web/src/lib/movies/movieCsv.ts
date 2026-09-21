import {
  getMovieReviewBySlug,
  getMovieReviewBySubjectId,
} from '@/lib/content/movieReviews'
import { DEFAULT_PLATFORM } from './movieConstants'
import type { CsvMovieItem, MovieOverride } from './movieTypes'
import { toTimestamp } from './movieUtils'

function normalizeCsvHeader(header: string) {
  return header.replace(/^\uFEFF/, '').trim()
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      field = ''
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      continue
    }

    field += char
  }

  row.push(field)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

function splitMovieTitle(rawTitle: string) {
  const normalized = rawTitle.replace(/\s+/g, ' ').trim()
  if (!normalized) return { title: '', originalTitle: '' }

  const parts = normalized
    .split(' / ')
    .map((part) => part.trim())
    .filter(Boolean)

  return parts.length > 1
    ? { title: parts[0], originalTitle: parts.slice(1).join(' / ') }
    : { title: normalized, originalTitle: '' }
}

function parseSubjectId(link: string) {
  return link.match(/\/subject\/(\d+)\//)?.[1] ?? ''
}

function parseRating(input: string) {
  const rating = Number.parseInt(input, 10)
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null
}

function parseTmdbId(input: number | string | undefined) {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    return Math.round(input)
  }

  if (typeof input === 'string') {
    const parsed = Number.parseInt(input, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
}

export function buildCsvMovies(
  rawCsv: string,
  overrides: Record<string, MovieOverride>
): CsvMovieItem[] {
  const rows = parseCsvRows(rawCsv.replace(/^\uFEFF/, ''))
  if (rows.length === 0) return []

  const headers = rows[0].map(normalizeCsvHeader)
  const indexes = {
    title: Math.max(0, headers.indexOf('片名')),
    rating: Math.max(1, headers.indexOf('个人评分')),
    date: Math.max(2, headers.indexOf('打分日期')),
    link: Math.max(3, headers.indexOf('影片链接')),
  }

  return rows
    .slice(1)
    .flatMap((row, rowOffset) => {
      const rowNumber = rowOffset + 1
      const rawTitle = (row[indexes.title] ?? '').trim()
      if (!rawTitle || rawTitle.startsWith('删除')) return []

      const rawRating = (row[indexes.rating] ?? '').trim()
      const rawDate = (row[indexes.date] ?? '').trim()
      const rawLink = (row[indexes.link] ?? '').trim().replace(/,$/, '')
      const subjectId = parseSubjectId(rawLink)
      const override =
        overrides[subjectId] ||
        overrides[rawLink] ||
        overrides[rawTitle] ||
        overrides[`row-${rowNumber}`] ||
        {}
      const { title, originalTitle } = splitMovieTitle(rawTitle)
      const linkedReview = subjectId
        ? getMovieReviewBySubjectId(subjectId)
        : undefined
      const reviewSlug = (
        override.reviewSlug ||
        linkedReview?.slug ||
        ''
      ).trim()
      const review = reviewSlug ? getMovieReviewBySlug(reviewSlug) : undefined

      return [
        {
          id: subjectId ? `${subjectId}-${rowNumber}` : `row-${rowNumber}`,
          subjectId,
          title,
          originalTitle,
          link: rawLink,
          watchDate: rawDate,
          rating: parseRating(rawRating),
          platform: (override.platform || DEFAULT_PLATFORM).trim(),
          note: (override.note || '').trim(),
          tmdbId: parseTmdbId(override.tmdbId),
          tmdbQuery: (override.tmdbQuery || '').trim(),
          reviewSlug,
          reviewSummary: (
            review?.summary ||
            linkedReview?.summary ||
            ''
          ).trim(),
        } satisfies CsvMovieItem,
      ]
    })
    .sort((a, b) => {
      const timeDifference = toTimestamp(b.watchDate) - toTimestamp(a.watchDate)
      return timeDifference || a.id.localeCompare(b.id)
    })
}
