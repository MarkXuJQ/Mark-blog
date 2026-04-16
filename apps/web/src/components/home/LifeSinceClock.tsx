import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

const BIRTH_TIMESTAMP = new Date('2004-06-07T21:00:00+08:00').getTime()
const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const YEAR = 365.2425 * DAY

const MATRIX_STREAMS = [
  {
    left: '4%',
    duration: 13.6,
    delay: -4.2,
    content: '20040607\n21000000\n79842146\n86400000\n01010101\n',
  },
  {
    left: '18%',
    duration: 16.2,
    delay: -2.3,
    content: '06072100\n00018600\n21468090\n11100011\n00110010\n',
  },
  {
    left: '34%',
    duration: 14.8,
    delay: -6.1,
    content: '7984.214\n6809.000\n20040607\n21000000\n01001010\n',
  },
  {
    left: '52%',
    duration: 17.1,
    delay: -3.6,
    content: '86400000\n20040607\n21000000\n21468090\n00111100\n',
  },
  {
    left: '68%',
    duration: 15.4,
    delay: -7.1,
    content: '00079840\n21468000\n06072100\n10101010\n11000011\n',
  },
  {
    left: '85%',
    duration: 18.4,
    delay: -1.8,
    content: '79842146\n86400000\n06072100\n20040607\n21000000\n',
  },
] as const

const DOT_GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ':': ['0', '1', '0', '0', '1', '0', '0'],
  '.': ['0', '0', '0', '0', '0', '1', '0'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
}

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function applyPointerVars(node: HTMLElement | null, x: string, y: string) {
  if (!node) return
  node.style.setProperty('--life-mx', x)
  node.style.setProperty('--life-my', y)
}

