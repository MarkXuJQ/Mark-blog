'use client'

import * as React from 'react'
import {
  Box,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Grid2X2,
  RotateCcw,
  Timer,
} from 'lucide-react'
import type { GithubDay } from '@/lib/github/types'

export type FocusDay = GithubDay

export interface FocusCityProps {
  days: FocusDay[]
  /** Last visible calendar date. Defaults to the latest supplied date. */
  endDate?: string
  title?: string
  description?: string
  /** Scroll progress in [0, 1]. Maps 0 -> 2D heatmap, 1 -> 3D city. */
  progress?: number
  /** Whether to morph automatically based on progress. Defaults true. */
  autoMorph?: boolean
  defaultView?: 'auto' | 'city' | 'heatmap'
  /** Visible range in weeks. Auto-picked from the container width when omitted. */
  defaultWeeks?: 4 | 12 | 26 | 52
  theme?: 'auto' | 'light' | 'dark'
  className?: string
  style?: React.CSSProperties
  onDaySelect?: (day: FocusDay) => void
}

type Point = [number, number]
type Block = {
  day: FocusDay
  count: number
  column: number
  row: number
  future: boolean
}
const DAY_MS = 86_400_000
const iso = (date: Date) => date.toISOString().slice(0, 10)
const parse = (date: string) => new Date(`${date}T00:00:00.000Z`)
const shift = (date: string, days: number) =>
  iso(new Date(parse(date).getTime() + days * DAY_MS))
const minutesOf = (day: FocusDay) =>
  Math.max(0, Number.isFinite(day.count) ? day.count : 0)
const countLabel = (count: number) =>
  `${Math.round(count)} contribution${count === 1 ? '' : 's'}`
const shortDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parse(date))
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parse(date))
const level = (count: number) =>
  count === 0
    ? 0
    : count < 3
      ? 1
      : count < 6
        ? 2
        : count < 12
          ? 3
          : 4
/**
 * Normalized intensity in [0, 1] relative to the largest visible count.
 * Used so the tallest building in the current window is the max contribution
 * day — i.e. height is normalized to the visible range, not a fixed cap.
 */
const normalized = (count: number, maxCount: number) =>
  maxCount > 0 ? Math.max(0, Math.min(1, count / maxCount)) : 0
const points = (vertices: Point[]) =>
  vertices.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
const lerpPoints = (
  flat: Point[],
  city: Point[],
  progress: number
): Point[] =>
  flat.map(([x, y], index) => [
    x + (city[index][0] - x) * progress,
    y + (city[index][1] - y) * progress,
  ])

function calendar(
  days: FocusDay[],
  endDate: string,
  weeks: number
): Block[] {
  const endDay = (parse(endDate).getUTCDay() + 6) % 7
  const first = shift(endDate, -endDay - (weeks - 1) * 7)
  const map = new Map(days.map((day) => [day.date, day]))
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = shift(first, index)
    const day = map.get(date) ?? {
      date,
      count: 0,
      level: 0,
    }
    return {
      day,
      count: minutesOf(day),
      column: Math.floor(index / 7),
      row: index % 7,
      future: date > endDate,
    }
  })
}

