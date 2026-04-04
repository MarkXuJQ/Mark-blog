import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_IMAGES_DIR = path.resolve(__dirname, '../public/images')
const SKIP_IMAGE_GENERATION_ENV = 'SKIP_RESPONSIVE_IMAGE_GENERATION'

const BACKGROUND_IMAGES = [
  {
    input: 'day.png',
    outputBase: 'day',
    widths: [640, 960, 1280, 1600],
  },
  {
    input: 'night.png',
    outputBase: 'night',
    widths: [640, 960, 1280],
  },
]

function isTruthy(value) {
  if (!value) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function shouldSkipImageGeneration() {
  if (isTruthy(process.env[SKIP_IMAGE_GENERATION_ENV])) {
    return `${SKIP_IMAGE_GENERATION_ENV}=${process.env[SKIP_IMAGE_GENERATION_ENV]}`
  }

  if (isTruthy(process.env.VERCEL)) {
    return 'VERCEL environment detected'
  }

  return ''
}

function outputPath(base, width, format) {
  return path.join(PUBLIC_IMAGES_DIR, `${base}-${width}.${format}`)
}

async function needsGenerate(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) return true
  const [sourceStat, targetStat] = await Promise.all([
    fs.promises.stat(sourcePath),
    fs.promises.stat(targetPath),
  ])
  return sourceStat.mtimeMs > targetStat.mtimeMs
}

async function generateVariant(sourcePath, targetPath, width, format) {
  let transformer = sharp(sourcePath).resize({
    width,
    withoutEnlargement: true,
  })

  if (format === 'avif') {
    transformer = transformer.avif({
      quality: 48,
      effort: 6,
      chromaSubsampling: '4:2:0',
    })
  } else {
    transformer = transformer.webp({
      quality: 74,
      effort: 6,
    })
  }

  await transformer.toFile(targetPath)
}

async function generateResponsiveBackgrounds() {
  console.log('Generating responsive background image variants...')
  for (const image of BACKGROUND_IMAGES) {
    const sourcePath = path.join(PUBLIC_IMAGES_DIR, image.input)
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Skipping missing source image: ${sourcePath}`)
      continue
    }

    const metadata = await sharp(sourcePath).metadata()
    if (!metadata.width) {
      console.warn(`Skipping image without width metadata: ${sourcePath}`)
      continue
    }

    const widths = Array.from(
      new Set([...image.widths.filter((w) => w < metadata.width), metadata.width])
    ).sort((a, b) => a - b)

    for (const width of widths) {
      for (const format of ['avif', 'webp']) {
        const targetPath = outputPath(image.outputBase, width, format)
        if (!(await needsGenerate(sourcePath, targetPath))) {
          continue
        }

        await generateVariant(sourcePath, targetPath, width, format)
        console.log(
          `  ✓ ${path.basename(sourcePath)} -> ${path.basename(targetPath)}`
        )
      }
    }
  }
}

const skipReason = shouldSkipImageGeneration()

if (skipReason) {
  console.log(
    `Skipping responsive image generation (${skipReason}). Reusing committed assets.`
  )
} else {
  generateResponsiveBackgrounds().catch((error) => {
    console.error('Failed to generate responsive images:', error)
    process.exit(1)
  })
}
