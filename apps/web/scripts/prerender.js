import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { createRequire } from 'node:module'
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
  const routes = ['/', '/blog', '/timeline', '/archive', '/about', '/life']

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
  const require = createRequire(import.meta.url)
  const vitePackageJsonPath = require.resolve('vite/package.json')
  const viteCliPath = path.resolve(path.dirname(vitePackageJsonPath), 'bin', 'vite.js')

  const server = spawn(
    process.execPath,
    [viteCliPath, 'preview', '--port', PORT.toString()],
    {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    }
  )

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000))

  let browser
  try {
    // 2. Launch Puppeteer
    let launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }

    if (process.env.VERCEL) {
      console.log('🚀 Running on Vercel, using @sparticuz/chromium')
      try {
        const chromium = (await import('@sparticuz/chromium')).default
        launchOptions = {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        }
      } catch (e) {
        console.error('Failed to load @sparticuz/chromium:', e)
      }
    }

    browser = await puppeteer.launch(launchOptions)

    const page = await browser.newPage()
    await page.evaluateOnNewDocument(() => {
      window.__PRERENDER__ = true
    })

    await page.setRequestInterception(true)
    page.on('request', (request) => {
      const requestUrl = request.url()
      const isLocalRequest = requestUrl.startsWith(BASE_URL)
      const isDataRequest =
        requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')
      if (isLocalRequest || isDataRequest) {
        request.continue()
      } else {
        request.abort()
      }
    })

    const routes = getRoutes()

    console.log(`🔍 Found ${routes.length} routes to prerender.`)

    for (const route of routes) {
      const url = `${BASE_URL}${route}`
      const start = Date.now()

      try {
        // Navigate to page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

        // Wait for a key element to ensure React has mounted
        await page.waitForFunction(
          () => {
            const root = document.getElementById('root')
            return (
              !!root &&
              root.childElementCount > 0 &&
              !document.querySelector('[data-prerender-fallback="true"]')
            )
          },
          { timeout: 10000 }
        )

        // Let Helmet finish flushing meta tags into <head>
        await new Promise((resolve) => setTimeout(resolve, 120))

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
