import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/classNames'

interface ReaderModeToggleProps {
  simpleMode: boolean
  onToggle: () => void
}

type DockSide = 'left' | 'right'
type Phase = 'docked' | 'detached' | 'returning'

interface Shape {
  x: number
  y: number
  width: number
  height: number
  radius: number
  morph: number
}

interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  startTop: number
  side: DockSide
  moved: boolean
  phase: 'docked' | 'detached'
  pointerX: number
  pointerY: number
  lastX: number
  lastY: number
  lastTime: number
}

interface DropSlot {
  side: DockSide
  top: number
}

const SHAPE_KEYS = ['x', 'y', 'width', 'height', 'radius', 'morph'] as const

const TAG_WIDTH = 32
const TAG_HEIGHT = 80
const TAG_RADIUS = 6
const DOT_SIZE = 34
const DOT_RADIUS = DOT_SIZE / 2

const WALL_WIDTH = 54
const WALL_HEIGHT = 30
const PREVIEW_HEIGHT = 56

/** How far the tab has to be pulled inwards before it lets go of the edge. */
const PULL_TO_DETACH = 76
/** Width gained per pixel pulled (kept low so the tab only stretches a little). */
const PULL_WIDTH_GAIN = 0.55
/** Height lost at full pull, i.e. the vertical squash. */
const PULL_HEIGHT_LOSS = 13
/** How far the tab nudges outwards on a plain click. */
const CLICK_PULL = 34

const DRAG_ACTIVATION = 3
const TOP_MARGIN = 88
const BOTTOM_MARGIN = 24
/** Ignore transient viewport collapses (mobile chrome, screenshots, rotation). */
const MIN_VIEWPORT_HEIGHT = 240

const DEFAULT_TOP_RATIO = 0.5
const STORAGE_KEY = 'blog-reader-mode-toggle-position-v2'
const PORTAL_ROOT_ID = 'reader-mode-toggle-root'
const TOGGLE_MARKER = 'reader-mode-toggle'

/** Loose spring: the tag trails the cursor slightly while being dragged. */
const FOLLOW_SPRING: SpringConfig = { stiffness: 820, damping: 46, mass: 0.9 }
/** Snappy spring used when the tag pops off the edge into the dot. */
const RUSH_SPRING: SpringConfig = { stiffness: 680, damping: 27, mass: 0.85 }
/** Soft landing for a plain drag that stays docked. */
const SETTLE_SPRING: SpringConfig = { stiffness: 300, damping: 20, mass: 0.9 }
/** The stretched click: firm pull out, springy bounce back. */
const PULSE_OUT_SPRING: SpringConfig = {
  stiffness: 560,
  damping: 30,
  mass: 0.8,
}
const PULSE_BACK_SPRING: SpringConfig = {
  stiffness: 380,
  damping: 15,
  mass: 0.8,
}
/** Flight of the dot back to the edge: a flattened droplet. */
const RETURN_FLIGHT_SPRING: SpringConfig = {
  stiffness: 420,
  damping: 30,
  mass: 0.9,
}
/** Droplet swelling back up into the vertical tab. */
const RETURN_RISE_SPRING: SpringConfig = {
  stiffness: 330,
  damping: 15,
  mass: 0.9,
}
const REDUCED_SPRING: SpringConfig = { stiffness: 900, damping: 60, mass: 1 }

const SIDE_PRESENTATION: Record<DockSide, { labelAnchor: string }> = {
  left: { labelAnchor: 'right-0' },
  right: { labelAnchor: 'left-0' },
}

/**
 * A little rubber tab pinned to the left or right edge of the viewport.
 *
 * - A plain click stretches it outwards and lets it spring back while the
 *   reading mode toggles.
 * - Dragging it stretches the tab (it squashes vertically) and moves it along
 *   the edge.
 * - Pull it far enough inwards and it pops off the edge into a droplet that
 *   follows the cursor; dropping it on either side flings it back, where it
 *   flattens against the wall and swells back up into a tab.
 *
 * The geometry is driven by a small spring integrator on motion values so the
 * interaction keeps its weight and never fights React re-renders.
 */
