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

  const postUrl = `${DOMAIN}/blog/${slug}`

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

const feed = new Feed({
  title: 'Mark Xu的小屋',
  description: '这里是 Mark Xu 的个人博客，记录技术与生活。',
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
  const url = `${DOMAIN}/blog/${post.slug}`
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

if (fs.existsSync(DIST_DIR)) {
  if (!fs.existsSync(DIST_FEEDS_DIR)) {
    fs.mkdirSync(DIST_FEEDS_DIR, { recursive: true })
  }
  const distAtomPath = path.join(DIST_FEEDS_DIR, 'atom.xml')
  fs.writeFileSync(distAtomPath, atomContent)
  console.log(`Atom copied to ${distAtomPath}`)
}
