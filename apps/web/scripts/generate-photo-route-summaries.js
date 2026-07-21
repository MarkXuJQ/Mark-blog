import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROUTES_DIR = path.resolve(__dirname, '../../../content/travel/routes')
const OUTPUT_FILE = path.resolve(
  __dirname,
  '../src/data/photo-route-summaries.json'
)

function readRouteSummary(fileName) {
  const filePath = path.join(ROUTES_DIR, fileName)
  const route = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const key = path.basename(fileName, '.json')

  if (
    route.version !== 1 ||
    typeof route.title !== 'string' ||
    !Array.isArray(route.path) ||
    !Array.isArray(route.stops) ||
    !route.stats ||
    typeof route.stats.distanceKilometres !== 'number' ||
    typeof route.stats.startAt !== 'string' ||
    typeof route.stats.endAt !== 'string'
  ) {
    throw new Error(`Invalid photo route summary data: ${filePath}`)
  }

  return [key, {
    title: route.title.trim(),
    stats: {
      distanceKilometres: route.stats.distanceKilometres,
      pointCount: route.path.length,
      stopCount: route.stops.length,
      startAt: route.stats.startAt,
      endAt: route.stats.endAt,
    },
  }]
}

function main() {
  const summaries = Object.fromEntries(
    fs.readdirSync(ROUTES_DIR)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort((left, right) => left.localeCompare(right))
      .map(readRouteSummary)
  )
  const output = `${JSON.stringify(summaries, null, 2)}\n`

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  if (fs.existsSync(OUTPUT_FILE) && fs.readFileSync(OUTPUT_FILE, 'utf8') === output) {
    console.log(`Photo route summaries are current: ${OUTPUT_FILE}`)
    return
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8')
  console.log(`Generated photo route summaries at ${OUTPUT_FILE}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
