import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/classNames'
import { useSectionScrollProgress } from '@/hooks/useSectionScrollProgress'

export type ProjectWebglLink = {
  href: string
  label: string
  icon: IconType
}

export type ProjectWebglItem = {
  id: string
  title: string
  description: string
  preview?: {
    src: string
    avifSrc?: string
    objectFit?: 'cover' | 'contain'
    alt: string
  }
  links: ProjectWebglLink[]
}

type ProjectWebglGalleryProps = {
  items: ProjectWebglItem[]
  title: string
  description: string
  openLabel: string
  hintScroll?: string
  hintDrag?: string
  hintClick?: string
  closeLabel?: string
  className?: string
}

// Fan look: horizontal perspective rail where cards sit at evenly spaced steps
// around a focused center slot, receding in Z and dimming away from focus.
const PERSPECTIVE = 2200
const DEPTH_STEP = 4 // Z offset per slot away from center (px)
const FOCUS_SCALE = 1 // scale of the center card
const OUTER_SCALE = 0.92

function useViewportWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  )
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

export function ProjectWebglGallery({
  items,
  title,
  description,
  openLabel,
  hintScroll,
  hintDrag,
  hintClick,
  closeLabel = 'Close',
  className,
}: ProjectWebglGalleryProps) {
  const { ref, progress } = useSectionScrollProgress<HTMLElement>()
  const railRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; offset: number; moved: boolean } | null>(
    null
  )
  const [dragOffset, setDragOffset] = useState(0)
  const [selected, setSelected] = useState<ProjectWebglItem | null>(null)

  const total = items.length
  const viewportWidth = useViewportWidth()

  // Step scales with viewport so the fan always spans nicely edge to edge.
  const STEP = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 160 : 196

  // Continuous driving position: scroll progress moves it forward, drag nudges
  // it freely. Never clamped -> the fan keeps advancing forever.
  const scrollPx = useReducedMotion() ? 0 : progress * 2600
  const t = scrollPx + dragOffset // horizontal travel in px

  // Seamless infinite loop: cards live on a ring of `total` slots spanning
  // STEP px each. Which item sits at the focused center slides continuously
  // with t; `f` is the px drift within the ring, so adjacent frames keep the
  // arrangement visually continuous as t grows toward infinity.
  const centerSlot = Math.round(t / STEP)
  const centerIndex = ((centerSlot % total) + total) % total
  const f = t - centerSlot * STEP // remainder in [-STEP/2, STEP/2]

  // Build a full fan frame. Render roughly enough slots to cover the viewport
  // on both sides of center, each mapped to an item via modulo wrap.
  const halfSpan = Math.ceil(viewportWidth / STEP / 2) + 1
  const slots = useMemo(() => {
    const out: { item: ProjectWebglItem; rel: number }[] = []
    for (let rel = -halfSpan + 1; rel < halfSpan; rel++) {
      const item = items[(((centerIndex + rel) % total) + total) % total]
      out.push({ item, rel })
    }
    return out
  }, [items, centerIndex, halfSpan, total])

  const openProject = (item: ProjectWebglItem) => {
    if (dragRef.current?.moved) return
    setSelected(item)
  }

  const closeProject = useCallback(() => setSelected(null), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProject()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeProject])

  if (!total) return null

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragRef.current = { x: event.clientX, offset: dragOffset, moved: false }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = event.clientX - dragRef.current.x
    if (Math.abs(dx) > 4) {
      dragRef.current.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setDragOffset(dragRef.current.offset + dx)
  }

  const handlePointerEnd = () => {
    dragRef.current = null
  }

  return (
    <section
      ref={ref}
      className={cn('mark-lab-webgl', className)}
      aria-label={title}
    >
      <div className="mark-lab-webgl__stage">
        <div className="mark-lab-webgl__header">
          <h2 id="mark-lab-webgl-title">{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>

        <div
          ref={railRef}
          className="mark-lab-webgl__air"
          style={
            {
              '--mw-perspective': `${PERSPECTIVE}px`,
            } as CSSProperties
          }
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {slots.map(({ item, rel }) => {
            const isCenter = rel === 0
            const absRel = Math.abs(rel)
            const x = rel * STEP + f
            const z = -absRel * DEPTH_STEP
            const scale = isCenter ? FOCUS_SCALE : OUTER_SCALE
            const zIndex = 1000 - absRel
            const transform = `translate3d(${x}px, 0, ${z}px) skewY(29.5deg) scale3d(${scale}, ${scale}, 1)`

            return (
              <button
                key={`slot-${rel}`}
                type="button"
                className={cn(
                  'mark-lab-webgl__card',
                  isCenter && 'is-focus'
                )}
                style={
                  {
                    zIndex,
                    transform,
                    '--mw-card-opacity': Math.max(1 - absRel * 0.16, 0.12),
                  } as CSSProperties
                }
                onClick={() => openProject(item)}
              >
                <span className="mark-lab-webgl__card-face">
                  {item.preview ? (
                    <picture>
                      {item.preview.avifSrc ? (
                        <source
                          srcSet={item.preview.avifSrc}
                          type="image/avif"
                        />
                      ) : null}
                      <img
                        src={item.preview.src}
                        alt={item.preview.alt}
                        draggable={false}
                        className={
                          item.preview.objectFit === 'contain'
                            ? 'object-contain'
                            : 'object-cover'
                        }
                      />
                    </picture>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mark-lab-webgl__card-empty"
                    />
                  )}
                  <span
                    className="mark-lab-webgl__card-shade"
                    aria-hidden="true"
                  />
                  <span className="mark-lab-webgl__card-name">
                    {item.title}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mark-lab-webgl__hint" aria-hidden="true">
          <span>{hintScroll ?? 'Scroll'}</span>
          <span>{hintDrag ?? 'Drag'}</span>
          <span>{hintClick ?? 'Click a project'}</span>
        </div>
      </div>

      {selected ? (
        <div className="mark-lab-webgl__modal" role="presentation">
          <div
            className="mark-lab-webgl__modal-backdrop"
            aria-hidden="true"
            onMouseDown={closeProject}
          />
          <div
            className="mark-lab-webgl__modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            aria-labelledby="mark-lab-webgl-modal-title"
            tabIndex={-1}
          >
            <button
              type="button"
              className="mark-lab-webgl__modal-close"
              aria-label={closeLabel}
              onClick={closeProject}
            >
              ×
            </button>
            {selected.preview ? (
              <div className="mark-lab-webgl__modal-preview">
                <picture>
                  {selected.preview.avifSrc ? (
                    <source srcSet={selected.preview.avifSrc} />
                  ) : null}
                  <img src={selected.preview.src} alt={selected.preview.alt} />
                </picture>
              </div>
            ) : null}
            <div className="mark-lab-webgl__modal-body">
              <h3 id="mark-lab-webgl-modal-title">{selected.title}</h3>
              <p>{selected.description}</p>
              <div className="mark-lab-webgl__actions">
                {selected.links.map((link) => {
                  const LinkIcon = link.icon
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${openLabel}: ${link.label}`}
                    >
                      <LinkIcon aria-hidden="true" />
                      <span>{link.label}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

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

export default ProjectWebglGallery