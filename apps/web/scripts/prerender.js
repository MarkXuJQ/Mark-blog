import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { createRequire } from 'node:module'
import matter from 'gray-matter'
import puppeteer from 'puppeteer'
import { spawn } from 'node:child_process'
import { collectMarkdownFiles, collectPostMarkdownFiles } from './post-files.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`
const DEFAULT_PRERENDER_CONCURRENCY = 4
const DEFAULT_VERCEL_PRERENDER_CONCURRENCY = 1
const MAX_PRERENDER_CONCURRENCY = 8
const PREVIEW_READY_TIMEOUT_MS = 15000
const DIST_DIR = path.resolve(__dirname, '../dist')
const SPA_FALLBACK_PATH = path.join(DIST_DIR, 'spa.html')
const POSTS_DIR = path.resolve(__dirname, '../../../content/posts')
const MOVIE_REVIEWS_DIR = path.resolve(
  __dirname,
  '../../../content/movies/reviews'
)

function isVercelPreviewDeployment() {
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'preview'
}

function getPrerenderConcurrency() {
  const requestedConcurrency = Number.parseInt(
    process.env.PRERENDER_CONCURRENCY || '',
    10
  )

  if (!Number.isFinite(requestedConcurrency) || requestedConcurrency < 1) {
    return process.env.VERCEL === '1'
      ? DEFAULT_VERCEL_PRERENDER_CONCURRENCY
      : DEFAULT_PRERENDER_CONCURRENCY
  }

  return Math.min(requestedConcurrency, MAX_PRERENDER_CONCURRENCY)
}

function resolvePostSlug(filePath) {
  const fileSlug = path.basename(filePath, '.md')
  const content = fs.readFileSync(filePath, 'utf-8')
  const { data } = matter(content)
  return typeof data.slug === 'string' && data.slug.trim()
    ? data.slug.trim()
    : fileSlug
}

// Utility to verify dist exists
if (!fs.existsSync(DIST_DIR)) {
  console.error(
    `Build directory not found: ${DIST_DIR}. Run 'pnpm build' first (without prerender step).`
  )
  process.exit(1)
}

function prepareSpaFallback() {
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Vite entry HTML not found: ${indexPath}`)
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8')
  const isUnrenderedViteShell = /<div\s+id=["']root["']\s*>\s*<\/div>/.test(
    indexHtml
  )

  if (isUnrenderedViteShell) {
    fs.copyFileSync(indexPath, SPA_FALLBACK_PATH)
    console.log('🧭 Preserved the unrendered SPA fallback at /spa.html.')
    return
  }

  if (fs.existsSync(SPA_FALLBACK_PATH)) {
    console.log('🧭 Reusing the existing unrendered SPA fallback.')
    return
  }

  throw new Error(
    "The Vite entry HTML is already prerendered and no SPA fallback exists. Run 'vite build' before prerendering again."
  )
}

prepareSpaFallback()

if (isVercelPreviewDeployment()) {
  console.log(
    '🚀 Skipping full-page prerendering for this Vercel Preview deployment. SPA routing remains available.'
  )
  process.exit(0)
}

// Get all routes
function getRoutes() {
  const routes = [
    '/',
    '/blog',
    '/timeline',
    '/archive',
    '/about',
    '/life',
    '/links',
    '/movies',
    '/games',
    '/projects',
  ]

  // Add blog post routes
  if (fs.existsSync(POSTS_DIR)) {
    const files = collectPostMarkdownFiles(POSTS_DIR)
    files.forEach((filePath) => {
      routes.push(`/blog/${resolvePostSlug(filePath)}`)
    })
  }

  // Add movie review routes
  if (fs.existsSync(MOVIE_REVIEWS_DIR)) {
    const files = collectMarkdownFiles(MOVIE_REVIEWS_DIR)
    files.forEach((filePath) => {
      const slug = path.basename(filePath, '.md')
      if (slug.toLowerCase() === 'readme' || slug.startsWith('_')) return
      routes.push(`/blog/${slug}`)
      routes.push(`/movies/reviews/${slug}`)
    })
  }

  return Array.from(new Set(routes))
}

async function createPrerenderPage(browserContext) {
  const page = await browserContext.newPage()
  await page.evaluateOnNewDocument(() => {
    window.__PRERENDER__ = true
  })

  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const requestUrl = request.url()
    const isLocalRequest = requestUrl.startsWith(BASE_URL)
    const isDataRequest =
      requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')
    const requestAction =
      isLocalRequest || isDataRequest ? request.continue() : request.abort()

    requestAction.catch(() => {})
  })

  return page
}

async function renderRoute(page, route) {
  const url = `${BASE_URL}${route}`
  const start = Date.now()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

    await page.waitForFunction(
      (expectedPath) => {
        const root = document.getElementById('root')
        const canonicalHref = document.querySelector(
          'link[rel="canonical"]'
        )?.href
        let canonicalMatchesRoute = false

        if (canonicalHref) {
          try {
            const normalizePath = (value) =>
              decodeURIComponent(value).replace(/\/+$/, '') || '/'
            canonicalMatchesRoute =
              normalizePath(new URL(canonicalHref).pathname) ===
              normalizePath(expectedPath)
          } catch {
            canonicalMatchesRoute = false
          }
        }

        return (
          !!root &&
          root.childElementCount > 0 &&
          !document.querySelector('[data-prerender-fallback="true"]') &&
          canonicalMatchesRoute
        )
      },
      {
        // Chromium may throttle request-intercepted background pages. Interval
        // polling stays reliable when several prerender pages run in parallel.
        polling: 100,
        timeout: 10000,
      },
      route
    )

    const html = await page.content()
    let filePath
    if (route === '/') {
      filePath = path.join(DIST_DIR, 'index.html')
    } else {
      const routePath = route.startsWith('/') ? route.slice(1) : route
      filePath = path.join(DIST_DIR, routePath, 'index.html')
    }

    const finalHtml = html.startsWith('<!DOCTYPE')
      ? html
      : `<!DOCTYPE html>${html}`

    console.log(
      `✅ [${Date.now() - start}ms] Prerendered: ${route} -> ${filePath.replace(DIST_DIR, '')}`
    )

    return { filePath, html: finalHtml }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Failed to prerender ${route}:`, message)
    return null
  }
}

