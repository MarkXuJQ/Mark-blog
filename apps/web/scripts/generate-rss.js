import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { fileURLToPath } from 'node:url'
import { Feed } from 'feed'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DOMAIN =
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://markxu.icu'

console.log(
  `Generating Atom feed for domain: ${DOMAIN} (Env: ${process.env.VERCEL_ENV || 'local'})`
)

const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const DIST_DIR = path.resolve(__dirname, '../dist')
const FEEDS_DIR = path.join(PUBLIC_DIR, 'feeds')
const DIST_FEEDS_DIR = path.join(DIST_DIR, 'feeds')

console.log(`Scanning posts in: ${POSTS_DIR}`)

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Posts directory not found: ${POSTS_DIR}`)
  process.exit(1)
}

const files = fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith('.md'))

const posts = files.map((file) => {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
  const { data, content: markdownContent } = matter(content)
  const slug = file.replace(/\.md$/, '')

  let coverImage = data.image ? `${DOMAIN}${data.image}` : undefined
  if (!coverImage) {
    const imageMatch = markdownContent.match(/!\[.*?\]\(([^)\s]+)/)
    if (imageMatch && imageMatch[1]) {
      coverImage = imageMatch[1].startsWith('http')
        ? imageMatch[1]
        : `${DOMAIN}${imageMatch[1]}`
    }
  }

  const postUrl = `${DOMAIN}/blog/${encodeURIComponent(slug)}`

  const contentHtml = [
    coverImage ? `<img src="${coverImage}" alt="${data.title || slug}" />` : '',
    data.summary ? `<p>${data.summary}</p>` : '',
    `<a class="view-full" href="${postUrl}" target="_blank">点击查看全文</a>`,
  ].join(' ')

  return {
    slug,
    date: data.date ? new Date(data.date) : new Date(),
    updated: data.updated ? new Date(data.updated) : null,
    title: data.title || slug,
    description: data.summary || '',
    content: contentHtml,
    category: data.category,
    image: coverImage
      ? {
          url: coverImage,
          type: coverImage.endsWith('.png') ? 'image/png' : 'image/jpeg',
        }
      : undefined,
  }
})

posts.sort((a, b) => b.date.getTime() - a.date.getTime())

console.log(`Found ${posts.length} posts.`)

function renderFeedViewPage(feedPosts) {
  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const cards = feedPosts
    .map((post) => {
      const title = escapeHtml(post.title)
      const summary = escapeHtml(post.description || '暂无摘要')
      const date = post.date.toISOString().slice(0, 10)
      const href = `${DOMAIN}/blog/${encodeURIComponent(post.slug)}`
      const cover = post.image?.url
      return `
        <article class="card">
          ${cover ? `<img class="cover" src="${cover}" alt="${title}" loading="lazy" />` : ''}
          <div class="body">
            <h2>${title}</h2>
            <p>${summary}</p>
            <div class="meta">
              <time datetime="${post.date.toISOString()}">${date}</time>
              <a href="${href}" target="_blank" rel="noopener noreferrer">Read full article</a>
            </div>
          </div>
        </article>
      `
    })
    .join('\n')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mark的自留地 - RSS Feed</title>
    <style>
      :root {
        --bg-color: #f8fafc;
        --card-bg: #ffffff;
        --text-main: #1e293b;
        --text-sub: #64748b;
        --accent: #3b82f6;
        --border: #e2e8f0;
        --overlay-bg: rgba(255, 255, 255, 0.40);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg-color: #0f172a;
          --card-bg: #1e293b;
          --text-main: #f1f5f9;
          --text-sub: #94a3b8;
          --accent: #60a5fa;
          --border: #334155;
          --overlay-bg: rgba(0, 0, 0, 0.50);
        }
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-main);
        margin: 0;
        padding: 2rem 1rem;
        line-height: 1.6;
        position: relative;
        min-height: 100vh;
      }
      .bg-layer {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
      }
      .bg-layer img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .bg-night { display: none; }
      @media (prefers-color-scheme: dark) {
        .bg-day { display: none; }
        .bg-night { display: block; }
      }
      .bg-overlay {
        position: fixed;
        inset: 0;
        z-index: 1;
        background: var(--overlay-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .page {
        position: relative;
        z-index: 2;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
      header {
        text-align: center;
        margin-bottom: 3rem;
        padding: 2rem;
        background: var(--card-bg);
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      h1 { margin: 0 0 0.5rem 0; font-size: 2rem; }
      .desc { color: var(--text-sub); margin-bottom: 1.5rem; }
      .subscribe-box {
        background: var(--bg-color);
        padding: 1rem;
        border-radius: 8px;
        display: inline-flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.95rem;
        border: 1px solid var(--border);
      }
      .copy-area {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        background: var(--card-bg);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        border: 1px solid var(--border);
        font-family: monospace;
        user-select: all;
      }
      .card {
        background: var(--card-bg);
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 1.25rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border);
        transition: transform 0.2s;
      }
      .card:hover { transform: translateY(-2px); }
      @media (min-width: 640px) {
        .card { flex-direction: row; height: 150px; }
        .cover { width: 180px; height: 100%; object-fit: cover; }
        .body { flex: 1; padding: 1rem; display: flex; flex-direction: column; }
      }
      @media (max-width: 639px) {
        .cover { width: 100%; height: 140px; object-fit: cover; }
        .body { padding: 1rem; }
      }
      h2 { margin: 0 0 0.4rem 0; font-size: 1.05rem; }
      p { color: var(--text-sub); font-size: 0.85rem; margin: 0 0 0.8rem 0; flex: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; margin-top: auto; }
      time { color: var(--text-sub); }
      a { color: var(--accent); text-decoration: none; font-weight: 500; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="bg-layer bg-day">
      <picture>
        <source
          type="image/avif"
          srcset="/images/day-640.avif 640w, /images/day-960.avif 960w, /images/day-1280.avif 1280w, /images/day-1600.avif 1600w, /images/day-1633.avif 1633w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcset="/images/day-640.webp 640w, /images/day-960.webp 960w, /images/day-1280.webp 1280w, /images/day-1600.webp 1600w, /images/day-1633.webp 1633w"
          sizes="100vw"
        />
        <img src="/images/day.png" alt="" aria-hidden="true" decoding="async" fetchpriority="high" />
      </picture>
    </div>
    <div class="bg-layer bg-night">
      <picture>
        <source
          type="image/avif"
          srcset="/images/night-640.avif 640w, /images/night-960.avif 960w, /images/night-1280.avif 1280w, /images/night-1392.avif 1392w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcset="/images/night-640.webp 640w, /images/night-960.webp 960w, /images/night-1280.webp 1280w, /images/night-1392.webp 1392w"
          sizes="100vw"
        />
        <img src="/images/night.png" alt="" aria-hidden="true" decoding="async" fetchpriority="auto" />
      </picture>
    </div>
    <div class="bg-overlay" aria-hidden="true"></div>

    <div class="page">
      <div class="container">
        <header>
          <h1>Mark的自留地</h1>
          <div class="desc">这里是 Mark Xu 的个人网站，记录技术与生活。</div>
          <div class="subscribe-box">
            <span>👇 复制下面的链接到您的 RSS 阅读器中订阅：</span>
            <div class="copy-area">
              ${DOMAIN}/feeds/atom.xml
            </div>
          </div>
        </header>
        <main>
          ${cards}
        </main>
      </div>
    </div>
  </body>
</html>`
}

