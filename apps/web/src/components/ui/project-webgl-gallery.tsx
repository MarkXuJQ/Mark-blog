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
const FOCUS_SCALE = 1 // scale of the focused card
const OUTER_SCALE = 0.92

// Movement: the only two drivers are a gentle scroll-linked drift and a 1:1
// drag. Both write to a shared `target` travel value that eases smoothly.
const WHEEL_SENS = 0.22 // px of fan travel per px of wheel deltaY
const EASE = 0.08 // exponential follow per frame
const DRAG_THRESHOLD = 4 // px before a pointer-down becomes a drag (vs click)
const HOVER_LIFT = 16 // px the hovered card is raised
const HOVER_DIM = 0.32 // opacity of non-hovered cards while one is hovered

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
  const reduced = useReducedMotion()
  const railRef = useRef<HTMLDivElement>(null)

  const total = items.length
  const viewportWidth = useViewportWidth()
  // Step scales with viewport so the fan always spans edge to edge.
  const STEP = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 160 : 196

  // ---- Shared travel value ----
  // Horizontal position of the fan, eased toward `target`. The target is the
  // sum of every interaction: wheel scroll drifts it gently, a drag moves it
  // 1:1 with the cursor. Keeping the eased `travel` separate from the target
  // gives a smooth glide after each scroll / release, and hovering freezes it.
  const targetRef = useRef(0)
  const travelRef = useRef(0)
  const [pos, setPos] = useState(0)

  // Whether the cursor is resting on a card. While true we stop accepting
  // scroll drift so the hovered card doesn't slide out from under the cursor
  // (which would flicker the selection back and forth).
  const hoveringRef = useRef(false)

  // Active drag session. `startX` is the pivot: the fan's travel stays locked
  // to that grab point so content follows the cursor exactly (not inverted).
  const dragRef = useRef<{
    startX: number
    startTravel: number
    moved: boolean
  } | null>(null)

  // ---- Ease loop: glide travel toward the interaction target ----
  useEffect(() => {
    if (reduced || !total) return
    let raf = 0
    const tick = () => {
      const current = travelRef.current
      const next = current + (targetRef.current - current) * EASE
      if (Math.abs(next - current) < 0.01) {
        travelRef.current = targetRef.current
      } else {
        travelRef.current = next
      }
      setPos(travelRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, total])

  // ---- Gentle horizontal drift from scroll (wheel over the gallery) ----
  // Mouse-wheel/scroll nudges the fan sideways by a small amount. While the
  // cursor hovers a card we skip it so the selection never jumps around.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const onWheel = (event: WheelEvent) => {
      if (hoveringRef.current || dragRef.current) return
      targetRef.current += event.deltaY * WHEEL_SENS
    }
    rail.addEventListener('wheel', onWheel, { passive: true })
    return () => rail.removeEventListener('wheel', onWheel)
  }, [])

  // ---- 1:1 drag with a locked pivot ----
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    // Lock the pivot: remember where the grab started and the travel then, so
    // the cards track the cursor exactly from this point (and can reverse).
    dragRef.current = {
      startX: event.clientX,
      startTravel: targetRef.current,
      moved: false,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD) drag.moved = true
    // Subtracting: dragging the content with the cursor is a negative travel
    // delta (travel increases → cards move left), so we push in the same
    // direction as the cursor. Setting the target directly (not +=) keeps the
    // grab pivot locked — no drift accumulates on top of the drag.
    targetRef.current = drag.startTravel - dx
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      // Release the pivot capture only if we took it.
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      } catch {
        /* pointer may already be released */
      }
    }
    dragRef.current = null
    targetRef.current = travelRef.current
  }

  // ---- Continuous fan frame ----
  // A natural travel value drives the slots. floor() keeps the phase fraction
  // continuous: as frac→1, slot r's x slides in with no positional jump, so
  // the fan moves fluidly for any (even unbounded) travel.
  const slotRaw = pos / STEP
  const slotFloor = Math.floor(slotRaw)
  const phase = slotRaw - slotFloor // shift in slots, in [0, 1)
  const centerIndex = ((slotFloor % total) + total) % total

  const halfSpan = Math.ceil(viewportWidth / STEP / 2) + 1
  const slots = useMemo(() => {
    const out: { item: ProjectWebglItem; rel: number }[] = []
    for (let rel = -halfSpan; rel < halfSpan; rel++) {
      const item = items[(((centerIndex + rel) % total) + total) % total]
      out.push({ item, rel })
    }
    return out
  }, [items, centerIndex, halfSpan, total])

  // Selection: which recycled slot the user is hovering. Used both to pause
  // drift (hoveringRef) and to drive the dim-others / lift-hovered effect.
  const [hoveredRel, setHoveredRel] = useState<number | null>(null)
  const [selected, setSelected] = useState<ProjectWebglItem | null>(null)

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

  return (
    <section
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
            // Continuous fan: each slot's x slides with the phase so the fan
            // scrolls fluidly; distance from focus governs scale / z.
            const x = (rel - phase) * STEP
            const dist = rel - phase
            const absDist = Math.abs(dist)
            const k =
              FOCUS_SCALE + (OUTER_SCALE - FOCUS_SCALE) * Math.min(1, absDist)
            const zIndex = Math.round(1000 - absDist * 100)
            const isCenter = absDist < 0.5

            // Hover selection: when a card is hovered, dim every other card
            // and raise the hovered one slightly. Default (no hover) uses the
            // distance-based fade so the fan still reads depth.
            const isHovered = hoveredRel === rel
            const anyHovered = hoveredRel !== null
            const opacity = anyHovered
              ? isHovered
                ? 1
                : HOVER_DIM
              : Math.max(1 - absDist * 0.28, 0.12)

            const liftY = isHovered ? -HOVER_LIFT : 0
            const transform = `translate3d(${x}px, ${liftY}px, ${
              -absDist * DEPTH_STEP
            }px) skewY(29.5deg) scale3d(${k}, ${k}, 1)`

            return (
              <button
                key={`slot-${rel}`}
                type="button"
                className={cn(
                  'mark-lab-webgl__card',
                  isCenter && 'is-focus',
                  isHovered && 'is-hovered',
                  anyHovered && !isHovered && 'is-dimmed'
                )}
                style={
                  {
                    zIndex,
                    transform,
                    '--mw-card-opacity': opacity,
                  } as CSSProperties
                }
                onMouseEnter={() => {
                  hoveringRef.current = true
                  setHoveredRel(rel)
                }}
                onMouseLeave={() => {
                  hoveringRef.current = false
                  setHoveredRel(null)
                }}
                onFocus={() => setHoveredRel(rel)}
                onBlur={() => setHoveredRel(null)}
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

export default ProjectWebglGallery