async function renderRoutesConcurrently(
  browser,
  routes,
  requestedConcurrency = getPrerenderConcurrency()
) {
  const concurrency = Math.min(requestedConcurrency, routes.length)
  const renderedPages = new Array(routes.length)
  let nextRouteIndex = 0

  console.log(
    `🧵 Prerendering with ${concurrency} concurrent browser page${concurrency === 1 ? '' : 's'}.`
  )

  async function runWorker() {
    let browserContext
    let page

    try {
      if (process.env.VERCEL === '1') {
        // Serverless Chromium can exit when a Puppeteer BrowserContext creates
        // its first target, so Vercel uses the browser's default context.
        page = await createPrerenderPage(browser)
      } else {
        // Local workers retain isolated storage and request caches.
        browserContext = await browser.createBrowserContext()
        page = await createPrerenderPage(browserContext)
      }

      while (nextRouteIndex < routes.length) {
        const routeIndex = nextRouteIndex
        nextRouteIndex += 1
        renderedPages[routeIndex] = await renderRoute(page, routes[routeIndex])
      }
    } finally {
      if (browserContext) {
        await browserContext.close().catch(() => {})
      } else if (page) {
        await page.close().catch(() => {})
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()))
  return {
    renderedPages: renderedPages.filter(Boolean),
    failedRoutes: routes.filter((_route, index) => !renderedPages[index]),
  }
}

async function waitForPreviewServer(server) {
  const startedAt = Date.now()
  let serverExit = null

  server.once('exit', (code, signal) => {
    serverExit = { code, signal }
  })

  while (Date.now() - startedAt < PREVIEW_READY_TIMEOUT_MS) {
    if (serverExit) {
      const reason = serverExit.signal
        ? `signal ${serverExit.signal}`
        : `exit code ${serverExit.code}`
      throw new Error(`Vite preview server stopped before startup (${reason}).`)
    }

    try {
      const response = await fetch(BASE_URL, {
        signal: AbortSignal.timeout(1000),
      })
      if (response.ok) {
        console.log(
          `⚡ Preview server ready in ${Date.now() - startedAt}ms at ${BASE_URL}.`
        )
        return
      }
    } catch {
      // The server may still be binding the port; retry until the deadline.
    }

    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  throw new Error(
    `Vite preview server did not become ready within ${PREVIEW_READY_TIMEOUT_MS}ms.`
  )
}

async function resolveBrowserLaunchOptions() {
  if (process.env.VERCEL === '1') {
    console.log('🚀 Running on Vercel, using @sparticuz/chromium')
    const chromium = (await import('@sparticuz/chromium')).default

    return {
      args: Array.from(new Set([...chromium.args, '--disable-dev-shm-usage'])),
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    }
  }

  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  }
}

async function renderRoutesInFreshBrowser(
  routes,
  launchOptions,
  concurrency = getPrerenderConcurrency()
) {
  let browser

  try {
    browser = await puppeteer.launch(launchOptions)
    return await renderRoutesConcurrently(browser, routes, concurrency)
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

async function prerender() {
  console.log('📦 Starting prerendering...')

  let server
  try {
    // 1. Start Vite Preview Server
    const require = createRequire(import.meta.url)
    const vitePackageJsonPath = require.resolve('vite/package.json')
    const viteCliPath = path.resolve(
      path.dirname(vitePackageJsonPath),
      'bin',
      'vite.js'
    )

    server = spawn(
      process.execPath,
      [
        viteCliPath,
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        PORT.toString(),
        '--strictPort',
      ],
      {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      }
    )
    await waitForPreviewServer(server)

    // 2. Launch Puppeteer and render the canonical routes.
    const launchOptions = await resolveBrowserLaunchOptions()
    const routes = getRoutes()

    console.log(`🔍 Found ${routes.length} routes to prerender.`)
    let firstPass

    try {
      firstPass = await renderRoutesInFreshBrowser(routes, launchOptions)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(
        `⚠️ Initial Chromium process failed before prerendering completed: ${message}`
      )
      firstPass = { renderedPages: [], failedRoutes: routes }
    }

    let renderedPages = firstPass.renderedPages

    if (firstPass.failedRoutes.length > 0) {
      console.warn(
        `🔁 Retrying ${firstPass.failedRoutes.length} failed route${firstPass.failedRoutes.length === 1 ? '' : 's'} sequentially in a fresh Chromium process.`
      )
      const retry = await renderRoutesInFreshBrowser(
        firstPass.failedRoutes,
        launchOptions,
        1
      )
      renderedPages = [...renderedPages, ...retry.renderedPages]

      if (retry.failedRoutes.length > 0) {
        throw new Error(
          `Prerendering failed after retry: ${retry.failedRoutes.join(', ')}`
        )
      }
    }

    renderedPages.forEach(({ filePath, html }) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, html)
    })
  } catch (error) {
    console.error('🔥 Prerender failed:', error)
    process.exitCode = 1
  } finally {
    // Cleanup
    if (server && !server.killed) server.kill()
    console.log('✨ Prerendering complete.')
  }
}

prerender()
