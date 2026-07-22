import puppeteer from 'puppeteer'
import { readFile } from 'node:fs/promises'

const url = process.env.PHOTO_ROUTE_POST_URL ??
  'http://127.0.0.1:4173/blog/Wuhan-food-walk-note1-cn'
const routeDocument = JSON.parse(await readFile(
  new URL('../../../content/travel/routes/wuhan1.json', import.meta.url),
  'utf8'
))
const expectedDescription = '从照片定位整理的武汉探店路线与停留点。'
const expectedMeta = [
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(routeDocument.stats.startAt)),
  `${routeDocument.stats.distanceKilometres.toFixed(1)} km`,
  `${routeDocument.path.length} pts`,
  `${routeDocument.stops.length} stops`,
].join(' · ')

const staticHtml = await fetch(url).then((response) => response.text())
if (
  !staticHtml.includes(`<span class="article-photo-route__title">${routeDocument.title}</span>`) ||
  !staticHtml.includes(`<span class="article-photo-route__description">${expectedDescription}</span>`) ||
  !staticHtml.includes(`<span class="article-photo-route__meta">${expectedMeta}</span>`) ||
  staticHtml.includes('正在等待路线数据')
) {
  throw new Error('Prerendered route summary is missing or stale')
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 960, deviceScaleFactor: 1 })
  const browserErrors = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })

  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-article-photo-route]')
  await page.$eval('[data-article-photo-route]', (figure) => {
    figure.scrollIntoView({ block: 'center' })
  })
  await page.waitForSelector('[data-photo-route-status="ready"]', {
    timeout: 20_000,
  })
  const projectedState = await page.$eval('[data-article-photo-route]', (figure) => ({
    attributes: Array.from(figure.attributes).map((attribute) => [attribute.name, attribute.value]),
    points: JSON.parse(figure.getAttribute('data-photo-route-stop-points') ?? '[]'),
  }))
  if (projectedState.points.length !== routeDocument.stops.length) {
    throw new Error(`Stop projections are missing: ${JSON.stringify(projectedState)}`)
  }

  const route = await page.$eval('[data-article-photo-route]', (figure) => ({
    title: figure.querySelector('.article-photo-route__title')?.textContent?.trim(),
    description: figure.querySelector('.article-photo-route__description')?.textContent?.trim(),
    meta: figure.querySelector('.article-photo-route__meta')?.textContent?.trim(),
    linkPreview: figure.getAttribute('data-link-preview'),
    strongCount: figure.querySelectorAll('strong').length,
    borderRadius: Number.parseFloat(getComputedStyle(figure).borderRadius),
    canvas: Boolean(figure.querySelector('.maplibregl-canvas')),
    cooperativeHintDisplay: getComputedStyle(
      figure.querySelector('.maplibregl-cooperative-gesture-screen')
    ).display,
    stopPoints: JSON.parse(figure.getAttribute('data-photo-route-stop-points') ?? '[]'),
  }))
  if (route.title !== routeDocument.title ||
      route.description !== expectedDescription || route.meta !== expectedMeta ||
      route.linkPreview !== 'off' || route.strongCount !== 0 ||
      route.borderRadius > 8 || !route.canvas) {
    throw new Error(`Unexpected route rendering: ${JSON.stringify(route)}`)
  }
  if (route.cooperativeHintDisplay !== 'none') {
    throw new Error('Cooperative gesture hint should be hidden')
  }
  await page.waitForSelector('[data-photo-route-auto-played="true"]')
  await page.waitForFunction(() => (
    document.querySelector('.article-photo-route__play')?.textContent?.includes('重新播放')
  ), { timeout: 6_000 })

  const mapRect = await page.$eval('.article-photo-route__map', (map) => {
    const rect = map.getBoundingClientRect()
    return { x: rect.x, y: rect.y }
  })
  const selectedIndex = Math.max(0, routeDocument.stops.findIndex((stop) => (
    stop.label && stop.startsAt && stop.endsAt &&
    Math.round((Date.parse(stop.endsAt) - Date.parse(stop.startsAt)) / 60_000) > 0
  )))
  const selectedStop = route.stopPoints[selectedIndex]
  const selectedStopData = routeDocument.stops[selectedIndex]
  await page.mouse.click(
    mapRect.x + selectedStop[0],
    mapRect.y + selectedStop[1]
  )
  await page.waitForSelector('.article-photo-route-popup')
  const popup = await page.$eval('.article-photo-route-popup', (element) => ({
    text: element.textContent?.trim(),
    title: element.querySelector('.article-photo-route-popup__title')?.textContent?.trim(),
    titleBackground: getComputedStyle(
      element.querySelector('.article-photo-route-popup__title')
    ).backgroundImage,
    meta: element.querySelector('.article-photo-route-popup__meta')?.textContent?.trim(),
    metaLines: Array.from(
      element.querySelectorAll('.article-photo-route-popup__meta-line'),
      (line) => line.textContent?.trim()
    ),
    coordinates: element.querySelector('.article-photo-route-popup__coordinates')?.textContent?.trim(),
    actionSvgCount: element.querySelectorAll('.article-photo-route-popup__action svg').length,
  }))
  const selectedDurationMinutes = selectedStopData.startsAt && selectedStopData.endsAt
    ? Math.max(0, Math.round(
        (Date.parse(selectedStopData.endsAt) - Date.parse(selectedStopData.startsAt)) / 60_000
      ))
    : null
  const durationIsCorrect = selectedDurationMinutes === 0
    ? popup.metaLines.length === 1 && !popup.meta?.includes('停留 0 分钟')
    : popup.metaLines.length === 2 && popup.metaLines[0]?.startsWith('停留 ')
  if (popup.title !== selectedStopData.label || !durationIsCorrect ||
      !popup.metaLines.at(-1)?.endsWith('开始记录') ||
      !popup.coordinates?.includes(selectedStopData.latitude.toFixed(6)) ||
      popup.titleBackground !== 'none' || popup.actionSvgCount !== 3) {
    throw new Error(`Unexpected Stop popup: ${JSON.stringify(popup)}`)
  }

  await new Promise((resolve) => setTimeout(resolve, 350))
  const stopAfterPopup = await page.$eval('[data-article-photo-route]', (figure) => (
    JSON.parse(figure.getAttribute('data-photo-route-stop-points') ?? '[]')
  ))
  const selectedStopAfterPopup = stopAfterPopup[selectedIndex]
  if (Math.hypot(
    selectedStopAfterPopup[0] - selectedStop[0],
    selectedStopAfterPopup[1] - selectedStop[1]
  ) > 1) {
    throw new Error('Opening a Stop popup moved the map')
  }

  const zeroDurationIndex = routeDocument.stops.findIndex((stop) => (
    stop.startsAt && stop.endsAt &&
    Math.round((Date.parse(stop.endsAt) - Date.parse(stop.startsAt)) / 60_000) === 0
  ))
  if (zeroDurationIndex >= 0) {
    await page.click('.maplibregl-popup-close-button')
    const zeroDurationStop = route.stopPoints[zeroDurationIndex]
    await page.mouse.click(
      mapRect.x + zeroDurationStop[0],
      mapRect.y + zeroDurationStop[1]
    )
    await page.waitForFunction((label) => (
      document.querySelector('.article-photo-route-popup__title')?.textContent?.trim() === label
    ), {}, routeDocument.stops[zeroDurationIndex].label)
    const zeroDurationMetaLines = await page.$$eval(
      '.article-photo-route-popup__meta-line',
      (lines) => lines.map((line) => line.textContent?.trim())
    )
    if (
      zeroDurationMetaLines.length !== 1 ||
      zeroDurationMetaLines[0]?.includes('停留 0 分钟') ||
      !zeroDurationMetaLines[0]?.endsWith('开始记录')
    ) {
      throw new Error(`Unexpected zero-duration Stop meta: ${JSON.stringify(zeroDurationMetaLines)}`)
    }
  }

  await page.click('.article-photo-route__play')
  await page.waitForFunction(() => (
    document.querySelector('.article-photo-route__play')?.textContent?.includes('播放中')
  ))
  await page.waitForFunction(() => (
    document.querySelector('.article-photo-route__play')?.textContent?.includes('重新播放')
  ), { timeout: 6_000 })

  const layout = await page.evaluate(() => {
    document.documentElement.classList.add('dark')
    const figure = document.querySelector('.article-photo-route')
    const popupContent = document.querySelector(
      '.article-photo-route-map-popup .maplibregl-popup-content'
    )
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      figureBackground: figure ? getComputedStyle(figure).backgroundColor : '',
      popupBackground: popupContent ? getComputedStyle(popupContent).backgroundColor : '',
    }
  })
  if (layout.documentWidth > layout.viewportWidth + 1 || !layout.figureBackground ||
      !layout.popupBackground.includes('35, 35, 37')) {
    throw new Error(`Unexpected route layout: ${JSON.stringify(layout)}`)
  }

  await page.screenshot({ path: '/tmp/mark-blog-photo-route.png', fullPage: true })
  if (browserErrors.length > 0) {
    throw new Error(`Browser errors: ${browserErrors.join(' | ')}`)
  }

  console.log(JSON.stringify({ route, popup, layout }, null, 2))
} finally {
  await browser.close()
}