function geometry(
  blocks: Block[],
  width: number,
  height: number,
  yaw: number,
  maxCount?: number
) {
  const columns = blocks.length / 7
  const project = (x: number, y: number, z = 0): Point => [
    x * Math.cos(yaw) - y * Math.sin(yaw),
    (x * Math.sin(yaw) + y * Math.cos(yaw)) * 0.46 - z,
  ]
  const raw = blocks.map((block) => {
    const x = block.column
    const y = block.row
    const size = 0.79
    // Tallest visible day becomes the peak; others scale relative to it.
    const z = block.future ? 0 : normalized(block.count, maxCount ?? 1) * 0.42
    return {
      base: [
        project(x, y),
        project(x + size, y),
        project(x + size, y + size),
        project(x, y + size),
      ],
      roof: [
        project(x, y, z),
        project(x + size, y, z),
        project(x + size, y + size, z),
        project(x, y + size, z),
      ],
    }
  })
  const ground = [
    project(-0.32, -0.32),
    project(columns - 0.05, -0.32),
    project(columns - 0.05, 6.99),
    project(-0.32, 6.99),
  ]
  const vertices = [
    ...ground,
    ...raw.flatMap((item) => [...item.base, ...item.roof]),
  ]
  const minX = Math.min(...vertices.map((point) => point[0]))
  const maxX = Math.max(...vertices.map((point) => point[0]))
  const minY = Math.min(...vertices.map((point) => point[1]))
  const maxY = Math.max(...vertices.map((point) => point[1]))
  const scale = Math.min(
    (width - 36) / (maxX - minX),
    (height - 40) / (maxY - minY)
  )
  const offsetX = (width - (maxX - minX) * scale) / 2
  const offsetY = (height - (maxY - minY) * scale) / 2 - 3
  const fit = ([x, y]: Point): Point => [
    (x - minX) * scale + offsetX,
    (y - minY) * scale + offsetY,
  ]
  const cell = Math.min(27, (width - 64) / columns, (height - 60) / 7)
  const gap = Math.max(3, cell * 0.16)
  const flatX = (width - columns * cell) / 2 + 12
  const flatY = (height - 7 * cell) / 2 - 2
  return {
    ground: ground.map(fit),
    flatX,
    flatY,
    cell,
    blocks: raw
      .map((item, index) => {
        const block = blocks[index]
        const x = flatX + block.column * cell
        const y = flatY + block.row * cell
        const flat: Point[] = [
          [x, y],
          [x + cell - gap, y],
          [x + cell - gap, y + cell - gap],
          [x, y + cell - gap],
        ]
        return {
          ...block,
          flat,
          base: item.base.map(fit),
          roof: item.roof.map(fit),
          depth: block.column * Math.sin(yaw) + block.row * Math.cos(yaw),
        }
      })
      .sort((a, b) => a.depth - b.depth),
  }
}

/**
 * Scroll-driven morph progress (0 = flat 2D heatmap, 1 = 3D city).
 *
 * While autoMorph is on and the user hasn't manually picked a view, the morph
 * follows the section's scroll progress with a delayed ramp: it stays 2D while
 * the section scrolls into place, then rises to 3D only after it has reached
 * roughly the middle of the viewport. The 2D/3D toggle is an override that
 * takes control and tweens to its destination.
 */
