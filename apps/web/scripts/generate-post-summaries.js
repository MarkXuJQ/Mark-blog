import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { fileURLToPath } from 'node:url'
import {
  countWords,
  normalizeCountableText,
} from '../src/lib/content/readingTime.js'
import { collectMarkdownFiles, collectPostMarkdownFiles } from './post-files.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const MOVIE_REVIEWS_DIR = path.resolve(
  __dirname,
  '../../../content/movies/reviews'
)
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/post-summaries.json')
const MOVIE_REVIEW_SUMMARY_MAX_LENGTH = 140

function resolveLanguageFromPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/')
  if (normalized.includes('/posts/chinese/')) return 'zh'
  if (normalized.includes('/posts/english/')) return 'en'
  return 'zh'
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeOptionalStringArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
    : undefined
}

function resolvePostSlug(filePath, data) {
  const fileSlug = path.basename(filePath, '.md')
  return normalizeOptionalString(data.slug) || fileSlug
}

function buildSummary(content) {
  const normalized =
    content
      .split(/\n\s*\n/)
      .map((paragraph) => normalizeCountableText(paragraph))
      .find(
        (paragraph) =>
          paragraph.length > 0 &&
          !/^(?:版权归作者所有|作者[:：]|来源[:：]|https?:\/\/)/i.test(
            paragraph
          )
      ) || normalizeCountableText(content)

  return normalized.length <= MOVIE_REVIEW_SUMMARY_MAX_LENGTH
    ? normalized
    : `${normalized.slice(0, MOVIE_REVIEW_SUMMARY_MAX_LENGTH).trimEnd()}…`
}

function buildPostSummaries() {
  if (!fs.existsSync(POSTS_DIR)) {
    throw new Error(`Posts directory not found: ${POSTS_DIR}`)
  }

  const files = collectPostMarkdownFiles(POSTS_DIR)
  const summaries = files.map((filePath) => {
    const rawContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(rawContent)
    const slug = resolvePostSlug(filePath, data)

    return {
      id: slug,
      slug,
      language: resolveLanguageFromPath(filePath),
      title: String(data.title || slug),
      date: String(data.date || ''),
      updated: normalizeOptionalString(data.updated),
      summary: String(data.summary || ''),
      wordCount: countWords(content),
      image: normalizeOptionalString(data.image),
      tags: normalizeOptionalStringArray(data.tags),
      category: normalizeOptionalString(data.category),
    }
  })

  const reviewSummaries = fs.existsSync(MOVIE_REVIEWS_DIR)
    ? collectMarkdownFiles(MOVIE_REVIEWS_DIR)
        .map((filePath) => {
          const rawContent = fs.readFileSync(filePath, 'utf-8')
          const { data, content } = matter(rawContent)
          const slug = path.basename(filePath, '.md')

          if (
            slug.toLowerCase() === 'readme' ||
            slug.startsWith('_') ||
            !data.title ||
            !data.date ||
            !data.movieSubjectId
          ) {
            return null
          }

          return {
            id: slug,
            slug,
            language: 'zh',
            title: String(data.title),
            date: String(data.date),
            summary:
              normalizeOptionalString(data.summary) || buildSummary(content),
            wordCount: countWords(content),
            tags: normalizeOptionalStringArray(data.tags),
            category: 'Experience',
          }
        })
        .filter(Boolean)
    : []

  summaries.push(...reviewSummaries)
  summaries.sort((left, right) => {
    return new Date(right.date).getTime() - new Date(left.date).getTime()
  })

  return summaries
}

function writePostSummariesFile(postSummaries) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  const tempFile = `${OUTPUT_FILE}.tmp`
  fs.writeFileSync(
    tempFile,
    `${JSON.stringify(postSummaries, null, 2)}\n`,
    'utf-8'
  )
  fs.renameSync(tempFile, OUTPUT_FILE)
}

function main() {
  console.log(`Generating lightweight post summaries from ${POSTS_DIR}`)
  const postSummaries = buildPostSummaries()
  writePostSummariesFile(postSummaries)
  console.log(
    `Generated ${postSummaries.length} lightweight post summaries at ${OUTPUT_FILE}`
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
