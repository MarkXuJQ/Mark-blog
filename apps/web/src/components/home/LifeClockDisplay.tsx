import { useId, type CSSProperties, type SVGProps } from 'react'
import { cn } from '../../utils/cn'

export interface LifeClockDisplayRow {
  value: string
  unit: string
}

interface LifeClockDisplayProps {
  rows: LifeClockDisplayRow[]
  compact?: boolean
}

interface LifeClockLayout {
  width: number
  height: number
  paddingX: number
  paddingY: number
  rowGap: number
  frameBorder: number
  frameRadius: number
  canvasRadius: number
  ledDotSize: number
  ledDotGap: number
  ledScale: number
  charGapColumns: number
  cjkCharGapColumns: number
  valueUnitGapColumns: number
  valueUnitGapColumnsCjk: number
  glowBlur: number
}

interface LedGlyphLine {
  cells: LedCell[]
  columns: number
  rows: number
}

interface LedCell {
  x: number
  y: number
}

const GLYPH_HEIGHT = 8

const LED_GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110', '00000'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110', '00000'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111', '00000'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110', '00000'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010', '00000'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110', '00000'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110', '00000'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000', '00000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110', '00000'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110', '00000'],
  '.': ['00', '00', '00', '00', '00', '00', '11', '11'],
  ' ': ['000', '000', '000', '000', '000', '000', '000', '000'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001', '00000'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100', '00000'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001', '00000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001', '00000'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100', '00000'],
  '年': [
    '00111100',
    '00011000',
    '00111100',
    '00011000',
    '11111111',
    '00011000',
    '01011010',
    '10011001',
  ],
  '天': [
    '00011000',
    '11111111',
    '00011000',
    '00111100',
    '01011010',
    '10011001',
    '00011000',
    '00000000',
  ],
  '小': [
    '00000000',
    '10000001',
    '01000010',
    '00100100',
    '00011000',
    '00011000',
    '00011000',
    '00000000',
  ],
  '时': [
    '11100010',
    '10100010',
    '10101111',
    '11100010',
    '10100010',
    '10100010',
    '11100110',
    '00000000',
  ],
}

const FALLBACK_GLYPH = [
  '11111',
  '10001',
  '10101',
  '10001',
  '10101',
  '10001',
  '11111',
  '00000',
]

const lifeClockLayouts: Record<'regular' | 'compact', LifeClockLayout> = {
  regular: {
    width: 960,
    height: 540,
    paddingX: 64,
    paddingY: 64,
    rowGap: 52,
    frameBorder: 4,
    frameRadius: 18,
    canvasRadius: 12,
    ledDotSize: 2,
    ledDotGap: 1,
    ledScale: 4,
    charGapColumns: 2,
    cjkCharGapColumns: 1,
    valueUnitGapColumns: 4,
    valueUnitGapColumnsCjk: 3,
    glowBlur: 10,
  },
  compact: {
    width: 840,
    height: 472.5,
    paddingX: 60,
    paddingY: 54,
    rowGap: 44,
    frameBorder: 4,
    frameRadius: 16,
    canvasRadius: 10,
    ledDotSize: 2,
    ledDotGap: 1,
    ledScale: 3.5,
    charGapColumns: 2,
    cjkCharGapColumns: 1,
    valueUnitGapColumns: 4,
    valueUnitGapColumnsCjk: 3,
    glowBlur: 8,
  },
}

const lifeClockPalette = {
  frame: '#000000',
  board: '#010301',
  offLed: '#17351b',
  onLed: '#7dff5a',
  hotLed: '#f3fff0',
  glow: 'rgba(125,255,90,0.24)',
}

function getGlyph(char: string) {
  return LED_GLYPHS[char] ?? FALLBACK_GLYPH
}

function getGlyphWidth(glyph: string[]) {
  return glyph[0]?.length ?? 0
}

function isCjkChar(char: string) {
  return /[\u3400-\u9fff]/u.test(char)
}

function buildLedGlyphLine(
  row: LifeClockDisplayRow,
  charGapColumns: number,
  cjkCharGapColumns: number,
  valueUnitGapColumns: number,
  valueUnitGapColumnsCjk: number
): LedGlyphLine {
  const cells: LedCell[] = []
  let cursorX = 0

  const appendText = (text: string) => {
    Array.from(text).forEach((char, index, chars) => {
      const glyph = getGlyph(char)
      const nextChar = chars[index + 1]

      glyph.forEach((glyphRow, y) => {
        Array.from(glyphRow).forEach((cell, x) => {
          if (cell === '1') {
            cells.push({ x: cursorX + x, y })
          }
        })
      })

      cursorX += getGlyphWidth(glyph)
      if (nextChar) {
        cursorX +=
          isCjkChar(char) && isCjkChar(nextChar)
            ? cjkCharGapColumns
            : charGapColumns
      }
    })
  }

  appendText(row.value)
  if (row.value && row.unit) {
    cursorX += Array.from(row.unit).some(isCjkChar)
      ? valueUnitGapColumnsCjk
      : valueUnitGapColumns
  }
  appendText(row.unit)

  return {
    cells,
    columns: cursorX,
    rows: GLYPH_HEIGHT,
  }
}