function DotMatrixText({
  text,
  size,
  className,
  bare = false,
}: {
  text: string
  size: 'large' | 'medium' | 'small'
  className?: string
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        styles.dotLine,
        size === 'large' && styles.dotLineLarge,
        size === 'medium' && styles.dotLineMedium,
        size === 'small' && styles.dotLineSmall,
        className
      )}
    >
      {Array.from(text).map((char, index) => {
        const pattern = DOT_GLYPHS[char] ?? DOT_GLYPHS[' ']
        const columnCount = pattern[0]?.length ?? 1

        return (
          <div
            key={`${char}-${index}`}
            className={styles.dotChar}
            style={
              {
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              } as CSSProperties
            }
          >
            {pattern.flatMap((row, rowIndex) =>
              Array.from(row).map((cell, columnIndex) => (
                <span
                  key={`${char}-${index}-${rowIndex}-${columnIndex}`}
                  className={cell === '1' ? styles.dotOn : bare ? styles.dotOffBare : styles.dotOff}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

export function LifeSinceClock({
  className,
  compact = false,
  bare = false,
}: {
  className?: string
  compact?: boolean
  bare?: boolean
}) {
  const { i18n } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  const panelRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const isZh = i18n.language?.startsWith('zh')

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    applyPointerVars(panelRef.current, '52%', '44%')
  }, [])

  const diff = Math.max(0, now - BIRTH_TIMESTAMP)
  const totalDays = Math.floor(diff / DAY)
  const years = diff / YEAR
  const hours = Math.floor((diff % DAY) / HOUR)
  const minutes = Math.floor((diff % HOUR) / MINUTE)
  const seconds = Math.floor((diff % MINUTE) / SECOND)

  const daysDisplay = totalDays.toString().padStart(5, '0')
  const clockDisplay = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  const yearsDisplay = years.toFixed(6)

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    applyPointerVars(panelRef.current, `${x}%`, `${y}%`)
  }

  const handlePointerLeave = () => {
    applyPointerVars(panelRef.current, '52%', '44%')
  }

  return (
    <section
      ref={panelRef}
      className={cn(
        styles.panel,
        compact && styles.panelCompact,
        bare && styles.panelBare,
        className
      )}
      style={{ '--life-mx': '52%', '--life-my': '44%' } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {!bare ? <div className={styles.panelGlow} /> : null}
      {!bare ? <div className={styles.panelNoise} /> : null}

      {!bare ? (
        <div className={styles.header}>
          <p className={styles.eyebrow}>{isZh ? '人生时钟' : 'Life clock'}</p>
          <h3 className={cn(styles.title, compact && styles.titleCompact)}>
            {isZh
              ? '从 2004.06.07 21:00 左右开始持续计时'
              : 'Running continuously since around 2004.06.07 21:00'}
          </h3>
        </div>
      ) : null}

      <div
        className={cn(
          styles.matrixViewport,
          compact && styles.matrixViewportCompact,
          bare && styles.matrixViewportBare
        )}
      >
        {!bare ? (
          <div
            aria-hidden="true"
            className={styles.matrixCursorGlow}
            style={{
              background:
                'radial-gradient(circle at var(--life-mx) var(--life-my), rgba(110,255,173,0.22) 0%, rgba(110,255,173,0.08) 12%, rgba(3,9,5,0) 36%)',
            }}
          />
        ) : null}
        {!bare ? <div aria-hidden="true" className={styles.matrixLedField} /> : null}
        {!bare ? <div aria-hidden="true" className={styles.matrixVignette} /> : null}

        {!bare ? (
          <div aria-hidden="true" className={styles.matrixRain}>
            {MATRIX_STREAMS.map((stream) => (
              <motion.pre
                key={stream.left}
                className={styles.matrixColumn}
                style={{ left: stream.left }}
                initial={false}
                animate={
                  prefersReducedMotion
                    ? { y: 0, opacity: 0.12 }
                    : { y: ['-26%', '10%'], opacity: [0.08, 0.18, 0.08] }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: stream.duration,
                        ease: 'linear',
                        repeat: Number.POSITIVE_INFINITY,
                        delay: stream.delay,
                      }
                }
              >
                {stream.content}
              </motion.pre>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            styles.matrixInner,
            compact && styles.matrixInnerCompact,
            bare && styles.matrixInnerBare
          )}
        >
          {!bare ? (
            <div
              className={cn(
                styles.matrixMeta,
                compact && styles.matrixMetaCompact
              )}
            >
              <span>2004.06.07</span>
              <span>21:00</span>
              <span>+08.00</span>
            </div>
          ) : null}

          <DotMatrixText
            text={daysDisplay}
            size="large"
            className={compact ? styles.dotLineLargeCompact : undefined}
            bare={bare}
          />
          <DotMatrixText
            text={clockDisplay}
            size="medium"
            className={compact ? styles.dotLineMediumCompact : undefined}
            bare={bare}
          />
          <DotMatrixText
            text={yearsDisplay}
            size="small"
            className={cn(styles.yearsDigits, compact && styles.dotLineSmallCompact)}
            bare={bare}
          />
        </div>
      </div>
    </section>
  )
}

const styles = {
  panel: cn(
    'relative isolate overflow-hidden rounded-[28px] border border-emerald-300/10 bg-[#07100c] p-5 text-white shadow-[0_28px_80px_-40px_rgba(3,9,5,0.88)]',
    'dark:border-emerald-200/10 dark:bg-[#050b08]'
  ),
  panelCompact: 'p-4 sm:p-[1.125rem]',
  panelBare: 'border-0 bg-transparent p-0 shadow-none',
  panelGlow:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(110,255,173,0.12)_0%,rgba(110,255,173,0)_42%)]',
  panelNoise:
    'pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:16px_16px]',
  header: 'relative z-10',
  eyebrow:
    'font-[var(--font-pixel)] text-[0.7rem] tracking-[0.28em] text-emerald-300/76 uppercase',
  title: 'mt-3 text-base font-semibold leading-7 text-white sm:text-[1.05rem]',
  titleCompact: 'mt-2 text-[0.95rem] leading-6 sm:text-[1rem]',
  matrixViewport:
    'relative mt-5 overflow-hidden rounded-[24px] border border-emerald-300/12 bg-[#020704] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-6',
  matrixViewportCompact: 'mt-4 px-3.5 py-4 sm:px-4 sm:py-[1.125rem]',
  matrixViewportBare:
    'mt-0 overflow-visible rounded-[24px] border border-emerald-300/12 bg-[#050b08] px-3.5 py-4 shadow-[0_24px_60px_-36px_rgba(3,9,5,0.92)] dark:rounded-none dark:border-0 dark:bg-transparent dark:px-0 dark:py-0 dark:shadow-none sm:px-4 sm:py-[1.125rem]',
  matrixCursorGlow: 'pointer-events-none absolute inset-0 transition duration-300',
  matrixLedField:
    'pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(110,255,173,0.14)_0.9px,transparent_1.35px)] [background-size:18px_18px]',
  matrixVignette:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(1,6,3,0.14)_0%,rgba(1,6,3,0)_18%,rgba(1,6,3,0)_82%,rgba(1,6,3,0.18)_100%)]',
  matrixRain:
    'pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(180deg,transparent,black_12%,black_88%,transparent)]',
  matrixColumn:
    'absolute top-[-16%] whitespace-pre font-[var(--font-pixel)] text-[0.6rem] leading-[1.04rem] tracking-[0.32em] text-emerald-300/14',
  matrixInner: 'relative z-10 flex flex-col items-center gap-4',
  matrixInnerCompact: 'gap-3',
  matrixInnerBare: 'gap-2',
  matrixMeta:
    'flex flex-wrap items-center justify-center gap-3 font-[var(--font-pixel)] text-[0.66rem] tracking-[0.26em] text-emerald-200/64',
  matrixMetaCompact: 'gap-2 text-[0.58rem]',
  dotLine: 'flex flex-wrap items-center justify-center',
  dotLineLarge:
    '[--dot-gap:4px] [--dot-size:clamp(8px,0.9vw,11px)] gap-[9px] sm:[--dot-size:clamp(9px,0.82vw,12px)]',
  dotLineLargeCompact:
    '[--dot-gap:3px] [--dot-size:clamp(6.4px,0.7vw,8.5px)] gap-[7px] sm:[--dot-size:clamp(7px,0.66vw,9px)]',
  dotLineMedium:
    '[--dot-gap:3px] [--dot-size:clamp(4.5px,0.5vw,6.5px)] gap-[7px] sm:[--dot-size:clamp(5px,0.46vw,7px)]',
  dotLineMediumCompact:
    '[--dot-gap:2px] [--dot-size:clamp(3.9px,0.42vw,5.3px)] gap-[5px] sm:[--dot-size:clamp(4.2px,0.4vw,5.6px)]',
  dotLineSmall:
    '[--dot-gap:2px] [--dot-size:clamp(3.2px,0.3vw,4.6px)] gap-[6px] sm:[--dot-size:clamp(3.6px,0.28vw,5px)]',
  dotLineSmallCompact:
    '[--dot-gap:2px] [--dot-size:clamp(2.7px,0.24vw,4px)] gap-[5px] sm:[--dot-size:clamp(3px,0.22vw,4.2px)]',
  dotChar: 'grid grid-rows-[repeat(7,minmax(0,1fr))] gap-[var(--dot-gap)]',
  dotOn:
    'h-[var(--dot-size)] w-[var(--dot-size)] rounded-full bg-[#73ffb5] shadow-[0_0_12px_rgba(115,255,181,0.72),0_0_20px_rgba(34,197,94,0.18)]',
  dotOff:
    'h-[var(--dot-size)] w-[var(--dot-size)] rounded-full bg-[#0b1f14] shadow-[inset_0_0_0_1px_rgba(115,255,181,0.04)]',
  dotOffBare: 'h-[var(--dot-size)] w-[var(--dot-size)] rounded-full bg-transparent shadow-none',
  yearsDigits: 'opacity-[0.88]',
}
