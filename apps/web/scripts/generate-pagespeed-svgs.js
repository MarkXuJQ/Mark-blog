import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import process from 'node:process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
      continue
    }
    out[key] = next
    i += 1
  }
  return out
}

function scoreColor(score) {
  if (score >= 90) return { bg: '#16a34a', fg: '#052e16' }
  if (score >= 50) return { bg: '#f59e0b', fg: '#451a03' }
  return { bg: '#ef4444', fg: '#450a0a' }
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderBadgeSvg({ title, subtitle, url, scores }) {
  const width = 760
  const height = 120
  const padding = 20
  const pillHeight = 32
  const pillRadius = 16
  const gap = 10
  const pillsY = 68

  const pillLabels = [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'bestPractices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' },
  ]

  const pills = pillLabels.map((item) => {
    const value = scores[item.key]
    const color = scoreColor(value)
    return {
      label: item.label,
      value,
      bg: color.bg,
      fg: color.fg,
    }
  })

  const pillWidth = Math.floor((width - padding * 2 - gap * 3) / 4)

  const pillSvgs = pills
    .map((p, i) => {
      const x = padding + i * (pillWidth + gap)
      const label = escapeXml(p.label)
      const value = escapeXml(String(p.value))
      return `
        <g>
          <rect x="${x}" y="${pillsY}" width="${pillWidth}" height="${pillHeight}" rx="${pillRadius}" fill="${p.bg}" />
          <text x="${x + 14}" y="${pillsY + 21}" fill="rgba(255,255,255,0.92)" font-size="13" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            ${label}
          </text>
          <text x="${x + pillWidth - 14}" y="${pillsY + 21}" fill="rgba(255,255,255,0.95)" font-size="14" font-weight="700" text-anchor="end" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
            ${value}
          </text>
        </g>
      `
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(
    `${title} ${subtitle}`
  )}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="rgba(0,0,0,0.35)" />
    </filter>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="url(#bg)" filter="url(#shadow)" />
  <g>
    <text x="${padding}" y="36" fill="#e5e7eb" font-size="20" font-weight="700" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
      ${escapeXml(title)}
    </text>
    <text x="${padding}" y="58" fill="#9ca3af" font-size="12.5" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
      ${escapeXml(subtitle)} • ${escapeXml(url)}
    </text>
  </g>

  ${pillSvgs}
</svg>
`
}

function getCategoryScores(lhr) {
  const categories = lhr?.categories || {}
  const pick = (id) => {
    const raw = categories[id]?.score
    if (typeof raw !== 'number') return null
    return Math.round(raw * 100)
  }
  const performance = pick('performance')
  const accessibility = pick('accessibility')
  const bestPractices = pick('best-practices')
  const seo = pick('seo')
  const values = [performance, accessibility, bestPractices, seo]
  if (values.some((v) => typeof v !== 'number')) {
    throw new Error('Lighthouse JSON missing category scores')
  }
  return { performance, accessibility, bestPractices, seo }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

async function runLighthouse({ url, preset, jsonPath }) {
  const args = [
    'dlx',
    'lighthouse',
    url,
    '--quiet',
    '--no-enable-error-reporting',
    '--output=json',
    `--output-path=${jsonPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless=new --no-sandbox',
  ]
  if (preset === 'desktop') {
    args.push('--preset=desktop')
  }
  await run('pnpm', args, { cwd: path.resolve(__dirname, '..') })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = args.url || 'https://markxu.icu'
  const outDir = args.outDir
    ? path.resolve(process.cwd(), args.outDir)
    : path.resolve(__dirname, '../../../badges')
  fs.mkdirSync(outDir, { recursive: true })

  const tmpDir = path.resolve(__dirname, '../node_modules/.tmp/pagespeed')
  fs.mkdirSync(tmpDir, { recursive: true })

  const desktopJsonPath = path.join(tmpDir, 'lighthouse-desktop.json')
  const mobileJsonPath = path.join(tmpDir, 'lighthouse-mobile.json')

  await runLighthouse({ url, preset: 'desktop', jsonPath: desktopJsonPath })
  await runLighthouse({ url, preset: 'mobile', jsonPath: mobileJsonPath })

  const desktopJson = JSON.parse(fs.readFileSync(desktopJsonPath, 'utf-8'))
  const mobileJson = JSON.parse(fs.readFileSync(mobileJsonPath, 'utf-8'))

  const desktopScores = getCategoryScores(desktopJson?.lhr ?? desktopJson)
  const mobileScores = getCategoryScores(mobileJson?.lhr ?? mobileJson)

  const desktopSvg = renderBadgeSvg({
    title: 'PageSpeed (Lighthouse)',
    subtitle: 'Desktop',
    url,
    scores: desktopScores,
  })
  const mobileSvg = renderBadgeSvg({
    title: 'PageSpeed (Lighthouse)',
    subtitle: 'Mobile',
    url,
    scores: mobileScores,
  })

  fs.writeFileSync(path.join(outDir, 'pagespeed-desktop.svg'), desktopSvg)
  fs.writeFileSync(path.join(outDir, 'pagespeed-mobile.svg'), mobileSvg)

  const summary = {
    url,
    generatedAt: new Date().toISOString(),
    desktop: desktopScores,
    mobile: mobileScores,
  }
  fs.writeFileSync(
    path.join(outDir, 'pagespeed-scores.json'),
    JSON.stringify(summary, null, 2)
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
