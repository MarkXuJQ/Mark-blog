import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(projectRoot, '..', '..')
const userHome = process.env.HOME || process.env.USERPROFILE || repoRoot

const textExtensions = new Set([
  '.css',
  '.csv',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
])

const fontSourceExtensions = ['.ttf', '.otf', '.woff2', '.woff']
const generatedDir = path.join(projectRoot, '.generated')
const SKIP_FONT_GENERATION_ENV = 'SKIP_FONT_GENERATION'

const alibabaMediumFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/AlibabaPuHuiTi-3-65-Medium-Subset.woff2'
)
const alibabaSemiBoldFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/AlibabaPuHuiTi-3-75-SemiBold-Subset.woff2'
)
const pixelFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/UranusPixel-Subset.woff2'
)
const nerdFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/JetBrainsMonoNerd-Subset.woff2'
)
const montserratFontOutput = path.join(
  projectRoot,
  'src/assets/fonts/Montserrat-Subset.woff2'
)
const requiredFontOutputs = [
  alibabaMediumFontOutput,
  alibabaSemiBoldFontOutput,
  pixelFontOutput,
  nerdFontOutput,
  montserratFontOutput,
]

const chineseTextPath = path.join(generatedDir, 'font-chinese-chars.txt')
const alibabaSemiBoldTextPath = path.join(
  generatedDir,
  'font-alibaba-semibold-chars.txt'
)
const pixelTextPath = path.join(generatedDir, 'font-pixel-chars.txt')
const nerdFontTextPath = path.join(generatedDir, 'font-nerd-chars.txt')
const montserratTextPath = path.join(generatedDir, 'font-montserrat-chars.txt')
const fontSafelistPath = path.join(
  projectRoot,
  'src/assets/fonts/font-safelist.txt'
)

const alibabaMediumFontSource = resolveFontSource({
  envVar: 'ALIBABA_MEDIUM_FONT_SOURCE',
  roots: [
    path.join(projectRoot, 'src/assets/fonts/AlibabaPuHuiTi-3-65-Medium'),
    path.join(projectRoot, 'src/assets/fonts'),
  ],
  baseNames: ['AlibabaPuHuiTi-3-65-Medium'],
})
const alibabaSemiBoldFontSource = resolveFontSource({
  envVar: 'ALIBABA_SEMIBOLD_FONT_SOURCE',
  roots: [
    path.join(projectRoot, 'src/assets/fonts/AlibabaPuHuiTi-3-75-SemiBold'),
    path.join(projectRoot, 'src/assets/fonts'),
  ],
  baseNames: ['AlibabaPuHuiTi-3-75-SemiBold'],
})
const pixelFontSource = resolveFontSource({
  envVar: 'PIXEL_FONT_SOURCE',
  roots: [path.join(projectRoot, 'src/assets/pixel')],
  baseNames: ['Uranus_Pixel_11Px'],
})
const nerdFontSource = resolveFontSource({
  envVar: 'NERD_FONT_SOURCE',
  roots: [
    path.join(projectRoot, 'src/assets/fonts'),
    path.join(userHome, 'Library/Fonts'),
    path.join(userHome, 'AppData/Local/Microsoft/Windows/Fonts'),
    path.join(userHome, 'AppData/Local/Fonts'),
  ],
  baseNames: [
    'JetBrainsMonoNerdFont-Regular',
    'JetBrainsMonoNerdFontMono-Regular',
  ],
})
const montserratFontSource = resolveFontSource({
  envVar: 'MONTSERRAT_FONT_SOURCE',
  roots: [path.join(projectRoot, 'src/assets/fonts/Montserrat')],
  baseNames: ['Montserrat-VariableFont_wght'],
})

if (
  nerdFontSource &&
  !/JetBrainsMonoNerdFont/i.test(path.basename(nerdFontSource))
) {
  throw new Error(
    `Resolved NERD_FONT_SOURCE to '${nerdFontSource}', but JetBrains Nerd font source is required. ` +
      'Please set NERD_FONT_SOURCE to a JetBrainsMonoNerdFont file and do not point it to Montreal.'
  )
}

const pixelFontText = [
  'BLOG · LIFE · MOVIES · GAMES',
  'EASTER EGG UNLOCKED',
  'HIDDEN ROUTE ACTIVATED',
  '  →  ',
].join('\n')

const safeChineseExtras = [
  '0123456789',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  ` '",.:;!?()[]{}+-=*/&_@#%<>~|^$`,
  `，。！？；：、""''“”‘’（）《》【】「」『』——…·`,
  '￥℃％',
].join('')

