import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..', '..')

const textExtensions = new Set([
  '.css',
  '.html',
  '.json',
  '.js',
  '.jsx',
  '.md',
  '.txt',
  '.ts',
  '.tsx',
  '.xml',
  '.csv',
])

const headingFontSource =
  process.env.HEADING_FONT_SOURCE ||
  path.join(
    projectRoot,
    'src/assets/纳米丰宋_纳挼字库/NanoFullSong-Regular.ttf'
  )
const headingFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/NanoFullSong-Subset.woff2'
)
const pixelFontSource =
  process.env.PIXEL_FONT_SOURCE ||
  path.join(projectRoot, 'src/assets/pixel/Uranus_Pixel_11Px.ttf')
const pixelFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/UranusPixel-Subset.woff2'
)
const generatedDir = path.join(projectRoot, '.generated')
const headingTextPath = path.join(generatedDir, 'font-heading-chars.txt')
const pixelTextPath = path.join(generatedDir, 'font-pixel-chars.txt')

const pixelFontText = [
  'BLOG · LIFE · MOVIES · GAMES',
  'EASTER EGG UNLOCKED',
  'HIDDEN ROUTE ACTIVATED',
  '  •  ',
].join('\n')

const safeHeadingExtras = [
  '0123456789',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  ` '",.:;!?()[]{}+-=*/&_@#%<>~|^$`,
  '，。！？；：、“”‘’（）《》【】—…·',
].join('')

function collectTextFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'assets' || entry.name === 'dist' || entry.name === 'node_modules') {
        continue
      }
      collectTextFiles(fullPath, files)
      continue
    }

    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

function uniqueGlyphText(input) {
  const seen = new Set()
  let output = ''

  for (const char of input) {
    if (char === '\n' || char === '\r' || char === '\t') continue
    if (seen.has(char)) continue
    seen.add(char)
    output += char
  }

  return output
}

function buildHeadingText() {
  const files = [
    ...collectTextFiles(path.join(repoRoot, 'content')),
    ...collectTextFiles(path.join(projectRoot, 'src')),
    path.join(projectRoot, 'index.html'),
  ]

  let combined = ''

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue
    combined += fs.readFileSync(filePath, 'utf8')
    combined += '\n'
  }

  combined += safeHeadingExtras
  return uniqueGlyphText(combined)
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function canEncodeWoff2(candidate, inputFont) {
  if (!fs.existsSync(inputFont)) return false

  const probeOutput = path.join(
    generatedDir,
    `pyftsubset-probe-${process.pid}.woff2`
  )
  const result = spawnSync(
    candidate,
    [
      inputFont,
      '--text=A',
      `--output-file=${probeOutput}`,
      '--flavor=woff2',
      '--no-hinting',
    ],
    {
      cwd: projectRoot,
      stdio: 'ignore',
      shell: false,
    }
  )

  const succeeded =
    !result.error && result.status === 0 && fs.existsSync(probeOutput)

  if (fs.existsSync(probeOutput)) {
    fs.unlinkSync(probeOutput)
  }

  return succeeded
}

function findPyftsubset() {
  const probeFontSource = [headingFontSource, pixelFontSource].find((filePath) =>
    fs.existsSync(filePath)
  )
  const candidates = [
    process.env.PYFTSUBSET,
    '/Users/markxu/anaconda3/envs/pelvis_seg/bin/pyftsubset',
    'pyftsubset',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (probeFontSource) {
      if (canEncodeWoff2(candidate, probeFontSource)) {
        return candidate
      }
      continue
    }

    const result = spawnSync(candidate, ['--help'], {
      stdio: 'ignore',
      shell: false,
    })
    if (!result.error && result.status === 0) {
      return candidate
    }
  }

  return null
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function runSubset(pyftsubsetPath, options) {
  const result = spawnSync(
    pyftsubsetPath,
    [
      options.input,
      `--text-file=${options.textFile}`,
      `--output-file=${options.output}`,
      '--flavor=woff2',
      '--layout-features=*',
      '--name-IDs=*',
      '--name-legacy',
      '--name-languages=*',
      '--no-hinting',
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      shell: false,
    }
  )

  const stdout = result.stdout?.trim()
  const stderr = result.stderr?.trim()
  const isKnownLocalWarning =
    typeof stderr === 'string' && stderr.includes("_distutils_hack")

  if (stdout) {
    console.log(stdout)
  }

  if (result.status !== 0) {
    if (stderr) {
      console.error(stderr)
    }
    throw new Error(`pyftsubset failed for ${path.basename(options.input)}`)
  }

  if (stderr && !isKnownLocalWarning) {
    console.warn(stderr)
  }
}

function verifyOutputExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required generated font: ${filePath}`)
  }
}

async function main() {
  ensureDir(generatedDir)
  ensureDir(path.dirname(headingFontOutput))

  const headingText = buildHeadingText()
  const pixelText = uniqueGlyphText(pixelFontText)

  fs.writeFileSync(headingTextPath, headingText)
  fs.writeFileSync(pixelTextPath, pixelText)

  const pyftsubsetPath = findPyftsubset()
  const hasHeadingSource = fs.existsSync(headingFontSource)
  const hasPixelSource = fs.existsSync(pixelFontSource)
  const canGenerate = Boolean(pyftsubsetPath)

  if (canGenerate) {
    console.log('Generating font subsets with:', pyftsubsetPath)
  } else {
    console.warn(
      'pyftsubset not found, reusing committed subset fonts if available.'
    )
  }

  if (canGenerate && hasHeadingSource) {
    runSubset(pyftsubsetPath, {
      input: headingFontSource,
      textFile: headingTextPath,
      output: headingFontOutput,
    })
  } else {
    if (!hasHeadingSource) {
      console.warn(
        `Heading font source not found, reusing committed subset: ${headingFontSource}`
      )
    }
    verifyOutputExists(headingFontOutput)
  }

  if (canGenerate && hasPixelSource) {
    runSubset(pyftsubsetPath, {
      input: pixelFontSource,
      textFile: pixelTextPath,
      output: pixelFontOutput,
    })
  } else {
    if (!hasPixelSource) {
      console.warn(
        `Pixel font source not found, reusing committed subset: ${pixelFontSource}`
      )
    }
    verifyOutputExists(pixelFontOutput)
  }

  const headingSize = fs.statSync(headingFontOutput).size
  const pixelSize = fs.statSync(pixelFontOutput).size

  console.log(
    `Generated ${path.basename(headingFontOutput)} (${formatBytes(headingSize)})`
  )
  console.log(
    `Generated ${path.basename(pixelFontOutput)} (${formatBytes(pixelSize)})`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