const feed = new Feed({
  title: 'Mark的自留地',
  description: '这里是 Mark Xu 的个人网站，记录技术与生活。',
  id: DOMAIN,
  link: DOMAIN,
  language: 'zh-CN',
  image: `${DOMAIN}/images/IMG_1766.JPG`,
  favicon: `${DOMAIN}/favicon.png`,
  copyright: `All rights reserved ${new Date().getFullYear()}, Mark Xu`,
  updated: posts.length > 0 ? posts[0].date : new Date(),
  generator: 'Mark Xu Blog Generator',
  feedLinks: {
    atom: `${DOMAIN}/feeds/atom.xml`,
  },
  author: {
    name: 'Mark Xu',
    email: 'xujianqiao86@gmail.com',
    link: DOMAIN,
  },
})

posts.forEach((post) => {
  const url = `${DOMAIN}/blog/${encodeURIComponent(post.slug)}`
  feed.addItem({
    title: post.title,
    id: url,
    link: url,
    description: post.description,
    content: post.content,
    author: [
      {
        name: 'Mark Xu',
        email: 'xujianqiao86@gmail.com',
        link: DOMAIN,
      },
    ],
    date: post.date,
    image: post.image,
  })
})

if (!fs.existsSync(FEEDS_DIR)) {
  fs.mkdirSync(FEEDS_DIR, { recursive: true })
}

const atomPath = path.join(FEEDS_DIR, 'atom.xml')
let atomContent = feed.atom1()
atomContent = atomContent.replace(
  '<?xml version="1.0" encoding="utf-8"?>',
  '<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="/feeds/atom.xsl"?>'
)
fs.writeFileSync(atomPath, atomContent)
console.log(`Atom generated at ${atomPath}`)

const feedViewPath = path.join(FEEDS_DIR, 'index.html')
const feedViewContent = renderFeedViewPage(posts)
fs.writeFileSync(feedViewPath, feedViewContent)
console.log(`Feed view generated at ${feedViewPath}`)

if (fs.existsSync(DIST_DIR)) {
  if (!fs.existsSync(DIST_FEEDS_DIR)) {
    fs.mkdirSync(DIST_FEEDS_DIR, { recursive: true })
  }
  const distAtomPath = path.join(DIST_FEEDS_DIR, 'atom.xml')
  fs.writeFileSync(distAtomPath, atomContent)
  console.log(`Atom copied to ${distAtomPath}`)

  const distFeedViewPath = path.join(DIST_FEEDS_DIR, 'index.html')
  fs.writeFileSync(distFeedViewPath, feedViewContent)
  console.log(`Feed view copied to ${distFeedViewPath}`)

  const atomXslPath = path.join(FEEDS_DIR, 'atom.xsl')
  if (fs.existsSync(atomXslPath)) {
    const distAtomXslPath = path.join(DIST_FEEDS_DIR, 'atom.xsl')
    fs.copyFileSync(atomXslPath, distAtomXslPath)
    console.log(`Atom XSL copied to ${distAtomXslPath}`)
  }
}