const safeCodeExtras = [
  ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`,
  `，。！？；：、""''“”‘’（）《》【】「」『』——…·`,
  '←↑→↓↔↕↖↗↘↙│┃┌┐└┘├┤┬┴┼─━',
  '✓✔✕✖•',
].join('')

function collectTextFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (
        entry.name === 'assets' ||
        entry.name === 'dist' ||
        entry.name === 'node_modules'
      ) {
        continue
      }
      collectTextFiles(fullPath, files)
      continue
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase() !== 'readme.md' &&
      textExtensions.has(path.extname(entry.name))
    ) {
      files.push(fullPath)
    }
  }

  return files
}

function collectFontFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === '__MACOSX' || entry.name.startsWith('._')) continue

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      collectFontFiles(fullPath, files)
      continue
    }

    if (
      entry.isFile() &&
      fontSourceExtensions.includes(path.extname(entry.name).toLowerCase())
    ) {
      files.push(fullPath)
    }
  }

  return files
}

function resolveFontSource(options) {
  const envPath = process.env[options.envVar]
  if (envPath && fs.existsSync(envPath)) return path.resolve(envPath)

  const candidates = []
  for (const root of options.roots) {
    candidates.push(...collectFontFiles(root))
  }

  for (const ext of fontSourceExtensions) {
    const exact = candidates.find((candidate) => {
      const parsed = path.parse(candidate)
      return (
        parsed.ext.toLowerCase() === ext &&
        options.baseNames.includes(parsed.name)
      )
    })
    if (exact) return exact
  }

  return null
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

function readTextFiles(files) {
  let combined = ''

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue
    const rawText = fs.readFileSync(filePath, 'utf8')
    combined += rawText
    combined += decodeUnicodeEscapes(rawText)
    combined += '\n'
  }

  return combined
}

function decodeUnicodeEscapes(input) {
  return input.replace(
    /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g,
    (_, codePoint, codeUnit) => {
      const value = Number.parseInt(codePoint || codeUnit, 16)
      if (!Number.isFinite(value)) return ''

      try {
        return String.fromCodePoint(value)
      } catch {
        return ''
      }
    }
  )
}

function readProjectText() {
  return readTextFiles(getProjectTextFiles())
}

function readFontSafelist() {
  return fs.existsSync(fontSafelistPath)
    ? fs.readFileSync(fontSafelistPath, 'utf8')
    : ''
}

function buildChineseText() {
  return uniqueGlyphText(
    readProjectText() + readFontSafelist() + safeChineseExtras
  )
}

function buildAlibabaSemiBoldText() {
  const combined =
    readTextFiles([
      ...collectTextFiles(path.join(projectRoot, 'src')),
      path.join(projectRoot, 'index.html'),
    ]) +
    readProjectText() +
    readFontSafelist() +
    safeChineseExtras

  return uniqueGlyphText(combined)
}

function buildNerdFontText() {
  return uniqueGlyphText(
    readProjectText() + readFontSafelist() + safeCodeExtras
  )
}

function buildMontserratText() {
  return uniqueGlyphText(
    readProjectText() + readFontSafelist() + safeCodeExtras
  )
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function canEncodeWoff2(candidate, inputFont) {
  if (!inputFont || !fs.existsSync(inputFont)) return false

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
  const probeFontSource = [
    alibabaMediumFontSource,
    alibabaSemiBoldFontSource,
    pixelFontSource,
    nerdFontSource,
    montserratFontSource,
  ].find(Boolean)
  const candidates = [
    process.env.PYFTSUBSET,
    path.join(projectRoot, '.venv-fonttools/bin/pyftsubset'),
    path.join(projectRoot, '.venv-fonttools/Scripts/pyftsubset.exe'),
    path.join(repoRoot, '.venv-fonttools/bin/pyftsubset'),
    path.join(repoRoot, '.venv-fonttools/Scripts/pyftsubset.exe'),
    'pyftsubset',
    path.join(userHome, 'anaconda3/envs/pelvis_seg/bin/pyftsubset'),
    path.join(userHome, 'miniconda3/Scripts/pyftsubset.exe'),
    path.join(
      userHome,
      'AppData/Roaming/Python/Python313/Scripts/pyftsubset.exe'
    ),
    path.join(
      userHome,
      'AppData/Roaming/Python/Python312/Scripts/pyftsubset.exe'
    ),
    path.join(
      userHome,
      'AppData/Roaming/Python/Python311/Scripts/pyftsubset.exe'
    ),
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

function findFonttools() {
  const candidates = [
    process.env.FONTTOOLS,
    path.join(projectRoot, '.venv-fonttools/bin/fonttools'),
    path.join(projectRoot, '.venv-fonttools/Scripts/fonttools.exe'),
    path.join(repoRoot, '.venv-fonttools/bin/fonttools'),
    path.join(repoRoot, '.venv-fonttools/Scripts/fonttools.exe'),
    'fonttools',
  ].filter(Boolean)

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['varLib.instancer', '--help'], {
      stdio: 'ignore',
      shell: false,
    })
    if (!result.error && result.status === 0) return candidate
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
    typeof stderr === 'string' && stderr.includes('_distutils_hack')

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

function instantiateMontserrat(fonttoolsPath) {
  const output = path.join(generatedDir, 'Montserrat-400-900.ttf')
  const result = spawnSync(
    fonttoolsPath,
    [
      'varLib.instancer',
      montserratFontSource,
      'wght=400:900',
      `--output=${output}`,
      '--no-recalc-timestamp',
      '--quiet',
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      shell: false,
    }
  )

  if (result.status !== 0) {
    if (result.stderr?.trim()) console.error(result.stderr.trim())
    throw new Error('Failed to restrict Montserrat to weights 400-900')
  }

  return output
}

function verifyOutputExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required generated font: ${filePath}`)
  }
}

