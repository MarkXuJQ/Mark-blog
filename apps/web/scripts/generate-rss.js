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
const FEEDS_ZH_DIR = path.join(FEEDS_DIR, 'zh')
const FEEDS_EN_DIR = path.join(FEEDS_DIR, 'en')
const DIST_FEEDS_DIR = path.join(DIST_DIR, 'feeds')
const DIST_FEEDS_ZH_DIR = path.join(DIST_FEEDS_DIR, 'zh')
const DIST_FEEDS_EN_DIR = path.join(DIST_FEEDS_DIR, 'en')

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

const resolveLanguageFromPath = (filePath) => {
  const normalized = filePath.replaceAll('\\', '/')
  if (normalized.includes('/posts/chinese/')) return 'zh'
  if (normalized.includes('/posts/english/')) return 'en'
  return 'zh'
}

const resolvePostSlug = (filePath, data) => {
  return typeof data.slug === 'string' && data.slug.trim()
    ? data.slug.trim()
    : path.basename(filePath, '.md')
}

const allPosts = files.map((filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const { data, content: markdownContent } = matter(content)
  const slug = resolvePostSlug(filePath, data)
  const language = resolveLanguageFromPath(filePath)

  let coverImage = data.image || undefined
  if (coverImage && !coverImage.startsWith('http')) {
    coverImage = `${DOMAIN}${coverImage}`
  }
  if (!coverImage) {
    const imageMatch = markdownContent.match(/!\[.*?\]\(([^)\s]+)/)
    if (imageMatch && imageMatch[1]) {
      coverImage = imageMatch[1].startsWith('http')
        ? imageMatch[1]
        : `${DOMAIN}${imageMatch[1]}`
    }
  }

  const postUrl = `${DOMAIN}/blog/${encodeURIComponent(slug)}`

  const viewFullLabel = language === 'zh' ? '点击查看全文' : 'Read full article'
  const contentHtml = [
    coverImage ? `<img src="${coverImage}" alt="${data.title || slug}" />` : '',
    data.summary ? `<p>${data.summary}</p>` : '',
    `<a class="view-full" href="${postUrl}" target="_blank">${viewFullLabel}</a>`,
  ].join(' ')

  return {
    slug,
    language,
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

const dedupeBySlug = (inputPosts) => {
  const postsBySlug = new Map()
  inputPosts.forEach((post) => {
    const existing = postsBySlug.get(post.slug)
    if (!existing) {
      postsBySlug.set(post.slug, post)
      return
    }

    const currentTimestamp = (post.updated || post.date).getTime()
    const existingTimestamp = (existing.updated || existing.date).getTime()
    if (currentTimestamp > existingTimestamp) {
      postsBySlug.set(post.slug, post)
    }
  })

  const posts = Array.from(postsBySlug.values())
  posts.sort((a, b) => b.date.getTime() - a.date.getTime())
  return posts
}

const zhPosts = dedupeBySlug(allPosts.filter((post) => post.language === 'zh'))
const enPosts = dedupeBySlug(allPosts.filter((post) => post.language === 'en'))
const posts = dedupeBySlug(allPosts)

console.log(
  `Found ${posts.length} posts. (zh: ${zhPosts.length}, en: ${enPosts.length})`
)

function renderFeedViewPage(feedPosts, options) {
  const {
    lang,
    title,
    displayTitle,
    description,
    feedUrl,
    toggle,
    backLabel,
    copyLabel,
    emptySummary,
    readMoreLabel,
  } = options
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
      const summary = escapeHtml(post.description || emptySummary)
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
              <a href="${href}" target="_blank" rel="noopener noreferrer">${readMoreLabel}</a>
            </div>
          </div>
        </article>
      `
    })
    .join('\n')

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
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
      .header-actions {
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;
      }
      .back-button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.9rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--bg-color);
        color: var(--text-main);
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
        transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
      }
      .back-button:hover {
        text-decoration: none;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      }
      .lang-toggle {
        display: inline-flex;
        gap: 0.4rem;
        padding: 0.25rem;
        border-radius: 999px;
        background: var(--bg-color);
        border: 1px solid var(--border);
      }
      .lang-toggle a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2.75rem;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-sub);
        text-decoration: none;
        transition: background 0.2s, color 0.2s, transform 0.2s;
      }
      .lang-toggle a.active {
        background: var(--card-bg);
        color: var(--text-main);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
      }
      .lang-toggle a:hover {
        color: var(--text-main);
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
          <div class="header-actions">
            <a class="back-button" href="${DOMAIN}">${backLabel}</a>
          </div>
          <div class="header-actions">
            <div class="lang-toggle" role="tablist" aria-label="Language">
              <a href="${toggle.zh.href}" class="${toggle.zh.active ? 'active' : ''}" role="tab" aria-selected="${toggle.zh.active}">
                ${toggle.zh.label}
              </a>
              <a href="${toggle.en.href}" class="${toggle.en.active ? 'active' : ''}" role="tab" aria-selected="${toggle.en.active}">
                ${toggle.en.label}
              </a>
            </div>
          </div>
          <h1>${displayTitle}</h1>
          <div class="desc">${description}</div>
          <div class="subscribe-box">
            <span>${copyLabel}</span>
            <div class="copy-area">
              ${feedUrl}
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

const FEED_VIEW_OPTIONS = {
  zh: {
    lang: 'zh-CN',
    title: 'Mark的自留地 - RSS Feed',
    displayTitle: 'Mark的自留地',
    description: '这里是 Mark Xu 的个人网站，记录技术与生活。',
    feedUrl: `${DOMAIN}/feeds/zh/atom.xml`,
    toggle: {
      zh: { href: `${DOMAIN}/feeds/zh/`, label: '中文', active: true },
      en: { href: `${DOMAIN}/feeds/en/`, label: 'EN', active: false },
    },
    backLabel: '← 返回主页',
    copyLabel: '👇 复制下面的链接到您的 RSS 阅读器中订阅：',
    emptySummary: '暂无摘要',
    readMoreLabel: '阅读全文',
  },
  en: {
    lang: 'en-US',
    title: "Mark's Space - RSS Feed",
    displayTitle: "Mark's Space",
    description: "Welcome to Mark Xu's personal site, sharing tech and life.",
    feedUrl: `${DOMAIN}/feeds/en/atom.xml`,
    toggle: {
      zh: { href: `${DOMAIN}/feeds/zh/`, label: '中文', active: false },
      en: { href: `${DOMAIN}/feeds/en/`, label: 'EN', active: true },
    },
    backLabel: '← Back to Home',
    copyLabel: '👇 Copy the link below into your RSS reader:',
    emptySummary: 'No summary yet',
    readMoreLabel: 'Read full article',
  },
}

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

const createFeed = (feedPosts, options, atomUrl) => {
  const feed = new Feed({
    title: options.displayTitle,
    description: options.description,
    id: DOMAIN,
    link: DOMAIN,
    language: options.lang,
    image: `${DOMAIN}/images/IMG_1766.JPG`,
    favicon: `${DOMAIN}/favicon.png`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Mark Xu`,
    updated: feedPosts.length > 0 ? feedPosts[0].date : new Date(),
    generator: 'Mark Xu Blog Generator',
    feedLinks: {
      atom: atomUrl,
    },
    author: {
      name: 'Mark Xu',
      email: 'xujianqiao86@gmail.com',
      link: DOMAIN,
    },
  })

  feedPosts.forEach((post) => {
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

  return feed
}

const writeFeedFiles = ({ atomPath, viewPath, feedPosts, viewOptions, atomUrl }) => {
  const feed = createFeed(feedPosts, viewOptions, atomUrl)
  let atomContent = feed.atom1()
  atomContent = atomContent.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    '<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="/feeds/atom.xsl"?>'
  )
  fs.writeFileSync(atomPath, atomContent)
  console.log(`Atom generated at ${atomPath}`)

  const feedViewContent = renderFeedViewPage(feedPosts, viewOptions)
  fs.writeFileSync(viewPath, feedViewContent)
  console.log(`Feed view generated at ${viewPath}`)

  return { atomContent, feedViewContent }
}

ensureDir(FEEDS_DIR)
ensureDir(FEEDS_ZH_DIR)
ensureDir(FEEDS_EN_DIR)

const { atomContent, feedViewContent } = writeFeedFiles({
  atomPath: path.join(FEEDS_DIR, 'atom.xml'),
  viewPath: path.join(FEEDS_DIR, 'index.html'),
  feedPosts: posts,
  viewOptions: FEED_VIEW_OPTIONS.zh,
  atomUrl: `${DOMAIN}/feeds/atom.xml`,
})

writeFeedFiles({
  atomPath: path.join(FEEDS_ZH_DIR, 'atom.xml'),
  viewPath: path.join(FEEDS_ZH_DIR, 'index.html'),
  feedPosts: zhPosts,
  viewOptions: FEED_VIEW_OPTIONS.zh,
  atomUrl: FEED_VIEW_OPTIONS.zh.feedUrl,
})

writeFeedFiles({
  atomPath: path.join(FEEDS_EN_DIR, 'atom.xml'),
  viewPath: path.join(FEEDS_EN_DIR, 'index.html'),
  feedPosts: enPosts,
  viewOptions: FEED_VIEW_OPTIONS.en,
  atomUrl: FEED_VIEW_OPTIONS.en.feedUrl,
})

if (fs.existsSync(DIST_DIR)) {
  ensureDir(DIST_FEEDS_DIR)
  ensureDir(DIST_FEEDS_ZH_DIR)
  ensureDir(DIST_FEEDS_EN_DIR)

  const distAtomPath = path.join(DIST_FEEDS_DIR, 'atom.xml')
  fs.writeFileSync(distAtomPath, atomContent)
  console.log(`Atom copied to ${distAtomPath}`)

  const distFeedViewPath = path.join(DIST_FEEDS_DIR, 'index.html')
  fs.writeFileSync(distFeedViewPath, feedViewContent)
  console.log(`Feed view copied to ${distFeedViewPath}`)

  writeFeedFiles({
    atomPath: path.join(DIST_FEEDS_ZH_DIR, 'atom.xml'),
    viewPath: path.join(DIST_FEEDS_ZH_DIR, 'index.html'),
    feedPosts: zhPosts,
    viewOptions: FEED_VIEW_OPTIONS.zh,
    atomUrl: FEED_VIEW_OPTIONS.zh.feedUrl,
  })

  writeFeedFiles({
    atomPath: path.join(DIST_FEEDS_EN_DIR, 'atom.xml'),
    viewPath: path.join(DIST_FEEDS_EN_DIR, 'index.html'),
    feedPosts: enPosts,
    viewOptions: FEED_VIEW_OPTIONS.en,
    atomUrl: FEED_VIEW_OPTIONS.en.feedUrl,
  })

  const atomXslPath = path.join(FEEDS_DIR, 'atom.xsl')
  if (fs.existsSync(atomXslPath)) {
    const distAtomXslPath = path.join(DIST_FEEDS_DIR, 'atom.xsl')
    fs.copyFileSync(atomXslPath, distAtomXslPath)
    console.log(`Atom XSL copied to ${distAtomXslPath}`)
  }
}
