import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'
import { fileURLToPath } from 'node:url'
import { Feed } from 'feed'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DOMAIN = 'https://markxu.icu'

const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const PUBLIC_DIR = path.resolve(__dirname, '../public')

console.log(`Scanning posts in: ${POSTS_DIR}`)

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Posts directory not found: ${POSTS_DIR}`)
  process.exit(1)
}

const files = fs.readdirSync(POSTS_DIR).filter((file) => file.endsWith('.md'))

const posts = files.map((file) => {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
  const { data, content: markdownContent } = matter(content)
  // slug 是文件名去掉 .md
  const slug = file.replace(/\.md$/, '')

  return {
    slug,
    // 优先使用 frontmatter 中的 date，如果没有则使用当前时间
    date: data.date ? new Date(data.date) : new Date(),
    updated: data.updated ? new Date(data.updated) : null,
    title: data.title || slug,
    description: data.summary || '',
    content: markdownContent,
    image: data.image ? `${DOMAIN}${data.image}` : undefined,
  }
})

// 按照日期倒序排序
posts.sort((a, b) => b.date.getTime() - a.date.getTime())

console.log(`Found ${posts.length} posts.`)

// 初始化 Feed
const feed = new Feed({
  title: 'Mark Xu的小屋',
  description: '这里是 Mark Xu 的个人博客，记录技术与生活。',
  id: DOMAIN,
  link: DOMAIN,
  language: 'zh-CN', // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
  image: `${DOMAIN}/logo.png`,
  favicon: `${DOMAIN}/favicon.png`,
  copyright: `All rights reserved ${new Date().getFullYear()}, Mark Xu`,
  updated: posts.length > 0 ? posts[0].date : new Date(), // optional, default = today
  generator: 'Mark Xu Blog Generator', // optional, default = 'Feed for Node.js'
  feedLinks: {
    rss: `${DOMAIN}/rss.xml`,
    json: `${DOMAIN}/feed.json`,
    atom: `${DOMAIN}/atom.xml`,
  },
  author: {
    name: 'Mark Xu',
    email: 'xujianqiao86@gmail.com',
    link: DOMAIN,
  },
})

// 添加文章到 Feed
posts.forEach((post) => {
  const url = `${DOMAIN}/blog/${post.slug}`
  feed.addItem({
    title: post.title,
    id: url,
    link: url,
    description: post.description,
    content: post.content, // 可选：如果包含完整内容
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

// 输出 RSS 2.0
const rssPath = path.join(PUBLIC_DIR, 'rss.xml')
let rssContent = feed.rss2()
// Inject stylesheet
rssContent = rssContent.replace(
  '<?xml version="1.0" encoding="utf-8"?>',
  '<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>'
)
fs.writeFileSync(rssPath, rssContent)
console.log(`RSS generated at ${rssPath}`)

// 输出 Atom 1.0 (可选)
const atomPath = path.join(PUBLIC_DIR, 'atom.xml')
fs.writeFileSync(atomPath, feed.atom1())
console.log(`Atom generated at ${atomPath}`)

// 输出 JSON Feed 1.0 (可选)
const jsonPath = path.join(PUBLIC_DIR, 'feed.json')
fs.writeFileSync(jsonPath, feed.json1())
console.log(`JSON Feed generated at ${jsonPath}`)