function useMorphProgress(
  scrollProgress: number,
  autoMorph: boolean,
  initialView: 'auto' | 'city' | 'heatmap'
) {
  const [morph, setMorph] = React.useState(
    initialView === 'city' ? 1 : 0
  )
  const morphRef = React.useRef(morph)
  const manualRef = React.useRef(initialView !== 'auto')
  const raf = React.useRef(0)
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const apply = React.useCallback((value: number) => {
    morphRef.current = value
    setMorph(value)
  }, [])

  React.useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  // Scroll-driven ramp with a delay until the section is near the viewport
  // center, so the 2D grid stays flat on entry and only lifts to 3D mid-pass.
  React.useEffect(() => {
    if (!autoMorph) return
    if (manualRef.current) return
    if (prefersReduced) {
      apply(scrollProgress >= 1 ? 1 : 0)
      return
    }
    const ramp =
      scrollProgress < 0.45
        ? 0
        : Math.min(1, (scrollProgress - 0.45) / 0.3)
    apply(ramp)
  }, [scrollProgress, autoMorph, prefersReduced, apply])

  const setManual = React.useCallback(
    (target: 'city' | 'heatmap') => {
      manualRef.current = true
      const destination = target === 'city' ? 1 : 0
      if (prefersReduced) {
        apply(destination)
        return
      }
      if (raf.current) cancelAnimationFrame(raf.current)
      const from = morphRef.current
      const start = performance.now()
      const step = (time: number) => {
        const elapsed = Math.min(1, (time - start) / 380)
        const eased = 1 - Math.pow(1 - elapsed, 3)
        apply(from + (destination - from) * eased)
        if (elapsed < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    },
    [apply, prefersReduced]
  )

  return { morph, setManual }
}

/**
 * A GitHub contribution heatmap that morphs from a flat 2D grid into a
 * 3D isometric "city" as the section scrolls into view.
 */
export function FocusCity({
  days,
  endDate,
  title = 'Focus City',
  description = 'A little focus. A growing skyline.',
  progress = 0,
  autoMorph = true,
  defaultView = 'auto',
  defaultWeeks,
  theme = 'auto',
  className = '',
  style,
  onDaySelect,
}: FocusCityProps) {
  const today = iso(new Date())
  const validDays = React.useMemo(
    () =>
      days.filter(
        (day) =>
          /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
          !Number.isNaN(parse(day.date).getTime())
      ),
    [days]
  )
  // view follows the scroll ramp by default; the 2D/3D toggle overrides it.
  const { morph, setManual } = useMorphProgress(progress, autoMorph, defaultView)
  const view: 'city' | 'heatmap' = morph >= 0.5 ? 'city' : 'heatmap'
  const morphProgress = morph
  const [weeks, setWeeks] = React.useState<4 | 12 | 26 | 52>(defaultWeeks ?? 12)
  const [manualRange, setManualRange] = React.useState(false)
  const lastDate =
    endDate ?? validDays.map((day) => day.date).sort().at(-1) ?? today
  const [selected, setSelected] = React.useState(lastDate)
  const [width, setWidth] = React.useState(640)
  const [yaw, setYaw] = React.useState(Math.PI / 6)
  const [hover, setHover] = React.useState<{
    date: string
    x: number
    y: number
  } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const plotRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef<{
    start: number
    yaw: number
    moved: boolean
    pointer: number
  } | null>(null)
  const skipClick = React.useRef(false)
  const id = React.useId()

  React.useEffect(() => {
    const element = plotRef.current
    if (!element) return
    const measure = () => {
      const nextWidth = Math.max(240, element.getBoundingClientRect().width)
      setWidth(nextWidth)
      if (defaultWeeks === undefined && !manualRange) {
        // Auto range from the container width: wide → a full year, medium →
        // half a year, narrow → ~12 weeks. Keeps the cells a readable size.
        setWeeks(
          nextWidth >= 1120
            ? 52
            : nextWidth >= 720
              ? 26
              : nextWidth >= 480
                ? 12
                : 12
        )
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [defaultWeeks, manualRange])

  const blocks = React.useMemo(
    () => calendar(validDays, lastDate, weeks),
    [validDays, lastDate, weeks]
  )
  const available = React.useMemo(
    () => blocks.filter((block) => !block.future),
    [blocks]
  )
  const active =
    available.find((block) => block.day.date === selected) ??
    available.at(-1)!
  const activeIndex = available.findIndex(
    (block) => block.day.date === active.day.date
  )
  const hovered = blocks.find((block) => block.day.date === hover?.date)
  const total = available.reduce((sum, block) => sum + block.count, 0)
  let streak = 0
  let bestStreak = 0
  for (const block of available) {
    streak = block.count > 0 ? streak + 1 : 0
    bestStreak = Math.max(streak, bestStreak)
  }
  const height = width < 480 ? 240 : 264
  const maxCount = Math.max(1, ...available.map((block) => block.count))
  const layout = React.useMemo(
    () => geometry(blocks, width, height, yaw, maxCount),
    [blocks, width, height, yaw, maxCount]
  )
  const selectDay = (day: FocusDay) => {
    setSelected(day.date)
    setHover(null)
    onDaySelect?.(day)
  }
  const moveDay = (offset: number) => {
    const next = available[activeIndex + offset]
    if (next) selectDay(next.day)
  }
  const cameraChanged = Math.abs(yaw - Math.PI / 6) > 0.005
  const pointerPosition = (event: React.PointerEvent) => {
    const rect = plotRef.current!.getBoundingClientRect()
    return {
      x: Math.max(
        8,
        Math.min(width - 168, event.clientX - rect.left + 12)
      ),
      y: Math.max(
        4,
        Math.min(height - 68, event.clientY - rect.top - 56)
      ),
    }
  }

  return (
    <section
      className={`focus-city ${className}`}
      data-theme={theme}
      data-view={view}
      style={style}
      aria-label={title}
    >
      <style>{styles}</style>
      <header className="fc-header">
        <div className="fc-heading">
          <span className="fc-emblem">
            <Timer size={17} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="fc-tools">
          <label className="fc-range">
            <span className="fc-sr-only">Visible period</span>
            <select
              value={weeks}
              onChange={(event) => {
                setWeeks(Number(event.target.value) as 4 | 12 | 26 | 52)
                setManualRange(true)
                setHover(null)
              }}
            >
              <option value={4}>4 weeks</option>
              <option value={12}>12 weeks</option>
              <option value={26}>Half year</option>
              <option value={52}>1 year</option>
            </select>
            <ChevronDown size={12} aria-hidden="true" />
          </label>
          <div
            className="fc-switch"
            role="group"
            aria-label="Visualization view"
          >
            <button
              type="button"
              className="cursor-interaction"
              aria-pressed={view === 'city'}
              onClick={() => {
                setManual('city')
                setHover(null)
              }}
            >
              <Box size={14} aria-hidden="true" />
              <span>3D</span>
            </button>
            <button
              type="button"
              className="cursor-interaction"
              aria-pressed={view === 'heatmap'}
              onClick={() => {
                setManual('heatmap')
                setHover(null)
              }}
            >
              <Grid2X2 size={14} aria-hidden="true" />
              <span>2D</span>
            </button>
          </div>
        </div>
      </header>
      <div className="fc-stats">
        <div>
          <span>Total contributions</span>
          <strong>{total.toLocaleString()}</strong>
          <small>across {weeks} weeks</small>
        </div>
        <div>
          <span>Daily average</span>
          <strong>{(total / available.length).toFixed(1)}</strong>
          <small>per calendar day</small>
        </div>
        <div>
          <span>Best streak</span>
          <strong>
            {bestStreak}
            <em> days</em>
          </strong>
          <small>consecutive activity</small>
        </div>
      </div>
      <div className="fc-plot-header">
        <span>
          <CalendarDays size={12} aria-hidden="true" />
          {shortDate(available[0].day.date)} — {shortDate(lastDate)}
        </span>
        <span>
          {view === 'city' ? 'Drag to orbit' : 'Select a day'}
          {cameraChanged && view === 'city' && (
            <button
              className="fc-camera cursor-interaction"
              type="button"
              aria-label="Reset city angle"
              onClick={() => setYaw(Math.PI / 6)}
            >
              <RotateCcw size={12} aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
      <div
        ref={plotRef}
        className={`fc-plot ${dragging ? 'fc-dragging' : ''}`}
        data-view={view}
      >
        <svg
          className="fc-chart"
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-labelledby={`${id}-chart-title ${id}-chart-desc`}
          onPointerDown={(event) => {
            if (view !== 'city' || event.button !== 0) return
            drag.current = {
              start: event.clientX,
              yaw,
              moved: false,
              pointer: event.pointerId,
            }
            skipClick.current = false
          }}
          onPointerMove={(event) => {
            if (!drag.current) return
            const delta = event.clientX - drag.current.start
            if (Math.abs(delta) > 5 && !drag.current.moved) {
              drag.current.moved = true
              setDragging(true)
              setHover(null)
              event.currentTarget.setPointerCapture(event.pointerId)
            }
            if (drag.current.moved)
              setYaw(
                Math.max(
                  0.24,
                  Math.min(0.81, drag.current.yaw + delta / 540)
                )
              )
          }}
          onPointerUp={() => {
            skipClick.current = Boolean(drag.current?.moved)
            drag.current = null
            setDragging(false)
          }}
          onPointerCancel={() => {
            drag.current = null
            skipClick.current = true
            setDragging(false)
          }}
          onPointerLeave={() => {
            setHover(null)
            if (!drag.current?.moved) drag.current = null
          }}
          onDoubleClick={() => setYaw(Math.PI / 6)}
        >
          <title id={`${id}-chart-title`}>
            {view === 'city'
              ? 'Isometric GitHub contribution city'
              : 'Daily GitHub contribution heatmap'}
          </title>
          <desc id={`${id}-chart-desc`}>
            {available.length} days from {shortDate(available[0].day.date)}{' '}
            to {shortDate(lastDate)}. {total.toLocaleString()} total
            contributions. One block per day. Height and green intensity
            represent contribution count. Use the day navigation buttons or
            date picker below to inspect every day with a keyboard.
          </desc>
          <polygon
            points={points(layout.ground)}
            fill="var(--fc-ground)"
            opacity={morphProgress}
          />
          {layout.blocks.map((block) => {
            const roof = lerpPoints(
              block.flat,
              block.roof,
              morphProgress
            )
            const base = lerpPoints(
              block.flat,
              block.base,
              morphProgress
            )
            const isSelected = block.day.date === active.day.date
            const isHovered = block.day.date === hover?.date
            return (
              <g
                key={block.day.date}
                data-date={block.day.date}
                data-level={level(block.count)}
                className={`fc-block cursor-interaction ${
                  isSelected ? 'fc-selected' : ''
                } ${isHovered ? 'fc-hovered' : ''}`}
                opacity={block.future ? 0.2 : 1}
                onClick={() => {
                  if (!block.future && !skipClick.current)
                    selectDay(block.day)
                  skipClick.current = false
                }}
                onPointerEnter={(event) => {
                  if (
                    !block.future &&
                    !drag.current?.moved &&
                    event.pointerType !== 'touch'
                  )
                    setHover({
                      date: block.day.date,
                      ...pointerPosition(event),
                    })
                }}
                onPointerMove={(event) => {
                  if (
                    !block.future &&
                    !drag.current?.moved &&
                    event.pointerType !== 'touch'
                  )
                    setHover({
                      date: block.day.date,
                      ...pointerPosition(event),
                    })
                }}
              >
                <polygon
                  className="fc-face fc-left"
                  points={points([
                    roof[3],
                    roof[2],
                    base[2],
                    base[3],
                  ])}
                />
                <polygon
                  className="fc-face fc-right"
                  points={points([
                    roof[1],
                    roof[2],
                    base[2],
                    base[1],
                  ])}
                />
                <polygon
                  className="fc-face fc-roof"
                  points={points(roof)}
                />
                {isSelected && (
                  <polygon
                    className="fc-selection"
                    points={points(roof)}
                    fill="none"
                    stroke="var(--fc-ink)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            )
          })}
          <g className="fc-axis" opacity={1 - morphProgress} aria-hidden="true">
            {([
              [0, 'Mon'],
              [2, 'Wed'],
              [4, 'Fri'],
            ] as [number, string][]).map(([row, label]) => (
              <text
                key={label}
                x={layout.flatX - 10}
                y={layout.flatY + Number(row) * layout.cell + layout.cell * 0.56}
                textAnchor="end"
              >
                {label}
              </text>
            ))}
            {Array.from(
              { length: weeks },
              (_, column) => {
                const step = weeks > 24 ? 10 : weeks > 12 ? 5 : 4
                return (
                  column % step === 0 &&
                  column < weeks && (
                    <text
                      key={column}
                      x={layout.flatX + column * layout.cell}
                      y={layout.flatY - 11}
                    >
                      {shortDate(blocks[column * 7].day.date)}
                    </text>
                  )
                )
              }
            )}
          </g>
        </svg>
        {hover && hovered && (
          <div
            className="fc-tooltip"
            style={{ left: hover.x, top: hover.y }}
            role="tooltip"
          >
            <span>{dateLabel(hover.date)}</span>
            <strong>{countLabel(hovered.count)}</strong>
          </div>
        )}
      </div>
      <div className="fc-legend">
        <span>
          {view === 'city' ? 'One day. One building.' : 'One day. One square.'}
        </span>
        <div>
          <span>0</span>
          {[0, 1, 2, 3, 4].map((value) => (
            <i key={value} data-level={value} aria-hidden="true" />
          ))}
          <span>12+</span>
        </div>
      </div>
      <div className="fc-day-row">
        <div className="fc-day-identity">
          <span className="fc-day-icon">
            <Clock3 size={15} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div aria-live="polite" aria-atomic="true">
            <strong>{dateLabel(active.day.date)}</strong>
            <span>
              {countLabel(active.count)}
              <span className="fc-middle-dot">·</span>
              {active.count > 0 ? 'active day' : 'rest day'}
            </span>
          </div>
        </div>
        <div className="fc-day-nav">
          <label className="fc-date-picker">
            <span className="fc-sr-only">Select contribution day</span>
            <input
              type="date"
              value={active.day.date}
              min={available[0].day.date}
              max={lastDate}
              onChange={(event) => {
                const day = available.find(
                  (block) => block.day.date === event.target.value
                )
                if (day) selectDay(day.day)
              }}
            />
          </label>
          <button
            className="cursor-interaction"
            type="button"
            aria-label="Previous day"
            disabled={activeIndex === 0}
            onClick={() => moveDay(-1)}
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <button
            className="cursor-interaction"
            type="button"
            aria-label="Next day"
            disabled={activeIndex === available.length - 1}
            onClick={() => moveDay(1)}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

export default FocusCity

const styles = `
.focus-city{--fc-surface:light-dark(#fff,#111);--fc-ink:light-dark(#171717,#ededed);--fc-muted:light-dark(#686868,#aaa);--fc-border:light-dark(#e8e8e8,#2a2a2a);--fc-hover:light-dark(#f5f5f5,#242424);--fc-subtle:light-dark(#fafafa,#181818);--fc-selected:light-dark(#171717,#ededed);--fc-on-selected:light-dark(#fff,#151515);--fc-ground:light-dark(#f3f5f4,#191e1b);--fc-empty:light-dark(#e5eae7,#26332c);--fc-green-1:light-dark(#d0ead9,#2e6748);--fc-green-2:light-dark(#99d4b0,#408d60);--fc-green-3:light-dark(#58b781,#5cbe83);--fc-green-4:light-dark(#25935a,#88d4a5);--fc-shadow:light-dark(#00000008,#00000030);color:var(--fc-ink);background:var(--fc-surface);border:1px solid var(--fc-border);border-radius:14px;box-shadow:0 3px 16px var(--fc-shadow);width:100%;max-width:720px;margin-inline:auto;overflow:hidden;font-family:Inter,Geist,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.5;text-align:left;box-sizing:border-box;isolation:isolate}
.focus-city[data-theme=light]{color-scheme:light}.focus-city[data-theme=dark]{color-scheme:dark}.dark .focus-city[data-theme=auto]{color-scheme:dark}
.focus-city *,.focus-city *::before,.focus-city *::after{box-sizing:border-box}.focus-city button,.focus-city select,.focus-city input{font:inherit;color:inherit}.focus-city button{transition:background .16s ease,color .16s ease,transform .16s ease}.focus-city button:active:not(:disabled){transform:translateY(1px)}.focus-city button:disabled{opacity:.3;cursor:default}.focus-city svg:not(.fc-chart){flex:none}.fc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.fc-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:23px 24px 0}.fc-heading{display:flex;gap:11px;align-items:center;min-width:0}.fc-emblem{width:34px;height:34px;border:1px solid var(--fc-border);border-radius:9px;display:grid;place-items:center;background:var(--fc-subtle);flex:none}.fc-heading h2{font-size:15px;font-weight:500;letter-spacing:-.3px;line-height:1.3;margin:0}.fc-heading p{font-size:12px;line-height:1.4;color:var(--fc-muted);margin:4px 0 0}.fc-tools{display:flex;align-items:center;gap:8px;flex:none}.fc-range{display:flex;position:relative;align-items:center}.fc-range select{appearance:none;background:var(--fc-surface);border:1px solid var(--fc-border);border-radius:7px;height:32px;padding:0 27px 0 10px;font-size:12px}.fc-range>svg{position:absolute;right:9px;pointer-events:none;color:var(--fc-muted)}.fc-switch{display:flex;padding:3px;background:var(--fc-subtle);border:1px solid var(--fc-border);border-radius:8px;gap:2px}.fc-switch button{display:flex;align-items:center;justify-content:center;gap:5px;border:0;background:transparent;border-radius:5px;height:25px;padding:0 8px;font-size:12px;color:var(--fc-muted)}.fc-switch button:hover{background:var(--fc-hover);color:var(--fc-ink)}.fc-switch button[aria-pressed=true]{background:var(--fc-selected);color:var(--fc-on-selected);box-shadow:0 1px 2px var(--fc-shadow)}.fc-switch button[aria-pressed=true]:hover{background:var(--fc-selected);color:var(--fc-on-selected)}
.fc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:26px 24px 21px}.fc-stats>div{display:flex;flex-direction:column}.fc-stats>div+div{padding-left:22px;border-left:1px solid var(--fc-border)}.fc-stats span{color:var(--fc-muted);font-size:12px}.fc-stats strong{display:block;font-size:24px;line-height:1.35;font-weight:500;letter-spacing:-.8px;margin:3px 0 2px;font-variant-numeric:tabular-nums;white-space:nowrap}.fc-stats em{font-size:15px;font-weight:400;font-style:normal;letter-spacing:-.2px}.fc-stats small{font-size:11px;color:var(--fc-muted)}
.fc-plot-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 24px;color:var(--fc-muted);font-size:11px;min-height:23px}.fc-plot-header>span{display:flex;align-items:center;gap:6px}.fc-camera{height:24px;width:24px;border:0;background:transparent;display:grid;place-items:center;border-radius:5px;padding:0}.fc-camera:hover{background:var(--fc-hover)}.fc-plot{position:relative;margin:0 10px;touch-action:pan-y}.fc-chart{display:block;overflow:visible;user-select:none}.fc-plot[data-view=city] .fc-chart{cursor:grab}.fc-dragging .fc-chart{cursor:grabbing!important}.fc-block{--fc-top:var(--fc-empty)}.fc-block[data-level="1"]{--fc-top:var(--fc-green-1)}.fc-block[data-level="2"]{--fc-top:var(--fc-green-2)}.fc-block[data-level="3"]{--fc-top:var(--fc-green-3)}.fc-block[data-level="4"]{--fc-top:var(--fc-green-4)}.fc-roof{fill:var(--fc-top)}.fc-left{fill:color-mix(in srgb,var(--fc-top) 87%,var(--fc-ink) 13%)}.fc-right{fill:color-mix(in srgb,var(--fc-top) 72%,var(--fc-ink) 28%)}.fc-face{transition:filter .14s ease}.fc-hovered .fc-face{filter:brightness(1.08)}.fc-axis text{fill:var(--fc-muted);font-size:11px;font-family:inherit}.fc-tooltip{position:absolute;min-width:150px;z-index:3;pointer-events:none;border:1px solid var(--fc-border);border-radius:8px;padding:8px 10px;box-shadow:0 4px 16px var(--fc-shadow);background:var(--fc-surface);display:flex;flex-direction:column;gap:2px;font-size:11px}.fc-tooltip>span{color:var(--fc-muted)}.fc-tooltip>strong{font-size:13px;font-weight:500}.fc-tooltip small{font-size:11px;color:var(--fc-muted);font-weight:400}
.fc-legend{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 24px 18px;font-size:11px;color:var(--fc-muted)}.fc-legend>div{display:flex;align-items:center;gap:4px}.fc-legend i{width:10px;height:10px;border-radius:2px;background:var(--fc-empty)}.fc-legend i[data-level="1"]{background:var(--fc-green-1)}.fc-legend i[data-level="2"]{background:var(--fc-green-2)}.fc-legend i[data-level="3"]{background:var(--fc-green-3)}.fc-legend i[data-level="4"]{background:var(--fc-green-4)}.fc-legend>div>span:first-child{margin-right:3px}.fc-legend>div>span:last-child{margin-left:3px}
.fc-day-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-top:1px solid var(--fc-border);background:var(--fc-subtle)}.fc-day-identity{display:flex;align-items:center;gap:10px;min-width:0}.fc-day-icon{display:grid;place-items:center;width:32px;height:32px;flex:none;border:1px solid var(--fc-border);background:var(--fc-surface);border-radius:8px;color:var(--fc-muted)}.fc-day-identity strong{display:block;font-weight:500;font-size:12px}.fc-day-identity div>span{display:block;color:var(--fc-muted);font-size:11px;font-variant-numeric:tabular-nums}.fc-middle-dot{padding:0 6px}.fc-day-nav{display:flex;gap:5px;align-items:center}.fc-day-nav button{width:30px;height:30px;display:grid;place-items:center;background:var(--fc-surface);border:1px solid var(--fc-border);border-radius:6px;padding:0}.fc-day-nav button:hover:not(:disabled){background:var(--fc-hover)}.fc-date-picker{margin-right:3px}.fc-date-picker input{width:122px;max-width:100%;font-size:11px;border:1px solid var(--fc-border);border-radius:6px;height:30px;padding:0 6px;background:var(--fc-surface);font-variant-numeric:tabular-nums}
@media(prefers-reduced-motion:reduce){.focus-city *,.focus-city *::before,.focus-city *::after{animation:none!important;transition:none!important}}
@media(max-width:560px){.fc-header{align-items:flex-start;flex-wrap:wrap;gap:14px;padding:19px 18px 0}.fc-tools{width:100%;justify-content:space-between}.fc-stats{margin:22px 18px 18px;gap:8px}.fc-stats>div+div{padding-left:12px}.fc-stats strong{font-size:21px}.fc-stats em{font-size:12px}.fc-plot-header{margin:0 18px}.fc-legend{margin:0 18px 16px}.fc-day-row{padding:14px 18px;flex-wrap:wrap}.fc-day-nav{margin-left:auto}.fc-sessions summary{padding-inline:18px}.fc-session-list{padding-inline:18px}.fc-stats span{font-size:11px}}
@media(max-width:380px){.fc-stats strong{font-size:19px;letter-spacing:-.6px}.fc-stats small{font-size:11px;max-width:86px}.fc-day-nav{width:100%;margin-left:0;justify-content:flex-end}.fc-date-picker{margin-right:auto}.fc-day-identity{width:100%}.fc-legend{gap:4px}}
@media(pointer:coarse){.fc-switch button{height:38px;min-width:44px}.fc-range select{height:44px;font-size:16px}.fc-day-nav button{width:44px;height:44px}.fc-date-picker input{height:44px;width:148px;font-size:16px}.fc-plot-header{min-height:32px}}
`