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
  theme?: string
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

// Fan look: a directional perspective rail. Unlike a symmetric fan (where the
// center card sits on top of both sides), the front of this fan is the LEFT and
// cards recede toward the RIGHT — so the left card overlaps and covers the one
// to its right. Every card keeps an exposed right edge, which also means any
// card is hover-selectable, not just the middle.
const PERSPECTIVE = 2200
const DEPTH_STEP = 4 // Z offset per slot away from front (px)
const FOCUS_SCALE = 1 // scale of the front (leftmost) card
const OUTER_SCALE = 0.92

// A curated set of accent hues used for per-project theme colors (the circular
// close badge). A project's id is hashed into this list so each project gets a
// stable, distinct "corresponding" color without touching content files.
const THEME_COLORS = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
]

function themeColorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return THEME_COLORS[h % THEME_COLORS.length]
}

// Movement: the only two drivers are a gentle scroll-linked drift and a 1:1
// drag. Both write to a shared `target` travel value that eases smoothly.
const WHEEL_SENS = 0.22 // px of fan travel per px of wheel deltaY
const EASE = 0.08 // exponential follow per frame
const DRAG_THRESHOLD = 4 // px before a pointer-down becomes a drag (vs click)
const HOVER_LIFT = 22 // px the hovered card is raised
const HOVER_NEIGHBOUR_LIFT = 12 // px its immediate neighbours are raised
const HOVER_DIM = 0.45 // fixed opacity for every non-selected card (binary)

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
  const STEP = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 200 : 270

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
  // While the user is actively dragging we bypass the easing entirely so the
  // fan tracks the cursor 1:1 with zero lag (跟手); the glide only re-engages
  // after release to settle the momentum smoothly.
  const draggingRef = useRef(false)
  useEffect(() => {
    if (reduced || !total) return
    let raf = 0
    const tick = () => {
      if (draggingRef.current) {
        // Direct follow: no easing, no lag.
        travelRef.current = targetRef.current
        setPos(travelRef.current)
      } else {
        const current = travelRef.current
        const next = current + (targetRef.current - current) * EASE
        if (Math.abs(next - current) < 0.01) {
          travelRef.current = targetRef.current
        } else {
          travelRef.current = next
        }
        setPos(travelRef.current)
      }
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
    if (!drag) {
      // No active drag → pure hover resolution over the fan.
      resolveHover(event.clientX, event.clientY)
      return
    }
    const dx = event.clientX - drag.startX
    if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      drag.moved = true
      draggingRef.current = true
      setHover(null) // dragging replaces hover selection
    }
    if (!drag.moved) return // not yet a drag; ignore jitter before the threshold
    // Subtracting: dragging the content with the cursor is a negative travel
    // delta (travel increases → cards move left), so we push in the same
    // direction as the cursor. Setting the target directly (not +=) keeps the
    // grab pivot locked — no drift accumulates on top of the drag.
    targetRef.current = drag.startTravel - dx
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wasDrag = dragRef.current?.moved ?? false
    const endX = event.clientX
    const endY = event.clientY
    draggingRef.current = false
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
    // A press that never became a drag is a tap/click — open the topmost card
    // under the release point (same occlusion-aware resolution as hover).
    if (!wasDrag) {
      const hit = findCardAtPoint(endX, endY)
      if (hit) openProject(hit.item, hit.rel)
    }
  }

  // ---- Robust pointer activity at the rail level ----
  // The cards are skewed 3D surfaces inside a `preserve-3d` perspective, and
  // native hit-testing over them is unreliable across browsers. Instead we pick
  // the card under the pointer ourselves: among the cards whose projected
  // bounding box contains the point, choose the one that is in front (smallest
  // depth / highest z — exactly the occlusion order). This reliably resolves
  // both hover ("hover any card") and click selection.
  const findCardAtPoint = (
    clientX: number,
    clientY: number
  ): { item: ProjectWebglItem; rel: number } | null => {
    const rail = railRef.current
    if (!rail) return null
    let bestRel: number | null = null
    let bestDepth = -Infinity
    for (const child of rail.children) {
      const el = child as HTMLElement
      if (!el.dataset) continue
      if (el.dataset.card !== '1') continue // only card nodes
      const rect = el.getBoundingClientRect()
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        continue
      }
      // zIndex encodes occlusion depth (higher = in front / further left).
      const depth = parseInt(el.style.zIndex, 10) || 0
      if (depth > bestDepth) {
        bestDepth = depth
        bestRel = Number(el.dataset.rel)
      }
    }
    if (bestRel === null) return null
    const slot = slots.find((s) => s.rel === bestRel)
    if (!slot) return null
    return { item: slot.item, rel: bestRel }
  }

  const resolveHover = (clientX: number, clientY: number) => {
    if (dragRef.current) return // dragging owns the pointer
    const hit = findCardAtPoint(clientX, clientY)
    const rel = hit ? hit.rel : null
    if (hoveredRelRef.current !== rel) setHover(rel)
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
  const hoveredRelRef = useRef<number | null>(null)
  const setHover = (rel: number | null) => {
    hoveredRelRef.current = rel
    setHoveredRel(rel)
  }
  const [selected, setSelected] = useState<ProjectWebglItem | null>(null)
  // The slot being "pulled out" toward the viewer. While set we keep its card
  // growing and rising out of the fan for a beat, then swap in the modal.
  const [pullingRel, setPullingRel] = useState<number | null>(null)
  const pullTimer = useRef<number | null>(null)

  const openProject = (item: ProjectWebglItem, rel: number) => {
    if (dragRef.current?.moved) return
    hoveredRelRef.current = null
    setHoveredRel(null)
    setPullingRel(rel)
    // Give the pull-out animation time to play before the modal replaces it,
    // so the card visibly separates from the fan and comes forward.
    if (pullTimer.current) window.clearTimeout(pullTimer.current)
    pullTimer.current = window.setTimeout(() => {
      setPullingRel(null)
      setSelected(item)
    }, 220)
  }

  const closeProject = useCallback(() => {
    if (pullTimer.current) window.clearTimeout(pullTimer.current)
    pullTimer.current = null
    setPullingRel(null)
    setSelected(null)
  }, [])

  useEffect(() => () => closeProject(), [closeProject])

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
          onPointerLeave={() => setHover(null)}
        >
          {slots.map(({ item, rel }) => {
            // Directional left-front fan: the card at the LEFT edge of the
            // visible band is the front/top of the train; cards to its RIGHT
            // recede in Z, shrink and step behind, so the left card overlaps
            // and covers the one next to it (instead of a symmetric center
            // sitting on top of both sides). As the rail scrolls, the front
            // follows the recycle anchor — the "high" card travels with drag,
            // and because every card exposes a right edge, any card in the
            // band is hover-selectable, not just the middle.
            const x = (rel - phase) * STEP
            const dist = rel - phase // signed: ↗ = further right = further back
            // depth = 0 at the left edge of the screen, growing rightward.
            const depth = Math.max(0, dist + (halfSpan - 1))
            const recede = Math.min(1, depth / (halfSpan * 2))
            // Shrink from FOCUS_SCALE (front/left) down to OUTER_SCALE (right).
            const k =
              FOCUS_SCALE - (FOCUS_SCALE - OUTER_SCALE) * recede
            // Left cards sit toward the viewer (less-negative Z) and on top
            // (higher z) so they stack in front of the cards to their right.
            const zDepth = -depth * DEPTH_STEP
            const zIndex = Math.round(2000 - depth * 90)
            const isCenter = depth < 0.5

            // Hover selection — simple and cheap. Only the hovered card and its
            // two immediate neighbours change height (peak on the hovered card,
            // half on each side); all other cards keep their height. Opacity is
            // binary: the selected card is fully opaque, every other card drops
            // to one fixed dim level — no gaussian wash, no gradual transitions,
            // so the eye isn't exhausted by constant motion.
            const isHovered = hoveredRel === rel
            const anyHovered = hoveredRel !== null
            const hoverDist = anyHovered ? Math.abs(rel - hoveredRel) : Infinity

            let opacity = 1
            let liftY = 0
            if (anyHovered) {
              // Binary opacity: all-or-nothing.
              opacity = isHovered ? 1 : HOVER_DIM
              // Height only changes within ±1 slot of the hovered card.
              if (hoverDist === 0) liftY = -HOVER_LIFT
              else if (hoverDist === 1) liftY = -HOVER_NEIGHBOUR_LIFT
            }

            const transform = `translate3d(${x}px, ${liftY}px, ${zDepth}px) skewY(29.5deg) scale3d(${k}, ${k}, 1)`

            const isPulled = pullingRel === rel
            // While a card is being pulled out, give it real lift: nudge it
            // toward the viewer (way more depth), drop the skew, scale it up,
            // and raise it high above the fan so it reads as detaching. Its z
            // peaks above everything (the mask yields to the outgoing card).
            const pullTransform =
              `translate3d(${x}px, -${HOVER_LIFT * 2.4}px, 520px) ` +
              `skewY(0deg) scale3d(1.45, 1.45, 1)`

            return (
              <button
                key={`slot-${rel}`}
                type="button"
                className={cn(
                  'mark-lab-webgl__card',
                  isCenter && 'is-focus',
                  isHovered && 'is-hovered',
                  anyHovered && !isHovered && 'is-dimmed',
                  isPulled && 'is-pulled'
                )}
                style={
                  {
                    zIndex: isPulled ? 3000 : zIndex,
                    transform: isPulled ? pullTransform : transform,
                    '--mw-card-opacity': isPulled ? 1 : opacity,
                  } as CSSProperties
                }
                data-card="1"
                data-rel={rel}
                onMouseEnter={() => {
                  hoveringRef.current = true
                  setHover(rel)
                }}
                onMouseLeave={() => {
                  if (hoveredRelRef.current === rel) {
                    hoveringRef.current = false
                    setHover(null)
                  }
                }}
                onFocus={() => setHover(rel)}
                onBlur={() => {
                  hoveredRelRef.current = null
                  setHoveredRel(null)
                }}
                onClick={() => openProject(item, rel)}
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
            style={ { '--mw-modal-theme': themeColorFor(selected.id) } as CSSProperties }
          >
            {selected.preview ? (
              <div className="mark-lab-webgl__modal-preview">
                <picture>
                  {selected.preview.avifSrc ? (
                    <source srcSet={selected.preview.avifSrc} />
                  ) : null}
                  <img
                    src={selected.preview.src}
                    alt={selected.preview.alt}
                  />
                </picture>
              </div>
            ) : null}

            <button
              type="button"
              className="mark-lab-webgl__modal-close"
              aria-label={closeLabel}
              onClick={closeProject}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>

            <div className="mark-lab-webgl__modal-card">
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