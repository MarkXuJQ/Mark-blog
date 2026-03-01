/* eslint-env node */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import puppeteer from 'puppeteer'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`
const DIST_DIR = path.resolve(__dirname, '../dist')
const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')

// Utility to verify dist exists
if (!fs.existsSync(DIST_DIR)) {
  console.error(
    `Build directory not found: ${DIST_DIR}. Run 'pnpm build' first (without prerender step).`
  )
  process.exit(1)
}

// Get all routes
function getRoutes() {
  const routes = ['/', '/blog', '/timeline', '/archive']

  // Add blog post routes
  if (fs.existsSync(POSTS_DIR)) {
    const files = fs
      .readdirSync(POSTS_DIR)
      .filter((file) => file.endsWith('.md'))
    files.forEach((file) => {
      const slug = file.replace(/\.md$/, '')
      routes.push(`/blog/${slug}`)
    })
  }

  return routes
}

async function prerender() {
  console.log('📦 Starting prerendering...')

  // 1. Start Vite Preview Server
  // Use npx to avoid shell: true if possible, or use shell: true but handle kill better
  const server = spawn('npx', ['vite', 'preview', '--port', PORT.toString()], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    // shell: true // Removed shell: true to avoid process group killing issues
  })

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000))

  let browser
  try {
    // 2. Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    const routes = getRoutes()

    console.log(`🔍 Found ${routes.length} routes to prerender.`)

    for (const route of routes) {
      const url = `${BASE_URL}${route}`
      const start = Date.now()

      try {
        // Navigate to page
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

        // Wait for a key element to ensure React has mounted
        // Looking for main content or at least the root div being populated
        await page.waitForSelector('#root', { timeout: 5000 })

        // Get HTML
        const html = await page.content()

        // Determine output path
        // / -> dist/index.html
        // /blog -> dist/blog/index.html
        // /blog/slug -> dist/blog/slug/index.html
        let filePath
        if (route === '/') {
          filePath = path.join(DIST_DIR, 'index.html')
        } else {
          const routePath = route.startsWith('/') ? route.slice(1) : route
          const dirPath = path.join(DIST_DIR, routePath)
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
          }
          filePath = path.join(dirPath, 'index.html')
        }

        // Write file
        // Re-inject <!DOCTYPE html> if missing (page.content() usually includes it but let's be safe)
        const finalHtml = html.startsWith('<!DOCTYPE')
          ? html
          : `<!DOCTYPE html>${html}`
        fs.writeFileSync(filePath, finalHtml)

        console.log(
          `✅ [${Date.now() - start}ms] Prerendered: ${route} -> ${filePath.replace(DIST_DIR, '')}`
        )
      } catch (err) {
        console.error(`❌ Failed to prerender ${route}:`, err.message)
      }
    }
  } catch (error) {
    console.error('🔥 Prerender failed:', error)
    process.exit(1)
  } finally {
    // Cleanup
    if (browser) await browser.close()
    server.kill()
    console.log('✨ Prerendering complete.')
    process.exit(0)
  }
}

prerender()
