import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOMAIN = 'https://markxu.icu';

// 调整路径，脚本在 apps/web/scripts/
// content 在 apps/web/../../content/posts
const POSTS_DIR = path.resolve(__dirname, '../../../content/posts');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

console.log(`Scanning posts in: ${POSTS_DIR}`);

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Posts directory not found: ${POSTS_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'));

const posts = files.map(file => {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
  const { data } = matter(content);
  // slug 是文件名去掉 .md
  const slug = file.replace(/\.md$/, '');
  
  return {
    slug,
    // 优先使用 frontmatter 中的 date，如果没有则使用当前时间
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    updated: data.updated ? new Date(data.updated).toISOString() : null,
    title: data.title || slug
  };
});

// 按照日期倒序排序
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

console.log(`Found ${posts.length} posts.`);

// 生成 Sitemap XML
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
${posts.map(post => `  <url>
    <loc>${DOMAIN}/blog/${post.slug}</loc>
    <lastmod>${(post.updated || post.date).split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
fs.writeFileSync(sitemapPath, sitemapContent);
console.log(`Sitemap generated at ${sitemapPath}`);

// 生成 robots.txt
const robotsContent = `User-agent: *
Allow: /
Sitemap: ${DOMAIN}/sitemap.xml
`;

const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
fs.writeFileSync(robotsPath, robotsContent);
console.log(`Robots.txt generated at ${robotsPath}`);
