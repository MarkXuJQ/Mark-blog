import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DOMAIN = 'https://markxu.icu'

const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const MOVIE_REVIEWS_DIR = path.resolve(__dirname, '../../../content/movies/reviews')
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const DIST_DIR = path.resolve(__dirname, '../dist')

console.log(`Scanning posts in: ${POSTS_DIR}`)

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Posts directory not found: ${POSTS_DIR}`)
  process.exit(1)
}

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

const files = collectMarkdownFiles(POSTS_DIR)

const allPosts = files.map((filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(content)
  const slug = path.basename(filePath, '.md')

  return {
    slug,
    date: data.date
      ? new Date(data.date).toISOString()
      : new Date().toISOString(),
    updated: data.updated ? new Date(data.updated).toISOString() : null,
    title: data.title || slug,
  }
})

const postsBySlug = new Map()
allPosts.forEach((post) => {
  const existing = postsBySlug.get(post.slug)
  if (!existing) {
    postsBySlug.set(post.slug, post)
    return
  }

  const currentTimestamp = new Date(post.updated || post.date).getTime()
  const existingTimestamp = new Date(existing.updated || existing.date).getTime()
  if (currentTimestamp > existingTimestamp) {
    postsBySlug.set(post.slug, post)
  }
})

const posts = Array.from(postsBySlug.values())
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

console.log(`Found ${posts.length} posts.`)

const reviewFiles = fs.existsSync(MOVIE_REVIEWS_DIR)
  ? collectMarkdownFiles(MOVIE_REVIEWS_DIR)
  : []
const reviewPages = reviewFiles
  .map((filePath) => {
    const slug = path.basename(filePath, '.md')
    if (slug.toLowerCase() === 'readme' || slug.startsWith('_')) return null

    const content = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(content)
    const dateIso = data.updated
      ? new Date(data.updated).toISOString()
      : data.date
        ? new Date(data.date).toISOString()
        : null

    return {
      slug,
      updated: dateIso,
    }
  })
  .filter((item) => Boolean(item))

console.log(`Found ${reviewPages.length} movie review pages.`)

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/timeline</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/archive</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${DOMAIN}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/life</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/movies</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/games</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
${posts
  .map(
    (post) => `  <url>
    <loc>${DOMAIN}/blog/${encodeURIComponent(post.slug)}</loc>
    <lastmod>${(post.updated || post.date).split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  )
  .join('\n')}
${reviewPages
  .map(
    (review) => `  <url>
    <loc>${DOMAIN}/movies/reviews/${encodeURIComponent(review.slug)}</loc>
    ${review.updated ? `<lastmod>${review.updated.split('T')[0]}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml')
fs.writeFileSync(sitemapPath, sitemapContent)
console.log(`Sitemap generated at ${sitemapPath}`)

if (fs.existsSync(DIST_DIR)) {
  const distSitemapPath = path.join(DIST_DIR, 'sitemap.xml')
  fs.writeFileSync(distSitemapPath, sitemapContent)
  console.log(`Sitemap copied to ${distSitemapPath}`)
}

const robotsContent = `User-agent: *
Allow: /
Sitemap: ${DOMAIN}/sitemap.xml
`

const robotsPath = path.join(PUBLIC_DIR, 'robots.txt')
fs.writeFileSync(robotsPath, robotsContent)
console.log(`Robots.txt generated at ${robotsPath}`)

if (fs.existsSync(DIST_DIR)) {
  const distRobotsPath = path.join(DIST_DIR, 'robots.txt')
  fs.writeFileSync(distRobotsPath, robotsContent)
  console.log(`Robots.txt copied to ${distRobotsPath}`)
}
