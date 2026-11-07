import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LINKS_JSON_PATH = path.resolve(
  __dirname,
  '../../../content/Links/links.json'
)
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/lost-friends.json')

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const PROBE_TIMEOUT_MS = 12000
const PROBE_TOTAL_TIMEOUT_MS = 20000

const ANTIBOT_STATUS = new Set([401, 403, 429])

function classifyStatus(httpStatus) {
  if (httpStatus == null) return 'down'
  if (httpStatus >= 200 && httpStatus < 400) return 'up'
  if (ANTIBOT_STATUS.has(httpStatus)) return 'up'
  return 'down'
}

function readFriendLinks(filePath = LINKS_JSON_PATH) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const items = []
  for (const category of ['recommended', 'neighbors']) {
    const list = parsed[category]
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      if (!entry || typeof entry.url !== 'string') continue
      items.push({
        id: entry.url,
        category,
        name: entry.name || entry.url,
        url: entry.url,
        description: entry.description || '',
      })
    }
  }
  return items
}

async function probeOne(item, signal) {
  const headers = {
    'user-agent': DEFAULT_UA,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  }

  const tryFetch = async (method) => {
    try {
      const res = await fetch(item.url, { method, redirect: 'follow', signal, headers })
      try {
        await res.body?.cancel()
      } catch {
        /* ignore */
      }
      return { status: res.status, ok: true }
    } catch {
      return { status: null, ok: false }
    }
  }

  const startedAt = Date.now()
  const attempt = await tryFetch('GET')
  if (attempt.ok && classifyStatus(attempt.status) === 'up') {
    return { status: attempt.status }
  }

  // Fall back to HEAD for heavy frontends that reset GET, keeping total time bounded.
  if (Date.now() - startedAt < PROBE_TIMEOUT_MS) {
    const head = await Promise.race([
      tryFetch('HEAD'),
      new Promise((resolve) =>
        setTimeout(() => resolve({ status: null, ok: false }), PROBE_TIMEOUT_MS)
      ),
    ])
    if (head.ok) return { status: head.status }
  }

  return { status: attempt.status }
}

export async function detectLostFriends(items = readFriendLinks()) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TOTAL_TIMEOUT_MS)
  let results
  try {
    results = await Promise.all(items.map(async (item) => {
      const probe = await probeOne(item, controller.signal)
      return {
        id: item.id,
        category: item.category,
        name: item.name,
        url: item.url,
        description: item.description,
        status: classifyStatus(probe.status),
        httpStatus: probe.status ?? null,
      }
    }))
  } finally {
    clearTimeout(timer)
  }

  const archived = results
    .filter((r) => r.status === 'down')
    .map(({ id, category, name, url, description, httpStatus }) => ({
      id, category, name, url, description, httpStatus,
    }))

  return {
    archived,
    checkedAt: new Date().toISOString(),
  }
}

function main() {
  console.log('Detecting unreachable friend sites...')
  detectLostFriends()
    .then((payload) => {
      const output = `${JSON.stringify(payload, null, 2)}\n`
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
      if (fs.existsSync(OUTPUT_FILE) && fs.readFileSync(OUTPUT_FILE, 'utf8') === output) {
        console.log(`Friend status is current: ${OUTPUT_FILE}`)
        return
      }
      fs.writeFileSync(OUTPUT_FILE, output, 'utf8')
      console.log(
        `Detected ${payload.archived.length} unreachable friend site(s); wrote ${OUTPUT_FILE}`
      )
    })
    .catch((error) => {
      // Never fail a deployment because friend probes timed out. Keep the last
      // known-good snapshot if one exists, otherwise write an empty archive.
      console.warn(`[detect-lost-friends] probe failed: ${error}`)
      const fallback = {
        archived: [],
        checkedAt: new Date().toISOString(),
      }
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
      fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8')
    })
}

// Allow running as a script: `node scripts/detect-lost-friends.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}