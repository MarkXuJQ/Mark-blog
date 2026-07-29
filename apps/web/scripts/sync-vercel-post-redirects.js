import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { collectPostMarkdownFiles } from './post-files.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const VERCEL_CONFIG_PATH = path.resolve(__dirname, '../vercel.json')
const CHECK_ONLY = process.argv.includes('--check')
const MANAGED_SOURCE_PREFIX = '/blog/'

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function compareStrings(left, right) {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function escapeVercelSourceSegment(value) {
  // Vercel route sources use path-to-regexp syntax. Escape characters that
  // could otherwise turn a literal historical slug into a route pattern.
  return value.replace(/[\\()[\]{}+*?:]/g, '\\$&')
}

function readPosts() {
  const posts = collectPostMarkdownFiles(POSTS_DIR).map((filePath) => {
    const fileSlug = path.basename(filePath, '.md')
    const { data } = matter(fs.readFileSync(filePath, 'utf8'))
    const canonicalSlug = normalizeString(data.slug) || fileSlug
    const explicitAliases = Array.isArray(data.aliases)
      ? Array.from(new Set(data.aliases.map(normalizeString).filter(Boolean)))
      : []

    return {
      filePath,
      fileSlug,
      canonicalSlug,
      aliases: Array.from(new Set([fileSlug, ...explicitAliases])).filter(
        (alias) => alias !== canonicalSlug
      ),
    }
  })

  const canonicalOwners = new Map()
  posts.forEach((post) => {
    const owners = canonicalOwners.get(post.canonicalSlug) || []
    owners.push(post.filePath)
    canonicalOwners.set(post.canonicalSlug, owners)
  })

  const duplicateCanonicals = Array.from(canonicalOwners.entries()).filter(
    ([, owners]) => owners.length > 1
  )
  if (duplicateCanonicals.length > 0) {
    const detail = duplicateCanonicals
      .map(([slug, owners]) => `${slug}: ${owners.join(', ')}`)
      .join('\n')
    throw new Error(`Duplicate canonical post slugs found:\n${detail}`)
  }

  return posts
}

function buildPostRedirects(posts) {
  const canonicalSlugs = new Set(posts.map((post) => post.canonicalSlug))
  const aliasOwners = new Map()

  posts.forEach((post) => {
    post.aliases.forEach((alias) => {
      const owners = aliasOwners.get(alias) || new Set()
      owners.add(post.canonicalSlug)
      aliasOwners.set(alias, owners)
    })
  })

  const redirects = []
  const ambiguousAliases = []

  Array.from(aliasOwners.entries())
    .sort(([left], [right]) => compareStrings(left, right))
    .forEach(([alias, owners]) => {
      const destinations = Array.from(owners)

      if (canonicalSlugs.has(alias)) {
        throw new Error(
          `Post alias '${alias}' conflicts with an existing canonical slug.`
        )
      }

      if (destinations.length !== 1) {
        ambiguousAliases.push({ alias, destinations })
        return
      }

      redirects.push({
        source: `${MANAGED_SOURCE_PREFIX}${escapeVercelSourceSegment(alias)}`,
        destination: `${MANAGED_SOURCE_PREFIX}${encodeURIComponent(destinations[0])}`,
        permanent: true,
      })
    })

  return { redirects, ambiguousAliases }
}

function isManagedPostRedirect(redirect) {
  return (
    typeof redirect?.source === 'string' &&
    redirect.source.startsWith(MANAGED_SOURCE_PREFIX)
  )
}

function buildNextConfig(config, managedRedirects) {
  const existingRedirects = Array.isArray(config.redirects)
    ? config.redirects
    : []
  const unmanagedRedirects = existingRedirects.filter(
    (redirect) => !isManagedPostRedirect(redirect)
  )
  const redirects = [...managedRedirects, ...unmanagedRedirects]
  const nextConfig = {}
  let redirectsInserted = false

  Object.entries(config).forEach(([key, value]) => {
    if (key === 'redirects') return
    nextConfig[key] = value

    if (key === 'ignoreCommand') {
      nextConfig.redirects = redirects
      redirectsInserted = true
    }
  })

  if (!redirectsInserted) {
    nextConfig.redirects = redirects
  }

  return nextConfig
}

function main() {
  const posts = readPosts()
  const { redirects, ambiguousAliases } = buildPostRedirects(posts)
  const config = JSON.parse(fs.readFileSync(VERCEL_CONFIG_PATH, 'utf8'))
  const currentManagedRedirects = Array.isArray(config.redirects)
    ? config.redirects.filter(isManagedPostRedirect)
    : []
  const redirectsAreCurrent =
    JSON.stringify(currentManagedRedirects) === JSON.stringify(redirects)

  if (CHECK_ONLY) {
    if (!redirectsAreCurrent) {
      console.error(
        `Vercel post redirects are stale. Run 'pnpm --dir apps/web generate:redirects' and commit ${VERCEL_CONFIG_PATH}.`
      )
      process.exitCode = 1
      return
    }

    console.log(
      `Vercel post redirects are current: ${redirects.length} permanent redirects; ${ambiguousAliases.length} shared aliases remain SPA-routed.`
    )
    return
  }

  const nextConfig = buildNextConfig(config, redirects)
  fs.writeFileSync(
    VERCEL_CONFIG_PATH,
    `${JSON.stringify(nextConfig, null, 2)}\n`,
    'utf8'
  )
  console.log(
    `Updated ${redirects.length} permanent post redirects in ${VERCEL_CONFIG_PATH}.`
  )
  console.log(
    `${ambiguousAliases.length} shared aliases remain SPA-routed: ${ambiguousAliases.map(({ alias }) => alias).join(', ')}`
  )
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