function generateOrReuse(pyftsubsetPath, options) {
  const hasSource = Boolean(options.input && fs.existsSync(options.input))

  if (pyftsubsetPath && hasSource) {
    runSubset(pyftsubsetPath, options)
    return
  }

  if (!hasSource) {
    console.warn(
      `${options.label} source not found, reusing committed subset font.`
    )
  }

  verifyOutputExists(options.output)
}

function generateMontserratOrReuse(pyftsubsetPath, fonttoolsPath) {
  const canGenerate = Boolean(
    pyftsubsetPath && fonttoolsPath && montserratFontSource
  )

  if (canGenerate) {
    const instantiatedSource = instantiateMontserrat(fonttoolsPath)
    runSubset(pyftsubsetPath, {
      input: instantiatedSource,
      textFile: montserratTextPath,
      output: montserratFontOutput,
    })
    return
  }

  if (!montserratFontSource) {
    console.warn('Montserrat source not found, reusing committed subset font.')
  } else if (!fonttoolsPath) {
    console.warn(
      'fonttools not found, reusing committed Montserrat subset font.'
    )
  }

  verifyOutputExists(montserratFontOutput)
}

function logOutput(filePath) {
  const size = fs.statSync(filePath).size
  console.log(`Generated ${path.basename(filePath)} (${formatBytes(size)})`)
}

function isTruthy(value) {
  if (!value) return false
  const normalized = String(value).trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function getFontGenerationSkipReason() {
  if (isTruthy(process.env[SKIP_FONT_GENERATION_ENV])) {
    return `${SKIP_FONT_GENERATION_ENV}=${process.env[SKIP_FONT_GENERATION_ENV]}`
  }

  if (isTruthy(process.env.VERCEL)) {
    return 'VERCEL environment detected'
  }

  return ''
}

async function main() {
  const skipReason = getFontGenerationSkipReason()
  if (skipReason) {
    requiredFontOutputs.forEach(verifyOutputExists)
    console.log(
      `Skipping font subset generation (${skipReason}). Reusing ${requiredFontOutputs.length} committed subset fonts.`
    )
    return
  }

  ensureDir(generatedDir)
  ensureDir(path.dirname(alibabaMediumFontOutput))

  const chineseText = buildChineseText()
  const alibabaSemiBoldText = buildAlibabaSemiBoldText()
  const pixelText = uniqueGlyphText(pixelFontText)
  const nerdFontText = buildNerdFontText()
  const montserratText = buildMontserratText()

  fs.writeFileSync(chineseTextPath, chineseText)
  fs.writeFileSync(alibabaSemiBoldTextPath, alibabaSemiBoldText)
  fs.writeFileSync(pixelTextPath, pixelText)
  fs.writeFileSync(nerdFontTextPath, nerdFontText)
  fs.writeFileSync(montserratTextPath, montserratText)

  const pyftsubsetPath = findPyftsubset()
  const fonttoolsPath = findFonttools()

  if (pyftsubsetPath) {
    console.log('Generating font subsets with:', pyftsubsetPath)
  } else {
    console.warn(
      'pyftsubset not found, reusing committed subset fonts if available.'
    )
  }

  generateOrReuse(pyftsubsetPath, {
    input: alibabaMediumFontSource,
    textFile: chineseTextPath,
    output: alibabaMediumFontOutput,
    label: 'Alibaba PuHuiTi Medium',
  })

  generateOrReuse(pyftsubsetPath, {
    input: alibabaSemiBoldFontSource,
    textFile: alibabaSemiBoldTextPath,
    output: alibabaSemiBoldFontOutput,
    label: 'Alibaba PuHuiTi SemiBold',
  })

  generateOrReuse(pyftsubsetPath, {
    input: pixelFontSource,
    textFile: pixelTextPath,
    output: pixelFontOutput,
    label: 'Pixel font',
  })

  generateOrReuse(pyftsubsetPath, {
    input: nerdFontSource,
    textFile: nerdFontTextPath,
    output: nerdFontOutput,
    label: 'Nerd font',
  })

  generateMontserratOrReuse(pyftsubsetPath, fonttoolsPath)

  logOutput(alibabaMediumFontOutput)
  logOutput(alibabaSemiBoldFontOutput)
  logOutput(pixelFontOutput)
  logOutput(nerdFontOutput)
  logOutput(montserratFontOutput)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