interface LedDotsProps extends SVGProps<SVGGElement> {
  cells: LedCell[]
  dotSize: number
  fill: string
  inset?: number
}

function LedDots({
  cells,
  dotSize,
  fill,
  inset = 0,
  ...props
}: LedDotsProps) {
  const cellSize = Math.max(0, dotSize - inset * 2)

  return (
    <g fill={fill} {...props}>
      {cells.map((cell, index) => (
        <rect
          key={`${cell.x}-${cell.y}-${index}`}
          x={cell.x + inset}
          y={cell.y + inset}
          width={cellSize}
          height={cellSize}
          rx={cellSize / 2}
        />
      ))}
    </g>
  )
}

export function LifeClockDisplay({
  rows,
  compact = false,
}: LifeClockDisplayProps) {
  const layout = compact ? lifeClockLayouts.compact : lifeClockLayouts.regular
  const svgId = useId().replace(/:/g, '')
  const scaledDotSize = layout.ledDotSize * layout.ledScale
  const scaledDotGap = layout.ledDotGap * layout.ledScale
  const cellPitch = scaledDotSize + scaledDotGap
  const lineHeight = GLYPH_HEIGHT * scaledDotSize + (GLYPH_HEIGHT - 1) * scaledDotGap
  const contentWidth = layout.width - layout.paddingX * 2
  const contentHeight = layout.height - layout.paddingY * 2
  const lineDefinitions = rows.map((row) =>
    buildLedGlyphLine(
      row,
      layout.charGapColumns,
      layout.cjkCharGapColumns,
      layout.valueUnitGapColumns,
      layout.valueUnitGapColumnsCjk
    )
  )
  const totalTextHeight =
    lineDefinitions.length * lineHeight + (lineDefinitions.length - 1) * layout.rowGap
  const textTop = layout.paddingY + (contentHeight - totalTextHeight) / 2
  const pitch = scaledDotSize + scaledDotGap
  const offPatternId = `${svgId}-off`
  const glowFilterId = `${svgId}-glow`
  const contentClipId = `${svgId}-content`
  const frameStyle = {
    borderWidth: `${layout.frameBorder}px`,
    borderRadius: `${layout.frameRadius}px`,
    borderColor: lifeClockPalette.frame,
    backgroundColor: lifeClockPalette.frame,
  } as CSSProperties
  const canvasStyle = {
    borderRadius: `${layout.canvasRadius}px`,
  } as CSSProperties
  const screenLabel = rows.map((row) => `${row.value} ${row.unit}`).join(', ')

  return (
    <div className={styles.screenFrame} style={frameStyle}>
      <div className={styles.screenCanvas} style={canvasStyle}>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className={styles.screenSvg}
          role="img"
          aria-label={screenLabel}
          focusable="false"
        >
          <defs>
            <pattern
              id={offPatternId}
              width={pitch}
              height={pitch}
              patternUnits="userSpaceOnUse"
            >
              <rect width={pitch} height={pitch} fill="transparent" />
              <rect
                x={(pitch - scaledDotSize) / 2}
                y={(pitch - scaledDotSize) / 2}
                width={scaledDotSize}
                height={scaledDotSize}
                rx={scaledDotSize / 2}
                fill={lifeClockPalette.offLed}
              />
            </pattern>

            <filter id={glowFilterId} x="-20%" y="-32%" width="140%" height="164%">
              <feGaussianBlur stdDeviation={layout.glowBlur} />
            </filter>

            <clipPath id={contentClipId}>
              <rect
                x={layout.paddingX}
                y={layout.paddingY}
                width={contentWidth}
                height={contentHeight}
              />
            </clipPath>
          </defs>

          <rect width={layout.width} height={layout.height} fill={lifeClockPalette.board} />
          <rect width={layout.width} height={layout.height} fill={`url(#${offPatternId})`} />

          <g clipPath={`url(#${contentClipId})`}>
            {lineDefinitions.map((line, index) => {
              const lineWidth =
                line.columns * scaledDotSize + Math.max(0, line.columns - 1) * scaledDotGap
              const x = layout.paddingX + (contentWidth - lineWidth) / 2
              const y = textTop + index * (lineHeight + layout.rowGap)
              const positionedCells = line.cells.map((cell) => ({
                x: x + cell.x * cellPitch,
                y: y + cell.y * cellPitch,
              }))

              return (
                <g key={`${rows[index]?.value}-${rows[index]?.unit}-${index}`}>
                  <LedDots
                    cells={positionedCells}
                    dotSize={scaledDotSize * 1.2}
                    fill={lifeClockPalette.glow}
                    inset={-(scaledDotSize * 0.1)}
                    filter={`url(#${glowFilterId})`}
                    opacity="0.9"
                  />

                  <LedDots
                    cells={positionedCells}
                    dotSize={scaledDotSize}
                    fill={lifeClockPalette.onLed}
                  />

                  <LedDots
                    cells={positionedCells}
                    dotSize={scaledDotSize}
                    fill={lifeClockPalette.hotLed}
                    inset={scaledDotSize * 0.28}
                    opacity="0.82"
                  />
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}

const styles = {
  screenFrame: cn('w-full overflow-hidden border-solid border-black bg-black'),
  screenCanvas: 'aspect-video w-full overflow-hidden bg-black',
  screenSvg: 'block h-full w-full',
}
