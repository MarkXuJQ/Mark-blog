import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/classNames'

export type SqueezeSlide = {
  id?: string | number
  title: string
  description?: string
  image?: string
  imageSrcSet?: string
  imageAlt?: string
  imageObjectFit?: 'cover' | 'contain'
  background?: string
  overlay?: ReactNode
  actions?: ReactNode
  action?: string
  href?: string
  target?: string
  onAction?: () => void
}

type SqueezeCarouselProps = {
  slides: SqueezeSlide[]
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  height?: number | string
  radius?: number | string
  duration?: number
  autoplay?: boolean
  interval?: number
  controls?: boolean
  accent?: string
  label?: string
  className?: string
  panelClassName?: string
}

const asCssSize = (value: number | string) =>
  typeof value === 'number' ? `${value}px` : value

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])

  return reduced
}

function Arrow({
  direction,
  label,
  onClick,
}: {
  direction: 'previous' | 'next'
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--sq-accent)] focus-visible:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {direction === 'previous' ? '‹' : '›'}
      </span>
    </button>
  )
}

export function SqueezeCarousel({
  slides,
  defaultIndex = 0,
  onIndexChange,
  height = 'clamp(190px, 34cqi, 360px)',
  radius = 12,
  duration = 700,
  autoplay = false,
  interval = 6000,
  controls = true,
  accent = 'var(--brand-600)',
  label = 'Featured projects',
  className,
  panelClassName,
}: SqueezeCarouselProps) {
  const count = slides.length
  const [active, setActive] = useState(() =>
    count ? Math.min(Math.max(defaultIndex, 0), count - 1) : 0
  )
  const [hovered, setHovered] = useState<number | null>(null)
  const id = useId()
  const reduced = useReducedMotion()
  const transition = reduced ? '0ms' : `${duration}ms`

  useEffect(() => {
    onIndexChange?.(active)
  }, [active, onIndexChange])

  useEffect(() => {
    if (!autoplay || reduced || count < 2 || hovered !== null) return
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % count),
      interval
    )
    return () => window.clearTimeout(timer)
  }, [active, autoplay, count, hovered, interval, reduced])

  const widths = useMemo(() => {
    if (count === 1) return ['100%']

    const inactiveWidth = 8
    const gapCount = count - 1
    const activeWidth = `calc(100% - ${inactiveWidth * gapCount}% - ${gapCount} * var(--sq-gap))`

    return slides.map((_, index) =>
      index === active ? activeWidth : `${inactiveWidth}%`
    )
  }, [active, count, slides])

  if (!count) return null

  const move = (index: number) => {
    setHovered(null)
    setActive((index + count) % count)
  }

  const activeSlide = slides[active]
  const variables = {
    '--sq-height': asCssSize(height),
    '--sq-radius': asCssSize(radius),
    '--sq-gap': '0.5rem',
    '--sq-duration': transition,
    '--sq-accent': accent,
  } as CSSProperties

  return (
    <div
      className={cn('w-full', className)}
      style={{ ...variables, containerType: 'inline-size' }}
      onMouseLeave={() => setHovered(null)}
      onFocusCapture={() => setHovered(active)}
      aria-label={label}
    >
      {controls && count > 1 ? (
        <div className="mb-4 flex justify-end gap-2">
          <Arrow
            direction="previous"
            label="Previous project"
            onClick={() => move(active - 1)}
          />
          <Arrow
            direction="next"
            label="Next project"
            onClick={() => move(active + 1)}
          />
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label={label}
        className="flex h-[var(--sq-height)] min-h-0 w-full gap-[var(--sq-gap)] overflow-hidden sm:[--sq-gap:0.75rem]"
      >
        {slides.map((slide, index) => {
          const isActive = index === active
          const isHovered = hovered === index
          const isHighlighted = isActive || isHovered
          return (
            <button
              key={slide.id ?? index}
              id={`${id}-tab-${index}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${id}-panel`}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => move(index)}
              onMouseEnter={() => setHovered(index)}
              className={cn(
                'group relative isolate h-full min-w-0 shrink-0 cursor-pointer overflow-hidden bg-slate-200 p-0 text-left transition-[width,filter,opacity,box-shadow] ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--sq-accent)] focus-visible:ring-offset-2 dark:bg-slate-800',
                isHighlighted
                  ? 'opacity-100 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.65)] brightness-100'
                  : 'opacity-60 brightness-75 hover:opacity-90 hover:brightness-100',
                panelClassName
              )}
              style={{
                width: widths[index],
                borderRadius: 'var(--sq-radius)',
                transitionDuration: transition,
              }}
            >
              {slide.image ? (
                <picture className="absolute inset-0 block h-full w-full">
                  {slide.imageSrcSet ? (
                    <source srcSet={slide.imageSrcSet} type="image/avif" />
                  ) : null}
                  <img
                    src={slide.image}
                    alt={slide.imageAlt ?? ''}
                    draggable={false}
                    className={cn(
                      'h-full w-full transition-transform duration-700 group-hover:scale-[1.02]',
                      slide.imageObjectFit === 'contain'
                        ? 'object-contain'
                        : 'object-cover object-top'
                    )}
                  />
                </picture>
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: slide.background ?? 'var(--brand-600)' }}
                />
              )}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent"
              />
              {slide.overlay ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end p-4 text-white sm:p-5">
                  <span className="truncate text-sm font-semibold sm:text-base">
                    {slide.overlay}
                  </span>
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-live="polite"
        className="mt-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <p className="max-w-3xl text-[15px] leading-7 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-950 dark:text-slate-50">
              {activeSlide.title}
            </span>
            {activeSlide.description ? ` ${activeSlide.description}` : null}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
            {activeSlide.actions}
            {activeSlide.action && activeSlide.href ? (
              <a
                href={activeSlide.href}
                target={activeSlide.target}
                rel={activeSlide.target === '_blank' ? 'noreferrer' : undefined}
                onClick={activeSlide.onAction}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--sq-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[var(--sq-accent)] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {activeSlide.action}
                <span aria-hidden="true">→</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SqueezeCarousel
