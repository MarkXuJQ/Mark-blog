import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const PUBLIC_IMAGES_DIR = path.resolve(__dirname, '../public/images')
const SKIP_IMAGE_GENERATION_ENV = 'SKIP_RESPONSIVE_IMAGE_GENERATION'
const FORCE_IMAGE_GENERATION_ENV = 'FORCE_RESPONSIVE_IMAGE_GENERATION'

const RESPONSIVE_IMAGES = [
  {
    directory: PUBLIC_IMAGES_DIR,
    input: 'day.png',
    outputBase: 'day',
    widths: [640, 960, 1280, 1600],
    includeOriginal: true,
    formats: ['avif', 'webp'],
    avifQuality: 40,
    webpQuality: 68,
  },
  {
    directory: PUBLIC_IMAGES_DIR,
    input: 'night.png',
    outputBase: 'night',
    widths: [640, 960, 1280],
    includeOriginal: true,
    formats: ['avif', 'webp'],
    avifQuality: 40,
    webpQuality: 68,
  },
  {
    directory: PUBLIC_IMAGES_DIR,
    input: 'IMG_1766.JPG',
    outputBase: 'avatar',
    widths: [96, 256, 384],
    formats: ['avif', 'webp'],
    avifQuality: 52,
    webpQuality: 78,
  },
  {
    directory: PUBLIC_DIR,
    input: 'favicon.png',
    outputBase: 'favicon',
    widths: [32, 64],
    formats: ['png'],
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

function outputPath(directory, base, width, format) {
  return path.join(directory, `${base}-${width}.${format}`)
}

async function needsGenerate(sourcePath, targetPath, force) {
  if (force) return true
  if (!fs.existsSync(targetPath)) return true
  const [sourceStat, targetStat] = await Promise.all([
    fs.promises.stat(sourcePath),
    fs.promises.stat(targetPath),
  ])
  return sourceStat.mtimeMs > targetStat.mtimeMs
}

async function generateVariant(sourcePath, targetPath, width, format, image) {
  let transformer = sharp(sourcePath).resize({
    width,
    withoutEnlargement: true,
  })

  if (format === 'avif') {
    transformer = transformer.avif({
      quality: image.avifQuality,
      effort: 6,
      chromaSubsampling: '4:2:0',
    })
  } else if (format === 'webp') {
    transformer = transformer.webp({
      quality: image.webpQuality,
      effort: 6,
    })
  } else {
    transformer = transformer.png({ compressionLevel: 9, palette: true })
  }

  await transformer.toFile(targetPath)
}

async function generateResponsiveImages() {
  const force = isTruthy(process.env[FORCE_IMAGE_GENERATION_ENV])
  console.log('Generating responsive image variants...')
  for (const image of RESPONSIVE_IMAGES) {
    const sourcePath = path.join(image.directory, image.input)
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
      new Set([
        ...image.widths.filter((width) => width <= metadata.width),
        ...(image.includeOriginal ? [metadata.width] : []),
      ])
    ).sort((a, b) => a - b)

    for (const width of widths) {
      for (const format of image.formats) {
        const targetPath = outputPath(
          image.directory,
          image.outputBase,
          width,
          format
        )
        if (!(await needsGenerate(sourcePath, targetPath, force))) {
          continue
        }

        await generateVariant(sourcePath, targetPath, width, format, image)
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
  generateResponsiveImages().catch((error) => {
    console.error('Failed to generate responsive images:', error)
    process.exit(1)
  })
}
