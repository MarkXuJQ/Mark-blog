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
  theme?: string
}

type ProjectWebglGalleryProps = {
  items: ProjectWebglItem[]
  title: string
  description: string
  openLabel: string
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

// Movement: the fan is driven chiefly by page scroll (the pinned track) with a
// 1:1 drag on top. Both write to a shared `target` travel value that eases.
const SCROLL_RANGE = 2600 // px of fan travel across the full sticky track
const DRAG_THRESHOLD = 4 // px before a pointer-down becomes a drag (vs click)
const HOVER_LIFT = 22 // px the hovered card is raised
const HOVER_NEIGHBOUR_LIFT = 12 // px its immediate neighbours are raised
const HOVER_DIM = 0.45 // fixed opacity for every non-selected card (binary)

// Hover lift is a spring too: the hovered card (and its neighbours) rise and
// fall with a gentle, critically-damped curve — no jelly overshoot, just a
// smooth, deliberate rise.
const HOVER_LIFT_RATE = 0.09 // exponential approach rate (larger = quicker lift)

// ---- Damped travel (slower, elegant glide) ----
// The fan position is a strongly-damped spring chasing the interaction target.
// It accelerates toward the target then decelerates smoothly to a stop — a
// single, imperceptible approach with no visible side-to-side jello. Inertia is
// shown by a subtle card tilt driven by velocity (see TILT_* below) instead of
// the strip visibly bouncing.
const SPRING_STIFFNESS = 0.045 // per-frame pull toward target (lower = slower glide)
const SPRING_DAMPING = 0.9 // velocity retention — high → settles without oscillation

// ---- Inertia cue: velocity-driven tilt ----
// As the fan moves, cards cant horizontally (rotateY) a little, conveying
// momentum; the cant grows with speed and eases away as it winds down. Kept
// subtle so it reads as weight, not wobble. Direction is purely horizontal.
const TILT_FACTOR = 0.015 // degrees of rotateY per unit of travel velocity
const TILT_MAX = 4 // degrees — hard ceiling so it never over-rotates
const TILT_SPRING_STIFFNESS = 0.09
const TILT_SPRING_DAMPING = 0.88

// ---- Drag plane-flex (acceleration shown through shape, not recoil) ----
// Dragging fast must NOT bounce the strip back on release. Instead the strip's
// plane flexes: cards behind the grab lean slightly in the direction of motion
// (a per-card rotateY that falls off with distance), subdividing the "surface"
// so the acceleration reads as a deformation of the plane — then they recover
// flat at rest. No positional recoil is ever applied.
const DRAG_TILT_FACTOR = 0.28 // degrees of extra rotateY per unit of drag velocity
const DRAG_TILT_MAX = 7 // hard ceiling for the lean, so it looks like fabric not foam
const DRAG_TILT_RANGE = 0.5 // how quickly the lean falls off away from the grab
const PULL_VEL_SMOOTH = 0.5 // low-pass on the sampled drag velocity for steadier lean

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
  closeLabel = 'Close',
  className,
}: ProjectWebglGalleryProps) {
  const reduced = useReducedMotion()
  const railRef = useRef<HTMLDivElement>(null)
  // Scroll-coupled track: as the pinned section scrolls through the page,
  // `progress` (0→1 over the 280vh track) advances the fan through the project
  // list. It re-anchors the base position; drag adds a free offset on top.
  const { ref: sectionRef, progress } = useSectionScrollProgress<HTMLElement>()
  const progressRef = useRef(0)
  progressRef.current = progress

  const total = items.length
  const viewportWidth = useViewportWidth()
  // Step scales with viewport so the fan always spans edge to edge.
  const STEP = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 200 : 270

  // ---- Shared travel value ----
  // Horizontal position of the fan, eased toward `target`. The target is the
  // scroll base (page scroll through the pinned stage) plus any drag offset,
  // so scrolling the page carries the list forward while a drag freely nudges
  // it on top. Keeping the eased `travel` separate from the target gives a
  // smooth glide after each change.
  const scrollBaseRef = useRef(0) // progress * SCROLL_RANGE
  const dragOffsetRef = useRef(0) // free offset the user drags/wheels
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
    startOffset: number
    moved: boolean
    grabRel: number | null
    lastX: number
    lastT: number
    vel: number
  } | null>(null)

  // Mirrors of the live drag shear state for the per-frame render. Updated by
  // the pointer handlers; read every frame in the fan layout so a fast drag
  // shears the strip without needing a re-render on every pointermove.
  const dragGrabRelRef = useRef<number | null>(null)
  const dragVelRef = useRef(0)

  // Inertia tilt: a horizontal rotateY on every card driven by the strip's
  // velocity, eased by its own spring so it grows with speed and melts away as
  // the glide winds down — the "momentum" cue that reads as weight, not jello.
  const tiltRef = useRef(0)
  const tiltVelRef = useRef(0)
  const [tilt, setTilt] = useState(0)

  // Helium for hover lift: a spring-driven value in [0,1] that eases after the
  // hovered card changes so the lift rises and falls with a gentle curve.
  const hoverAmtRef = useRef(0)
  const [hoverAmt, setHoverAmt] = useState(0)

  // Pull-out progress (0..~1): a spring driving the card that flies out of the
  // fan toward the modal so the raise/scale/tilt follows a curved, overshooty
  // ease (inertia) rather than a linear ramp.
  const pullAmtRef = useRef(0)
  const pullAmtVelRef = useRef(0)
  const [pullAmt, setPullAmt] = useState(0)

  // ---- Springy travel: glide travel toward the interaction target ----
  // While the user is actively dragging we bypass the easing entirely so the
  // fan tracks the cursor 1:1 with zero lag (跟手). Between interactions the
  // travel is a damped spring chasing `target`: it accelerates toward the new
  // target, may overshoot once, then settles — giving scroll / release nudges
  // a physical curve, inertia and a gentle stop. Drag velocity is tracked so a
  // fast flick can be handed off to the spring on release.
  const draggingRef = useRef(false)
  const travelVelRef = useRef(0) // px/frame along the fan
  useEffect(() => {
    if (reduced || !total) return
    let raf = 0
    const tick = () => {
      // Recompute the target each frame: the page-scroll base (progress over
      // the pinned track) plus any free offset the user has dragged. This is
      // how scrolling the page carries the list forward while a drag rides on
      // top. `reduced`/inactive fall through below.
      scrollBaseRef.current = (reduced ? 0 : progressRef.current) * SCROLL_RANGE
      targetRef.current = scrollBaseRef.current + dragOffsetRef.current
      if (draggingRef.current) {
        // Direct follow: no easing, no lag, position locked to the cursor.
        travelRef.current = targetRef.current
        setPos(travelRef.current)
      } else {
        const current = travelRef.current
        const target = targetRef.current
        // Critically-damped spring: accelerate toward the target, then clamp so
        // it can never slide past and wobble back — the fan approaches in one
        // smooth, horizontal pass instead of jello-ing either way.
        travelVelRef.current =
          travelVelRef.current * SPRING_DAMPING +
          (target - current) * SPRING_STIFFNESS
        let next = current + travelVelRef.current
        let overshot = false
        if ((target - current) * (next - target) > 0) {
          next = target // clamp on first arrival — never pass the target
          overshot = true
        }
        travelRef.current = next
        // On arrival (clamped or essentially there), kill residual velocity so
        // the fan stays put instead of bounding off the target repeatedly.
        if (overshot || (Math.abs(target - next) < 0.001 && Math.abs(travelVelRef.current) < 0.001)) {
          travelRef.current = target
          travelVelRef.current = 0
        }
        setPos(travelRef.current)
      }
      // Hover lift: the hovered card (and neighbours) rise and fall with a smooth,
// monotonic exponential — accelerating at first, then easing into place with
// zero overshoot. No vertical jello; the lively inertia cue is the horizontal
// tilt from velocity.
      {
        const targetAmt = hoveredRelRef.current !== null ? 1 : 0
        const a = hoverAmtRef.current
        if (Math.abs(targetAmt - a) < 0.0005) {
          hoverAmtRef.current = targetAmt
        } else {
          hoverAmtRef.current = a + (targetAmt - a) * HOVER_LIFT_RATE
        }
        setHoverAmt(hoverAmtRef.current)
      }
      // Pull-out spring: chase 1 while a card is being pulled out, else 0.
      {
        const pulling = pullingRelRef.current !== null
        const tA = pulling ? 1 : 0
        const a = pullAmtRef.current
        const nv =
          pullAmtVelRef.current * SPRING_DAMPING +
          (tA - a) * SPRING_STIFFNESS
        pullAmtVelRef.current = nv
        let na = a + nv
        let overshot = false
        if ((tA - a) * (na - tA) > 0) {
          na = tA // no overshoot
          overshot = true
        }
        if (overshot || (Math.abs(tA - na) < 0.0001 && Math.abs(nv) < 0.001)) {
          pullAmtRef.current = tA
          pullAmtVelRef.current = 0
        } else {
          pullAmtRef.current = na
        }
        setPullAmt(pullAmtRef.current)
      }
      // Inertia tilt: chase the velocity-derived target, clamped, with its own
      // gentle spring. Velocity from the current glide (or the live drag).
      {
        const vel = draggingRef.current ? dragVelRef.current : travelVelRef.current
        const target = Math.max(-TILT_MAX, Math.min(TILT_MAX, vel * TILT_FACTOR))
        const a = tiltRef.current
        const nv =
          tiltVelRef.current * TILT_SPRING_DAMPING +
          (target - a) * TILT_SPRING_STIFFNESS
        tiltVelRef.current = nv
        const na = a + nv
        if (Math.abs(target - na) < 0.005 && Math.abs(nv) < 0.005) {
          tiltRef.current = target
        } else {
          tiltRef.current = na
        }
        setTilt(tiltRef.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, total])

  // 1:1 drag with a locked pivot. Page scroll (the sticky track) drives the
  // fan forward; a drag adds a free offset on top, pivoting from where the
  // user grabs so content follows the cursor exactly and can reverse.
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    // Which card is being grabbed (used by the drag-shear effect). The card in
    // front under the pointer, if any.
    const grab = findCardAtPoint(event.clientX, event.clientY)
    const now = performance.now()
    // Lock the pivot: remember where the grab started and the travel then, so
    // the cards track the cursor exactly from this point (and can reverse).
    dragRef.current = {
      startX: event.clientX,
      startOffset: dragOffsetRef.current,
      moved: false,
      grabRel: grab ? grab.rel : null,
      // Velocity sampling for momentum / shear hand-off.
      lastX: event.clientX,
      lastT: now,
      vel: 0,
    }
    dragGrabRelRef.current = grab ? grab.rel : null
    dragVelRef.current = 0
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
    // delta (travel increases → cards move left). The offset pivots from where
    // the grab began so content tracks the cursor exactly (and can reverse).
    dragOffsetRef.current = drag.startOffset - dx
    // Sample horizontal velocity (travel px/frame) to drive the plane-flex lean.
    const nowT = performance.now()
    const dt = nowT - drag.lastT
    if (dt > 0) {
      const v = ((event.clientX - drag.lastX) / dt) * 16 // normalize to ~60fps frames
      drag.vel =
        v * PULL_VEL_SMOOTH + drag.vel * (1 - PULL_VEL_SMOOTH) // low-pass
      drag.lastX = event.clientX
      drag.lastT = nowT
      dragVelRef.current = drag.vel
    }
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const wasDrag = drag?.moved ?? false
    const endX = event.clientX
    const endY = event.clientY
    draggingRef.current = false
    if (drag) {
      // Release the pivot capture only if we took it.
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId)
      } catch {
        /* pointer may already be released */
      }
      // No positional momentum hand-off: on release the strip holds exactly
      // where it was let go, so it never glides then springs back (recoil). Any
      // lingering velocity is discarded — the plane-flex tilt already conveyed
      // the acceleration, so a positional shove is unnecessary and would read
      // as the whole list bouncing.
      travelVelRef.current = 0
    }
    dragRef.current = null
    dragGrabRelRef.current = null
    dragVelRef.current = 0
    // A press that never became a drag is a tap/click — open the topmost card
    // under the release point (same occlusion-aware resolution as hover).
    if (!wasDrag) {
      const hit = findCardAtPoint(endX, endY)
      if (hit) openProject(hit.item)
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
  const pullingRelRef = useRef<number | null>(null)
  const setPulling = (rel: number | null) => {
    pullingRelRef.current = rel
    setPullingRel(rel)
  }

  const openProject = (item: ProjectWebglItem) => {
    if (dragRef.current?.moved) return
    hoveredRelRef.current = null
    setHoveredRel(null)
    pullAmtVelRef.current = 0
    pullAmtRef.current = 0
    setPullAmt(0)
    // Open the modal directly: the preview image is the modal content, rising
    // in with one clean motion and the intro card popping over it — no
    // pull-then-handoff double stage.
    setSelected(item)
    setPulling(null)
  }

  const closeProject = useCallback(() => {
    setSelected(null)
    setPulling(null)
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
      ref={sectionRef}
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

            // ---- Drag plane-flex ----
            // Dragging fast does not shove the strip (no recoil); instead the
            // plane of cards visibly bends: the grabbed card and the cards
            // trailing behind it (larger `rel`, receding to the right) lean
            // slightly in the drag direction — a per-card rotateY that falls
            // off with distance from the grab. It reads as the surface of the
            // fan deforming under acceleration, and recovers flat as velocity
            // bites. No positional offset is produced, so nothing bounces on
            // release.
            let dragTilt = 0
            {
              const grabRel = dragGrabRelRef.current
              const dVel = dragVelRef.current
              if (grabRel !== null && draggingRef.current && Math.abs(dVel) > 0.01) {
                const delta = rel - grabRel
                // Lean the grabbed card and everything behind it (delta ≥ 0);
                // cards ahead stay flat so the flex looks like a bend, not a twist.
                if (delta >= 0) {
                  const falloff = Math.exp(-(delta * delta) * DRAG_TILT_RANGE)
                  const lean = DRAG_TILT_FACTOR * dVel * falloff
                  dragTilt = Math.max(-DRAG_TILT_MAX, Math.min(DRAG_TILT_MAX, lean))
                }
              }
            }

            const dragAngle = tilt + dragTilt

            const x = (rel - phase) * STEP

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
              // Height only changes within ±1 slot of the hovered card. The
              // magnitude is scaled by the springy `hoverAmt` so the lift rises
              // and falls with a curve (and a touch of overshoot) instead of
              // teleporting between heights.
              if (hoverDist === 0) liftY = -HOVER_LIFT * hoverAmt
              else if (hoverDist === 1) liftY = -HOVER_NEIGHBOUR_LIFT * hoverAmt
            }

            const transform = `translate3d(${x}px, ${liftY}px, ${zDepth}px) skewY(29.5deg) rotateY(${dragAngle}deg) scale3d(${k}, ${k}, 1)`

            const isPulled = pullingRel === rel
            // While a card is being pulled out, give it real lift: nudge it
            // toward the viewer (way more depth), drop the skew, scale it up,
            // and raise it high above the fan so it reads as detaching. Its z
            // peaks above everything (the mask yields to the outgoing card).
            // `pullAmt` springs from 0→1 (with overshoot) so the card's rise /
            // scale / skew follow a curved, inertial ease instead of a linear
            // tween — the "pick it up and lift it" solidity the user asked for.
            const p = Math.min(1, Math.max(0, pullAmt))
            const liftEase = p < 1 ? 1 - Math.pow(1 - p, 3) : 1
            const pullTargetScale = 1.5
            // As the card is pulled out it both rises AND recenters horizontally
            // (slides from its slot x toward centre), staying dead-straight the
            // whole way — NO skew / rotateY, so there is no "inversion" of the
            // strip while the card detaches. By the time the modal takes over it
            // sits centred, enlarged at the exact spot the preview will appear,
            // so the extraction and the open read as ONE continuous motion —
            // no card-flip-then-pop-from-centre jump.
            const px = x * (1 - liftEase)
            const py = -HOVER_LIFT * 2.4
            const pz = 520
            const pullTransform =
              `translate3d(${px}px, ${py * liftEase}px, ${pz * liftEase}px) ` +
              `scale3d(${1 + (pullTargetScale - 1) * liftEase}, ${1 + (pullTargetScale - 1) * liftEase}, 1)`

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