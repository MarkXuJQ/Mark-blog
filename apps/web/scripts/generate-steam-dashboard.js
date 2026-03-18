import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import {
  createSteamStaticLibrary,
  getSteamConfig,
  SteamConfigError,
  SteamHttpError,
} from '../lib/steam-dashboard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const OUTPUT_FILE = path.resolve(
  __dirname,
  '../../../content/games/steam-library.json'
)

Object.assign(
  process.env,
  loadEnv(process.env.NODE_ENV || 'production', PROJECT_ROOT, '')
)

function writeDashboardFile(payload) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })

  const tempFile = `${OUTPUT_FILE}.tmp`
  fs.writeFileSync(tempFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  fs.renameSync(tempFile, OUTPUT_FILE)
}

function formatSyncError(error) {
  if (error instanceof SteamConfigError) {
    return `${error.code}: ${error.message}`
  }

  if (error instanceof SteamHttpError) {
    return `STEAM_HTTP_${error.status}: ${error.message}`
  }

  return error instanceof Error ? error.message : String(error)
}

async function main() {
  const config = getSteamConfig(process.env)

  console.log(`Syncing Steam dashboard to ${OUTPUT_FILE}`)
  console.log(`Steam profile: ${config.steamId}`)

  try {
    const payload = await createSteamStaticLibrary(config)

    writeDashboardFile(payload)

    console.log(
      `Steam library snapshot updated: ${payload.summary.gameCount} games, ${payload.summary.totalUnlockedAchievements} achievements`
    )
  } catch (error) {
    if (fs.existsSync(OUTPUT_FILE)) {
      console.warn(
        `Steam sync failed, keeping existing dashboard file. ${formatSyncError(error)}`
      )
      return
    }

    console.error(`Steam sync failed. ${formatSyncError(error)}`)
    process.exitCode = 1
  }
}

await main()
