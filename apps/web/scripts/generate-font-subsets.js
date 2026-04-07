import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..', '..')
const userHome = process.env.HOME || process.env.USERPROFILE || repoRoot

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

const bundledHeadingFontSource = path.join(
  projectRoot,
  'src/assets/fonts/纳米丰宋_纳挼字库/NanoFullSong-Regular.ttf'
)
const legacyHeadingFontSource = path.join(
  projectRoot,
  'src/assets/纳米丰宋_纳挼字库/NanoFullSong-Regular.ttf'
)
const headingFontSource =
  process.env.HEADING_FONT_SOURCE ||
  (fs.existsSync(bundledHeadingFontSource)
    ? bundledHeadingFontSource
    : legacyHeadingFontSource)
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
const bundledNerdFontSource = path.join(
  projectRoot,
  'src/assets/fonts/JetBrainsMonoNerdFont-Regular.ttf'
)
const nerdFontSource =
  process.env.NERD_FONT_SOURCE ||
  (fs.existsSync(bundledNerdFontSource)
    ? bundledNerdFontSource
    : path.join(userHome, 'Library/Fonts/JetBrainsMonoNerdFontMono-Regular.ttf'))
const nerdFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/JetBrainsMonoNerd-Subset.woff2'
)
const generatedDir = path.join(projectRoot, '.generated')
const headingTextPath = path.join(generatedDir, 'font-heading-chars.txt')
const pixelTextPath = path.join(generatedDir, 'font-pixel-chars.txt')
const nerdFontTextPath = path.join(generatedDir, 'font-nerd-chars.txt')

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

const safeCodeExtras = [
  ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`,
  '，。！？；：、“”‘’（）《》【】—…·',
  '←↑→↓↔↕│└┘├┤┬┴┼─',
  '❮❯…',
  '',
  '',
  '󰀵󰕈󰐿󰣭󰌽󰣨󰣛󰣇󰣚󱄛',
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

function getProjectTextFiles() {
  return [
    ...collectTextFiles(path.join(repoRoot, 'content')),
    ...collectTextFiles(path.join(projectRoot, 'src')),
    path.join(projectRoot, 'index.html'),
  ]
}

function readProjectText() {
  const files = getProjectTextFiles()

  let combined = ''

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue
    combined += fs.readFileSync(filePath, 'utf8')
    combined += '\n'
  }

  return combined
}

function buildHeadingText() {
  const combined = readProjectText() + safeHeadingExtras
  return uniqueGlyphText(combined)
}

function buildNerdFontText() {
  const combined = readProjectText() + safeCodeExtras
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

function resolveCommandPath(command) {
  const result = spawnSync(process.env.SHELL || '/bin/sh', ['-lc', `command -v ${command}`], {
    encoding: 'utf8',
    shell: false,
  })

  if (result.error || result.status !== 0) {
    return null
  }

  const resolvedPath = result.stdout?.trim()
  return resolvedPath || null
}

function findPyftsubset() {
  const probeFontSource = [headingFontSource, pixelFontSource, nerdFontSource].find(
    (filePath) => fs.existsSync(filePath)
  )
  const candidates = [
    process.env.PYFTSUBSET,
    resolveCommandPath('pyftsubset'),
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
  const nerdFontText = buildNerdFontText()

  fs.writeFileSync(headingTextPath, headingText)
  fs.writeFileSync(pixelTextPath, pixelText)
  fs.writeFileSync(nerdFontTextPath, nerdFontText)

  const pyftsubsetPath = findPyftsubset()
  const hasHeadingSource = fs.existsSync(headingFontSource)
  const hasPixelSource = fs.existsSync(pixelFontSource)
  const hasNerdSource = fs.existsSync(nerdFontSource)
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

  if (canGenerate && hasNerdSource) {
    runSubset(pyftsubsetPath, {
      input: nerdFontSource,
      textFile: nerdFontTextPath,
      output: nerdFontOutput,
    })
  } else {
    if (!hasNerdSource) {
      console.warn(
        `Nerd font source not found, reusing committed subset: ${nerdFontSource}`
      )
    }
    verifyOutputExists(nerdFontOutput)
  }

  const headingSize = fs.statSync(headingFontOutput).size
  const pixelSize = fs.statSync(pixelFontOutput).size
  const nerdFontSize = fs.statSync(nerdFontOutput).size

  console.log(
    `Generated ${path.basename(headingFontOutput)} (${formatBytes(headingSize)})`
  )
  console.log(
    `Generated ${path.basename(pixelFontOutput)} (${formatBytes(pixelSize)})`
  )
  console.log(
    `Generated ${path.basename(nerdFontOutput)} (${formatBytes(nerdFontSize)})`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
