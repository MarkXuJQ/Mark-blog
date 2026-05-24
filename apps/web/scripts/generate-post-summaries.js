import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { fileURLToPath } from 'node:url'
import { countWords } from '../src/utils/readingTime.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/post-summaries.json')

function collectMarkdownFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

function resolveLanguageFromPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/')
  if (normalized.includes('/posts/chinese/')) return 'zh'
  if (normalized.includes('/posts/english/')) return 'en'
  return 'zh'
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function normalizeOptionalStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : undefined
}

function resolvePostSlug(filePath, data) {
  const fileSlug = path.basename(filePath, '.md')
  return normalizeOptionalString(data.slug) || fileSlug
}

function buildPostSummaries() {
  if (!fs.existsSync(POSTS_DIR)) {
    throw new Error(`Posts directory not found: ${POSTS_DIR}`)
  }

  const files = collectMarkdownFiles(POSTS_DIR)
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