export function ReaderModeToggle({
  simpleMode,
  onToggle,
}: ReaderModeToggleProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion() ?? false

  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [side, setSide] = useState<DockSide>('left')
  const [phase, setPhase] = useState<Phase>('docked')
  const [preview, setPreview] = useState<DropSlot | null>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const width = useMotionValue(TAG_WIDTH)
  const height = useMotionValue(TAG_HEIGHT)
  const radius = useMotionValue(TAG_RADIUS)
  const morph = useMotionValue(0)
  const sideValue = useMotionValue(0)
  const scaleX = useMotionValue(1)
  const scaleY = useMotionValue(1)

  const shapeRef = useRef<Shape>({
    x: 0,
    y: 0,
    width: TAG_WIDTH,
    height: TAG_HEIGHT,
    radius: TAG_RADIUS,
    morph: 0,
  })
  const velocityRef = useRef<Shape>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    radius: 0,
    morph: 0,
  })
  const targetRef = useRef<Shape>({ ...shapeRef.current })
  const springRef = useRef<SpringConfig>(SETTLE_SPRING)
  const phaseRef = useRef<Phase>('docked')
  const sideRef = useRef<DockSide>('left')
  const topRef = useRef(0)
  const dragRef = useRef<DragState | null>(null)
  const dropRef = useRef<DropSlot | null>(null)
  const returnStageRef = useRef<0 | 1>(0)
  const pointerVelocityRef = useRef({ x: 0, y: 0 })
  const squashRef = useRef({ x: 1, y: 1 })
  const previewRef = useRef<DropSlot | null>(null)
  const wakeRef = useRef<() => void>(() => {})
  const pulseRef = useRef<'idle' | 'out'>('idle')
  const suppressTimerRef = useRef(0)
  const suppressClickRef = useRef(false)
  const reducedMotionRef = useRef(reducedMotion)

  reducedMotionRef.current = reducedMotion

  const borderRadius = useTransform<number, string>(
    [radius, morph, sideValue],
    ([cornerRadius, morphValue, sideDirection]) => {
      const edgeRadius = cornerRadius * morphValue
      return sideDirection < 0.5
        ? `${edgeRadius}px ${cornerRadius}px ${cornerRadius}px ${edgeRadius}px`
        : `${cornerRadius}px ${edgeRadius}px ${edgeRadius}px ${cornerRadius}px`
    }
  )

  const labelOpacity = useTransform<number, number>(morph, [0.02, 0.5], [1, 0])

  /* the inner bead only belongs to the cursor dot: fade it as the droplet
     stretches back out into a tag */
  const dotOpacity = useTransform<number, number>(
    [morph, width],
    ([morphValue, currentWidth]) =>
      clamp(morphValue * (1 - (currentWidth - DOT_SIZE) / 10), 0, 1) * 0.55
  )

  const dotScale = useTransform<number, number>(
    morph,
    [0, 0.7, 1],
    [0.15, 1.18, 1]
  )

  const boxShadow = useTransform<number, string>(
    [width, morph],
    ([currentWidth, morphValue]) => {
      const pull = clamp(
        (currentWidth - TAG_WIDTH) / (PULL_TO_DETACH * PULL_WIDTH_GAIN),
        0,
        1
      )
      const lift = Math.max(pull, morphValue)
      const blur = 8 + lift * 20
      const offset = 2 + lift * 6
      const alpha = 0.08 + lift * 0.18
      return `0 ${offset}px ${blur}px rgba(15, 23, 42, ${alpha.toFixed(3)})`
    }
  )

  /* ---------------------------------------------------------------- */
  /* motion plumbing                                                   */
  /* ---------------------------------------------------------------- */

  const applyTarget = useCallback((next: Shape, config: SpringConfig) => {
    targetRef.current = next
    springRef.current = reducedMotionRef.current ? REDUCED_SPRING : config
    wakeRef.current()
  }, [])

  const clearPulse = useCallback(() => {
    pulseRef.current = 'idle'
  }, [])

  const suppressClicksFor = useCallback((duration: number) => {
    suppressClickRef.current = true
    if (suppressTimerRef.current) {
      window.clearTimeout(suppressTimerRef.current)
    }
    suppressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false
      suppressTimerRef.current = 0
    }, duration)
  }, [])

  const commitPreview = useCallback((next: DropSlot | null) => {
    const current = previewRef.current

    if (!next) {
      if (!current) return
      previewRef.current = null
      setPreview(null)
      return
    }

    if (
      current &&
      current.side === next.side &&
      Math.abs(current.top - next.top) < 6
    ) {
      return
    }

    previewRef.current = next
    setPreview(next)
  }, [])

  const settleToDock = useCallback(
    (nextSide: DockSide, nextTop: number) => {
      const clampedTop = clampTop(nextTop)
      sideRef.current = nextSide
      topRef.current = clampedTop
      setSide(nextSide)
      sideValue.set(nextSide === 'left' ? 0 : 1)
      applyTarget(tagShape(nextSide, clampedTop, 0), SETTLE_SPRING)
      writeStoredPosition({ side: nextSide, top: clampedTop })
    },
    [applyTarget, sideValue]
  )

  /* ---------------------------------------------------------------- */
  /* portal                                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (window.__PRERENDER__) return

    document
      .querySelectorAll<HTMLElement>(
        `[data-reader-mode-toggle="${TOGGLE_MARKER}"]`
      )
      .forEach((node) => {
        if (!node.closest(`#${PORTAL_ROOT_ID}`)) {
          node.remove()
        }
      })

    let root = document.getElementById(PORTAL_ROOT_ID)
    if (!root) {
      root = document.createElement('div')
      root.id = PORTAL_ROOT_ID
      document.body.appendChild(root)
    }
    setPortalRoot(root)
  }, [])

  /* ---------------------------------------------------------------- */
  /* initial placement (runs before the portal renders)                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (window.__PRERENDER__) return

    const saved = readStoredPosition()
    const initialSide = saved.side ?? 'left'
    const initialTop = clampTop(saved.top ?? defaultTop())
    sideRef.current = initialSide
    topRef.current = initialTop
    setSide(initialSide)
    sideValue.set(initialSide === 'left' ? 0 : 1)

    const initialShape = tagShape(initialSide, initialTop, 0)
    shapeRef.current = { ...initialShape }
    targetRef.current = { ...initialShape }
    x.set(initialShape.x)
    y.set(initialShape.y)
    width.set(initialShape.width)
    height.set(initialShape.height)
    radius.set(initialShape.radius)
    morph.set(0)
  }, [height, morph, radius, sideValue, width, x, y])

  /* ---------------------------------------------------------------- */
  /* spring loop                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!portalRoot) return

    let frame = 0
    let last = performance.now()

    const writeShape = () => {
      const shape = shapeRef.current
      x.set(shape.x)
      y.set(shape.y)
      width.set(shape.width)
      height.set(shape.height)
      radius.set(shape.radius)
      morph.set(shape.morph)
    }

    const step = (dt: number) => {
      const shape = shapeRef.current
      const velocity = velocityRef.current
      const pointerVelocity = pointerVelocityRef.current

      /* the click stretch reached its apex: whip back to rest */
      if (pulseRef.current === 'out') {
        const base = tagShape(sideRef.current, topRef.current, 0)
        const stretched = tagShape(sideRef.current, topRef.current, CLICK_PULL)
        if (shape.width >= base.width + (stretched.width - base.width) * 0.8) {
          pulseRef.current = 'idle'
          targetRef.current = base
          springRef.current = reducedMotionRef.current
            ? REDUCED_SPRING
            : PULSE_BACK_SPRING
        }
      }

      /* droplet reached the wall: stop being a puddle and rise up */
      if (phaseRef.current === 'returning' && returnStageRef.current === 0) {
        const wallTarget = targetRef.current
        const distance = Math.hypot(
          shape.x - wallTarget.x,
          shape.y - wallTarget.y
        )
        if (distance < 18) {
          returnStageRef.current = 1
          springRef.current = reducedMotionRef.current
            ? REDUCED_SPRING
            : RETURN_RISE_SPRING
          const drop = dropRef.current
          targetRef.current = tagShape(
            drop?.side ?? sideRef.current,
            drop?.top ?? topRef.current,
            0
          )
          velocity.height += 260
          velocity.width -= 80
        }
      }

      const rested = integrateShape(
        shape,
        velocity,
        targetRef.current,
        springRef.current,
        dt
      )

      const decay = Math.pow(0.002, dt)
      pointerVelocity.x *= decay
      pointerVelocity.y *= decay

      const blend = Math.min(1, dt * 16)
      squashRef.current.x +=
        (1 +
          Math.min(Math.abs(pointerVelocity.x) / 4000, 0.2) -
          Math.min(Math.abs(pointerVelocity.y) / 11000, 0.07) -
          squashRef.current.x) *
        blend
      squashRef.current.y +=
        (1 +
          Math.min(Math.abs(pointerVelocity.y) / 4000, 0.2) -
          Math.min(Math.abs(pointerVelocity.x) / 11000, 0.07) -
          squashRef.current.y) *
        blend

      const morphFactor = shape.morph
      scaleX.set(1 + (squashRef.current.x - 1) * morphFactor)
      scaleY.set(1 + (squashRef.current.y - 1) * morphFactor)
      writeShape()

      const squashSettled =
        Math.abs(squashRef.current.x - 1) < 0.002 &&
        Math.abs(squashRef.current.y - 1) < 0.002

      if (
        rested &&
        phaseRef.current === 'returning' &&
        returnStageRef.current === 1
      ) {
        phaseRef.current = 'docked'
        returnStageRef.current = 0
        springRef.current = SETTLE_SPRING
        setPhase('docked')
        commitPreview(null)
        const drop = dropRef.current
        if (drop) {
          writeStoredPosition({ side: drop.side, top: drop.top })
        }
        dropRef.current = null
      }

      return rested && squashSettled && phaseRef.current !== 'returning'
    }

    const tick = (now: number) => {
      frame = 0
      const dt = Math.min(Math.max((now - last) / 1000, 0.001), 1 / 20)
      last = now
      if (!step(dt)) schedule()
    }

    const schedule = () => {
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }

    wakeRef.current = schedule

    return () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      if (wakeRef.current === schedule) wakeRef.current = () => {}
    }
  }, [
    commitPreview,
    height,
    morph,
    portalRoot,
    radius,
    scaleX,
    scaleY,
    sideValue,
    width,
    x,
    y,
  ])

  /* ---------------------------------------------------------------- */
  /* pointer handling                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!portalRoot) return

    const beginDetach = (
      pointerX: number,
      pointerY: number,
      origin: DockSide
    ) => {
      phaseRef.current = 'detached'
      setPhase('detached')
      clearPulse()
      targetRef.current = dotShape(pointerX, pointerY)
      springRef.current = reducedMotionRef.current
        ? REDUCED_SPRING
        : RUSH_SPRING
      velocityRef.current.x += edgeSign(origin) * 520
      velocityRef.current.width -= 420
      commitPreview({
        side: sideFromX(pointerX),
        top: clampTop(pointerY - TAG_HEIGHT / 2),
      })
      wakeRef.current()
    }

    const beginReturn = (nextSide: DockSide, nextTop: number) => {
      phaseRef.current = 'returning'
      returnStageRef.current = 0
      dropRef.current = { side: nextSide, top: nextTop }
      sideRef.current = nextSide
      topRef.current = nextTop
      setSide(nextSide)
      sideValue.set(nextSide === 'left' ? 0 : 1)
      setPhase('returning')
      applyTarget(wallShape(nextSide, nextTop), RETURN_FLIGHT_SPRING)
      commitPreview({ side: nextSide, top: nextTop })
    }

    const finishDrag = (drag: DragState) => {
      dragRef.current = null

      if (drag.phase === 'detached') {
        const nextSide = sideFromX(drag.pointerX)
        const nextTop = clampTop(drag.pointerY - TAG_HEIGHT / 2)
        beginReturn(nextSide, nextTop)
        suppressClicksFor(260)
        return
      }

      if (!drag.moved) {
        applyTarget(tagShape(drag.side, topRef.current, 0), SETTLE_SPRING)
        return
      }

      settleToDock(drag.side, topRef.current)
      suppressClicksFor(180)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      /* a pointerup that we never saw (e.g. released over an iframe) */
      if (event.pointerType === 'mouse' && event.buttons === 0) {
        drag.pointerX = event.clientX
        drag.pointerY = event.clientY
        finishDrag(drag)
        return
      }

      const now = event.timeStamp || performance.now()
      const elapsed = Math.max((now - drag.lastTime) / 1000, 1 / 240)
      const pointerVelocity = pointerVelocityRef.current
      pointerVelocity.x =
        pointerVelocity.x * 0.55 +
        clamp((event.clientX - drag.lastX) / elapsed, -6000, 6000) * 0.45
      pointerVelocity.y =
        pointerVelocity.y * 0.55 +
        clamp((event.clientY - drag.lastY) / elapsed, -6000, 6000) * 0.45
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      drag.lastTime = now
      drag.pointerX = event.clientX
      drag.pointerY = event.clientY

      const deltaX = event.clientX - drag.startX
      const deltaY = event.clientY - drag.startY

      if (!drag.moved) {
        if (Math.hypot(deltaX, deltaY) < DRAG_ACTIVATION) return
        drag.moved = true
        suppressClickRef.current = true
      }

      if (drag.phase === 'docked') {
        const inward = Math.max(deltaX * edgeSign(drag.side), 0)

        if (inward >= PULL_TO_DETACH) {
          drag.phase = 'detached'
          beginDetach(event.clientX, event.clientY, drag.side)
          event.preventDefault()
          return
        }

        const nextTop = clampTop(drag.startTop + deltaY)
        topRef.current = nextTop
        applyTarget(tagShape(drag.side, nextTop, inward), FOLLOW_SPRING)
      } else {
        applyTarget(dotShape(event.clientX, event.clientY), FOLLOW_SPRING)
        commitPreview({
          side: sideFromX(event.clientX),
          top: clampTop(event.clientY - TAG_HEIGHT / 2),
        })
      }

      event.preventDefault()
    }

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      drag.pointerX = event.clientX
      drag.pointerY = event.clientY
      finishDrag(drag)
    }

    const handleInterrupt = () => {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null

      if (drag.phase === 'detached') {
        beginReturn(
          sideFromX(drag.pointerX),
          clampTop(drag.pointerY - TAG_HEIGHT / 2)
        )
      } else {
        settleToDock(drag.side, topRef.current)
      }
    }

    window.addEventListener('pointermove', handlePointerMove, {
      passive: false,
    })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handleInterrupt)
    window.addEventListener('blur', handleInterrupt)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handleInterrupt)
      window.removeEventListener('blur', handleInterrupt)
    }
  }, [
    applyTarget,
    clearPulse,
    commitPreview,
    portalRoot,
    settleToDock,
    sideValue,
    suppressClicksFor,
  ])

  /* keep the tab on screen when the viewport changes */
  useEffect(() => {
    if (!portalRoot) return

    const handleResize = () => {
      if (window.innerHeight < MIN_VIEWPORT_HEIGHT) return
      const clampedTop = clampTop(topRef.current)
      topRef.current = clampedTop

      if (phaseRef.current === 'docked' && !dragRef.current) {
        applyTarget(tagShape(sideRef.current, clampedTop, 0), SETTLE_SPRING)
        writeStoredPosition({ side: sideRef.current, top: clampedTop })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyTarget, portalRoot])

  useEffect(
    () => () => {
      clearPulse()
      if (suppressTimerRef.current) {
        window.clearTimeout(suppressTimerRef.current)
      }
    },
    [clearPulse]
  )

  /* ---------------------------------------------------------------- */
  /* interactions                                                      */
  /* ---------------------------------------------------------------- */

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (phaseRef.current !== 'docked') return

    if (!reducedMotionRef.current) {
      clearPulse()
      pulseRef.current = 'out'
      applyTarget(
        tagShape(sideRef.current, topRef.current, CLICK_PULL),
        PULSE_OUT_SPRING
      )
    }

    onToggle()
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || phaseRef.current !== 'docked') return
    if (dragRef.current) return

    clearPulse()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTop: topRef.current,
      side: sideRef.current,
      moved: false,
      phase: 'docked',
      pointerX: event.clientX,
      pointerY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp || performance.now(),
    }
    pointerVelocityRef.current.x = 0
    pointerVelocityRef.current.y = 0
    suppressClickRef.current = false
    applyTarget(tagShape(sideRef.current, topRef.current, 0), FOLLOW_SPRING)
  }

  if (!portalRoot) return null

  return createPortal(
    <>
      {preview ? (
        <motion.div
          aria-hidden
          className={cn(
            'pointer-events-none fixed z-[75] hidden w-1.5 lg:block',
            'bg-[color-mix(in_srgb,var(--brand-400)_34%,transparent)]',
            preview.side === 'left'
              ? 'left-0 rounded-r-full'
              : 'right-0 rounded-l-full'
          )}
          style={{
            top: preview.top + TAG_HEIGHT / 2 - PREVIEW_HEIGHT / 2,
            height: PREVIEW_HEIGHT,
          }}
          initial={{ opacity: 0, scaleY: 0.7 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      ) : null}

      <motion.div
        onPointerDown={handlePointerDown}
        onDragStart={(event) => event.preventDefault()}
        className={cn(
          'fixed top-0 left-0 z-[80] hidden touch-none overflow-hidden border border-slate-200/70 bg-white/80 will-change-transform select-none lg:block',
          'dark:border-[#2b2f36] dark:bg-[#17191c]',
          phase === 'docked'
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-grabbing'
        )}
        style={{
          x,
          y,
          width,
          height,
          borderRadius,
          boxShadow,
          scaleX,
          scaleY,
          transformOrigin: 'center',
          pointerEvents: phase === 'docked' ? 'auto' : 'none',
        }}
        data-reader-mode-toggle={TOGGLE_MARKER}
      >
        <motion.button
          type="button"
          onClick={handleClick}
          style={{ opacity: labelOpacity }}
          className={cn(
            'absolute top-0 flex h-full w-8 cursor-grab items-center justify-center bg-transparent px-1 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/20 hover:text-[var(--text-primary)] active:cursor-grabbing',
            '[text-orientation:mixed] [writing-mode:vertical-rl]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-400)_72%,transparent)]',
            SIDE_PRESENTATION[side].labelAnchor
          )}
          aria-pressed={simpleMode}
          aria-label={
            simpleMode
              ? t('blog.readerMode.switchToRich')
              : t('blog.readerMode.switchToSimple')
          }
          title={
            simpleMode ? t('blog.readerMode.rich') : t('blog.readerMode.simple')
          }
        >
          {simpleMode ? t('blog.readerMode.rich') : t('blog.readerMode.simple')}
        </motion.button>

        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-[var(--brand-500)]"
          style={{ opacity: dotOpacity, scale: dotScale }}
        />
      </motion.div>
    </>,
    portalRoot
  )
}

/* ------------------------------------------------------------------ */
/* geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function tagShape(side: DockSide, top: number, pull: number): Shape {
  const stretch = clamp(pull, 0, PULL_TO_DETACH) / PULL_TO_DETACH
  const tagWidth = TAG_WIDTH + stretch * PULL_TO_DETACH * PULL_WIDTH_GAIN
  const tagHeight = TAG_HEIGHT - stretch * PULL_HEIGHT_LOSS

  return {
    x: side === 'left' ? 0 : window.innerWidth - tagWidth,
    y: top + (TAG_HEIGHT - tagHeight) / 2,
    width: tagWidth,
    height: tagHeight,
    radius: TAG_RADIUS,
    morph: 0,
  }
}

function dotShape(pointerX: number, pointerY: number): Shape {
  const maxX = Math.max(DOT_SIZE / 2, window.innerWidth - DOT_SIZE / 2)
  const maxY = Math.max(DOT_SIZE / 2, window.innerHeight - DOT_SIZE / 2)
  return {
    x: clamp(pointerX, DOT_SIZE / 2, maxX) - DOT_SIZE / 2,
    y: clamp(pointerY, DOT_SIZE / 2, maxY) - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    radius: DOT_RADIUS,
    morph: 1,
  }
}

/** A flattened droplet hugging the screen edge, ready to swell up again. */
function wallShape(side: DockSide, top: number): Shape {
  return {
    x: side === 'left' ? 0 : window.innerWidth - WALL_WIDTH,
    y: top + (TAG_HEIGHT - WALL_HEIGHT) / 2,
    width: WALL_WIDTH,
    height: WALL_HEIGHT,
    radius: WALL_HEIGHT / 2,
    morph: 1,
  }
}

function integrateShape(
  current: Shape,
  velocity: Shape,
  target: Shape,
  config: SpringConfig,
  dt: number
) {
  const steps = Math.min(8, Math.max(1, Math.ceil(dt * 240)))
  const step = dt / steps
  const { stiffness, damping, mass } = config
  let rested = true

  for (let index = 0; index < steps; index += 1) {
    for (const key of SHAPE_KEYS) {
      const displacement = current[key] - target[key]
      const speed = velocity[key]

      if (Math.abs(displacement) < 0.05 && Math.abs(speed) < 0.05) {
        current[key] = target[key]
        velocity[key] = 0
        continue
      }

      rested = false
      velocity[key] +=
        ((-stiffness * displacement - damping * speed) / mass) * step
      current[key] += velocity[key] * step
    }
  }

  return rested
}

/* ------------------------------------------------------------------ */
/* misc helpers                                                        */
/* ------------------------------------------------------------------ */

function defaultTop() {
  return Math.round(window.innerHeight * DEFAULT_TOP_RATIO - TAG_HEIGHT / 2)
}

function clampTop(value: number) {
  if (typeof window === 'undefined') return value
  const min = TOP_MARGIN
  const max = Math.max(min, window.innerHeight - TAG_HEIGHT - BOTTOM_MARGIN)
  return clamp(value, min, max)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function sideFromX(value: number): DockSide {
  return value < window.innerWidth / 2 ? 'left' : 'right'
}

function edgeSign(side: DockSide) {
  return side === 'left' ? 1 : -1
}

function readStoredPosition(): {
  side?: DockSide
  top?: number
} {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { side?: string; top?: number }
    return {
      side:
        parsed.side === 'left' || parsed.side === 'right'
          ? parsed.side
          : undefined,
      top: typeof parsed.top === 'number' ? parsed.top : undefined,
    }
  } catch {
    return {}
  }
}

function writeStoredPosition(position: Required<DropSlot>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
  } catch {
    return
  }
}
