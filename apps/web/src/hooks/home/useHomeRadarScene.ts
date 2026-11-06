import { useLenis } from 'lenis/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsCoarsePointer } from '@/hooks/useIsCoarsePointer'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const RADAR_VIRTUAL_SCROLL_FACTOR = 1.08
const RADAR_VIRTUAL_SCROLL_MIN = 860
const RADAR_VIRTUAL_SCROLL_MAX = 1140
const RADAR_VIRTUAL_SCROLL_FACTOR_COARSE = 0.68
const RADAR_VIRTUAL_SCROLL_MIN_COARSE = 420
const RADAR_VIRTUAL_SCROLL_MAX_COARSE = 720
const RADAR_LOCK_TOLERANCE_PX = 36
const RADAR_LOCK_TOLERANCE_PX_COARSE = 96
const RADAR_RELEASE_NUDGE_PX = 28
const RADAR_RETURN_SCROLL_DURATION = 1.02
const RADAR_RETURN_SUPPRESS_PAGER_MS = 980
const HOME_PAGER_SUPPRESS_EVENT = 'home:pager-suppress'

const HORIZONTAL_LINE_START = 0.12
const HORIZONTAL_LINE_END = 0.25
const AMBIENCE_START = 0.16
const AMBIENCE_END = 0.34
const RINGS_START = 0.26
export const HOME_RADAR_RING_STAGGER = 0.065
export const HOME_RADAR_RING_DURATION = 0.11
const VERTICAL_LINE_START = 0.54
const VERTICAL_LINE_END = 0.66
const AUTO_EXPLORATION_TRIGGER_PROGRESS = 0.72
const AUTO_EXPLORATION_START_DELAY_MS = 180
const AUTO_EXPLORATION_DURATION_MS = 7200
const AUTO_EXPLORATION_SCROLL_ACCELERATION_MS_PER_PX = 4.5
const AUTO_EXPLORATION_SCROLL_ACCELERATION_ROTATION_COVERAGE = 1
const AUTO_EXPLORATION_MAX_SCROLL_ACCELERATION_MS =
  AUTO_EXPLORATION_DURATION_MS *
  AUTO_EXPLORATION_SCROLL_ACCELERATION_ROTATION_COVERAGE
const BEAM_CONTINUOUS_ROTATION_DURATION_MS = 7200
const FULL_ROTATION_DEGREES = 360
const BEAM_HEAD_OFFSET = -16
const BEAM_FOCUS_OFFSET = -20
export const HOME_RADAR_CENTER_Y = '50%'
export const HOME_RADAR_RING_START = RINGS_START

const SIGNAL_HOVER_EXIT_DELAY_MS = 96

export function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

export function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

export function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return clamp01((value - start) / (end - start))
}

export function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export function easeOutBack(value: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

export function normalizeAngle(angle: number) {
  const normalized = angle % FULL_ROTATION_DEGREES
  return normalized < 0 ? normalized + FULL_ROTATION_DEGREES : normalized
}

function getClockwiseAngleDelta(from: number, to: number) {
  return normalizeAngle(to - from)
}

function getSweepNodeAngle(nodeAngle: number, sweepStartAngle: number) {
  return nodeAngle < sweepStartAngle
    ? nodeAngle + FULL_ROTATION_DEGREES
    : nodeAngle
}

export function getBeamRevealProgress(
  sweepAngle: number,
  nodeAngle: number,
  revealWindow: number,
  sweepStartAngle: number
) {
  const nodeSweepAngle = getSweepNodeAngle(nodeAngle, sweepStartAngle)

  return segmentProgress(
    sweepAngle,
    nodeSweepAngle,
    nodeSweepAngle + revealWindow
  )
}

export function getTrailingBeamImpact(
  beamAngle: number,
  nodeAngle: number,
  pulseWindow: number
) {
  const delta = getClockwiseAngleDelta(nodeAngle, beamAngle)
  if (delta > pulseWindow) return 0
  return 1 - delta / pulseWindow
}

export function getSignalShellShift(
  node: {
    cardAlignX: 'left' | 'center' | 'right'
    cardAlignY: 'top' | 'bottom'
  },
  signalCardSizePx = 212,
  signalDotSizePx = 44
) {
  const halfDelta = (signalCardSizePx - signalDotSizePx) / 2
  const shiftX =
    node.cardAlignX === 'left'
      ? halfDelta
      : node.cardAlignX === 'right'
        ? -halfDelta
        : 0
  const shiftY = node.cardAlignY === 'top' ? -halfDelta : halfDelta

  return { shiftX, shiftY }
}

function getBoundedScrollDistance(
  viewportHeight: number,
  factor: number,
  min: number,
  max: number
) {
  if (viewportHeight <= 0) return 0
  return Math.min(max, Math.max(min, viewportHeight * factor))
}

function getSectionReturnScrollTop(
  sectionName: 'widget' | 'radar',
  fallbackTop: number
) {
  const sectionNode = document.querySelector<HTMLElement>(
    `[data-home-snap="${sectionName}"]`
  )

  if (!sectionNode) return fallbackTop

  return Math.max(
    fallbackTop,
    fallbackTop + Math.max(0, sectionNode.offsetHeight - window.innerHeight)
  )
}

export function useHomeRadarScene({
  paused = false,
  active = true,
}: {
  paused?: boolean
  active?: boolean
} = {}) {
  const reduceMotion = usePrefersReducedMotion()
  const isCoarsePointer = useIsCoarsePointer()
  const lenis = useLenis()
  const sectionRef = useRef<HTMLElement | null>(null)
  const sceneProgressRef = useRef(reduceMotion ? 1 : 0)
  const isLockedRef = useRef(false)
  const unlockDirectionRef = useRef<1 | -1 | 0>(0)
  const touchYRef = useRef<number | null>(null)
  const autoExplorationProgressRef = useRef(reduceMotion ? 1 : 0)
  const isAutoExploringRef = useRef(false)
  const isAutoExplorationCompleteRef = useRef(reduceMotion)
  const autoExplorationFrameRef = useRef<number | null>(null)
  const autoExplorationDelayRef = useRef<number | null>(null)
  const autoExplorationScrollBoostRef = useRef(0)
  const beamLoopFrameRef = useRef<number | null>(null)
  const signalHoverExitTimeoutRef = useRef<number | null>(null)
  const lastWindowScrollYRef = useRef(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [sceneProgress, setSceneProgress] = useState(reduceMotion ? 1 : 0)
  const [autoExplorationProgress, setAutoExplorationProgress] = useState(
    reduceMotion ? 1 : 0
  )
  const [beamLoopAngle, setBeamLoopAngle] = useState(0)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

  useEffect(() => {
    sceneProgressRef.current = sceneProgress
  }, [sceneProgress])

  useEffect(() => {
    autoExplorationProgressRef.current = autoExplorationProgress
  }, [autoExplorationProgress])

  useEffect(() => {
    if (!active) return

    const updateViewportHeight = () => {
      const nextHeight = window.innerHeight
      setViewportHeight((current) =>
        current === nextHeight ? current : nextHeight
      )
      lastWindowScrollYRef.current = window.scrollY
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
    }
  }, [active])

  const virtualScrollDistance = getBoundedScrollDistance(
    viewportHeight,
    isCoarsePointer
      ? RADAR_VIRTUAL_SCROLL_FACTOR_COARSE
      : RADAR_VIRTUAL_SCROLL_FACTOR,
    isCoarsePointer
      ? RADAR_VIRTUAL_SCROLL_MIN_COARSE
      : RADAR_VIRTUAL_SCROLL_MIN,
    isCoarsePointer ? RADAR_VIRTUAL_SCROLL_MAX_COARSE : RADAR_VIRTUAL_SCROLL_MAX
  )

  const clearAutoExplorationTimers = useCallback(() => {
    if (autoExplorationDelayRef.current != null) {
      window.clearTimeout(autoExplorationDelayRef.current)
      autoExplorationDelayRef.current = null
    }

    if (autoExplorationFrameRef.current != null) {
      cancelAnimationFrame(autoExplorationFrameRef.current)
      autoExplorationFrameRef.current = null
    }
  }, [])

  const clearBeamLoopFrame = useCallback(() => {
    if (beamLoopFrameRef.current != null) {
      cancelAnimationFrame(beamLoopFrameRef.current)
      beamLoopFrameRef.current = null
    }
  }, [])

  const clearSignalHoverExitTimer = useCallback(() => {
    if (signalHoverExitTimeoutRef.current != null) {
      window.clearTimeout(signalHoverExitTimeoutRef.current)
      signalHoverExitTimeoutRef.current = null
    }
  }, [])

  const activateSignalNode = useCallback(
    (nodeId: string) => {
      clearSignalHoverExitTimer()
      setActiveNodeId((current) => (current === nodeId ? current : nodeId))
    },
    [clearSignalHoverExitTimer]
  )

  const scheduleSignalNodeDeactivate = useCallback(
    (nodeId: string) => {
      clearSignalHoverExitTimer()
      signalHoverExitTimeoutRef.current = window.setTimeout(() => {
        signalHoverExitTimeoutRef.current = null
        setActiveNodeId((current) => (current === nodeId ? null : current))
      }, SIGNAL_HOVER_EXIT_DELAY_MS)
    },
    [clearSignalHoverExitTimer]
  )

  const runAutoExplorationLoop = useCallback(() => {
    if (autoExplorationFrameRef.current != null) return

    const startTime = performance.now()

    const advance = (timestamp: number) => {
      const boostedElapsed =
        timestamp -
        startTime +
        Math.min(
          autoExplorationScrollBoostRef.current,
          AUTO_EXPLORATION_MAX_SCROLL_ACCELERATION_MS
        )
      const nextProgress = clamp01(
        boostedElapsed / AUTO_EXPLORATION_DURATION_MS
      )

      autoExplorationProgressRef.current = nextProgress
      setAutoExplorationProgress(nextProgress)

      if (nextProgress >= 1) {
        isAutoExploringRef.current = false
        isAutoExplorationCompleteRef.current = true
        sceneProgressRef.current = 1
        setSceneProgress(1)
        autoExplorationFrameRef.current = null
        return
      }

      autoExplorationFrameRef.current = requestAnimationFrame(advance)
    }

    autoExplorationFrameRef.current = requestAnimationFrame(advance)
  }, [])

  const applyAutoExplorationBoost = useCallback(
    (deltaY: number) => {
      if (deltaY <= 0 || !isAutoExploringRef.current) return

      autoExplorationScrollBoostRef.current = Math.min(
        AUTO_EXPLORATION_MAX_SCROLL_ACCELERATION_MS,
        autoExplorationScrollBoostRef.current +
          deltaY * AUTO_EXPLORATION_SCROLL_ACCELERATION_MS_PER_PX
      )

      if (autoExplorationDelayRef.current != null) {
        window.clearTimeout(autoExplorationDelayRef.current)
        autoExplorationDelayRef.current = null
        runAutoExplorationLoop()
      }
    },
    [runAutoExplorationLoop]
  )

  const startAutoExploration = useCallback(() => {
    if (reduceMotion) return
    if (isAutoExploringRef.current || isAutoExplorationCompleteRef.current)
      return

    clearAutoExplorationTimers()
    autoExplorationScrollBoostRef.current = 0
    isAutoExploringRef.current = true
    sceneProgressRef.current = AUTO_EXPLORATION_TRIGGER_PROGRESS
    setSceneProgress(AUTO_EXPLORATION_TRIGGER_PROGRESS)

    autoExplorationDelayRef.current = window.setTimeout(() => {
      autoExplorationDelayRef.current = null
      runAutoExplorationLoop()
    }, AUTO_EXPLORATION_START_DELAY_MS)
  }, [clearAutoExplorationTimers, reduceMotion, runAutoExplorationLoop])

  const releaseScene = useCallback(
    (direction: 1 | -1) => {
      if (!lenis || !isLockedRef.current) return

      isLockedRef.current = false
      unlockDirectionRef.current = direction
      lenis.start()

      const sectionNode = sectionRef.current
      if (!sectionNode) return

      const sectionTop = sectionNode.offsetTop
      requestAnimationFrame(() => {
        if (direction < 0) {
          const widgetNode = document.querySelector<HTMLElement>(
            '[data-home-snap="widget"]'
          )
          const widgetTop =
            widgetNode?.offsetTop ?? sectionTop - window.innerHeight
          const widgetReturnTop = getSectionReturnScrollTop('widget', widgetTop)

          window.dispatchEvent(
            new CustomEvent(HOME_PAGER_SUPPRESS_EVENT, {
              detail: { durationMs: RADAR_RETURN_SUPPRESS_PAGER_MS },
            })
          )

          lenis.scrollTo(widgetReturnTop, {
            duration: reduceMotion ? 0 : RADAR_RETURN_SCROLL_DURATION,
            immediate: reduceMotion,
            force: true,
            lock: true,
          })

          window.setTimeout(
            () => {
              unlockDirectionRef.current = 0
            },
            reduceMotion ? 0 : RADAR_RETURN_SUPPRESS_PAGER_MS
          )
          return
        }

        lenis.scrollTo(sectionTop + direction * RADAR_RELEASE_NUDGE_PX, {
          immediate: true,
          force: true,
        })
        unlockDirectionRef.current = 0
      })
    },
    [lenis, reduceMotion]
  )

  const applyVirtualScrollDelta = useCallback(
    (deltaY: number) => {
      if (reduceMotion || !isLockedRef.current) return

      if (isAutoExploringRef.current) {
        applyAutoExplorationBoost(deltaY)
        return
      }

      if (isAutoExplorationCompleteRef.current) {
        if (deltaY > 0) {
          releaseScene(1)
        } else if (deltaY < 0) {
          releaseScene(-1)
        }
        return
      }

      const distance = Math.max(virtualScrollDistance, 1)
      const current = sceneProgressRef.current
      const rawNext = clamp01(current + deltaY / distance)
      const next = Math.min(rawNext, AUTO_EXPLORATION_TRIGGER_PROGRESS)

      if (Math.abs(next - current) > 0.0005) {
        sceneProgressRef.current = next
        setSceneProgress(next)
      }

      if (deltaY > 0 && next >= AUTO_EXPLORATION_TRIGGER_PROGRESS - 0.0005) {
        startAutoExploration()
      } else if (deltaY < 0 && next <= 0.001) {
        releaseScene(-1)
      }
    },
    [
      applyAutoExplorationBoost,
      reduceMotion,
      releaseScene,
      startAutoExploration,
      virtualScrollDistance,
    ]
  )

  const lockScene = useCallback(() => {
    if (!lenis || isLockedRef.current || reduceMotion) return

    const sectionNode = sectionRef.current
    if (!sectionNode) return

    isLockedRef.current = true
    lenis.scrollTo(sectionNode.offsetTop, { immediate: true, force: true })

    requestAnimationFrame(() => {
      if (isLockedRef.current) lenis.stop()
    })
  }, [lenis, reduceMotion])

  const maybeLockSceneFromViewport = useCallback(
    (direction: 1 | -1) => {
      if (
        reduceMotion ||
        isLockedRef.current ||
        isAutoExplorationCompleteRef.current
      ) {
        return
      }

      const sectionNode = sectionRef.current
      if (!sectionNode) return

      const tolerance = isCoarsePointer
        ? RADAR_LOCK_TOLERANCE_PX_COARSE
        : RADAR_LOCK_TOLERANCE_PX
      const rect = sectionNode.getBoundingClientRect()
      const nearTop =
        rect.top <= tolerance &&
        rect.top >= -(isCoarsePointer ? viewportHeight * 0.18 : tolerance)
      const spansViewport = rect.bottom >= viewportHeight * 0.58

      if (!nearTop || !spansViewport) return

      if (
        direction > 0 &&
        sceneProgressRef.current < AUTO_EXPLORATION_TRIGGER_PROGRESS
      ) {
        lockScene()
      } else if (direction < 0 && sceneProgressRef.current > 0.001) {
        lockScene()
      }
    },
    [isCoarsePointer, lockScene, reduceMotion, viewportHeight]
  )

  useEffect(() => {
    if (reduceMotion || !active) return

    const onWheel = (event: WheelEvent) => {
      if (!isLockedRef.current) return
      event.preventDefault()
      applyVirtualScrollDelta(event.deltaY)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (!isLockedRef.current) return
      touchYRef.current = event.touches[0]?.clientY ?? null
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!isLockedRef.current) return

      const nextTouchY = event.touches[0]?.clientY
      const previousTouchY = touchYRef.current
      if (nextTouchY == null || previousTouchY == null) return

      event.preventDefault()
      touchYRef.current = nextTouchY
      applyVirtualScrollDelta(previousTouchY - nextTouchY)
    }

    const onTouchEnd = () => {
      touchYRef.current = null
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [active, applyVirtualScrollDelta, reduceMotion])

  useEffect(() => {
    return () => {
      clearAutoExplorationTimers()
      clearBeamLoopFrame()
      clearSignalHoverExitTimer()
      if (isLockedRef.current) {
        isLockedRef.current = false
        lenis?.start()
      }
    }
  }, [
    clearAutoExplorationTimers,
    clearBeamLoopFrame,
    clearSignalHoverExitTimer,
    lenis,
  ])

  useLenis(
    (instance) => {
      if (reduceMotion || !active) return
      if (unlockDirectionRef.current !== 0) return
      if (isLockedRef.current) return
      if (isAutoExplorationCompleteRef.current) return

      if (instance.direction === 0) return
      maybeLockSceneFromViewport(instance.direction > 0 ? 1 : -1)
    },
    [active, maybeLockSceneFromViewport, reduceMotion],
    0
  )

  useEffect(() => {
    if (reduceMotion || !active) return

    lastWindowScrollYRef.current = window.scrollY

    const onScroll = () => {
      if (unlockDirectionRef.current !== 0 || isLockedRef.current) {
        lastWindowScrollYRef.current = window.scrollY
        return
      }

      const nextScrollY = window.scrollY
      const delta = nextScrollY - lastWindowScrollYRef.current
      lastWindowScrollYRef.current = nextScrollY

      if (Math.abs(delta) < 1) return
      maybeLockSceneFromViewport(delta > 0 ? 1 : -1)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [active, maybeLockSceneFromViewport, reduceMotion])

  const progress = reduceMotion ? 1 : sceneProgress

  const horizontalLineReveal = easeOutCubic(
    segmentProgress(progress, HORIZONTAL_LINE_START, HORIZONTAL_LINE_END)
  )
  const ambienceReveal = easeOutCubic(
    segmentProgress(progress, AMBIENCE_START, AMBIENCE_END)
  )
  const verticalLineReveal = easeOutCubic(
    segmentProgress(progress, VERTICAL_LINE_START, VERTICAL_LINE_END)
  )
  const introReveal = easeOutCubic(segmentProgress(progress, 0.08, 0.24))

  const explorationProgress = reduceMotion ? 1 : autoExplorationProgress
  const sweepBeamAngle = explorationProgress * FULL_ROTATION_DEGREES
  const beamLoopReady = !reduceMotion && explorationProgress >= 1
  const beamLoopActive = beamLoopReady && !paused
  const beamAngle = beamLoopReady ? beamLoopAngle : sweepBeamAngle
  const beamOpacity = easeOutCubic(
    segmentProgress(explorationProgress, 0, 0.08)
  )
  const beamRotate = beamAngle + BEAM_HEAD_OFFSET
  const beamFocusAngle = normalizeAngle(beamAngle + BEAM_FOCUS_OFFSET)
  const beamSweepStartAngle = normalizeAngle(BEAM_FOCUS_OFFSET)
  const beamFocusSweepAngle = beamSweepStartAngle + sweepBeamAngle

  useEffect(() => {
    if (reduceMotion || paused || !beamLoopActive || !active) {
      clearBeamLoopFrame()
      return
    }

    const startAngle = normalizeAngle(
      autoExplorationProgressRef.current * FULL_ROTATION_DEGREES
    )
    let startTime: number | null = null

    setBeamLoopAngle(startAngle)

    const advance = (timestamp: number) => {
      if (startTime == null) {
        startTime = timestamp
      }

      const elapsed = timestamp - startTime
      const nextAngle = normalizeAngle(
        startAngle +
          (elapsed / BEAM_CONTINUOUS_ROTATION_DURATION_MS) *
            FULL_ROTATION_DEGREES
      )

      setBeamLoopAngle(nextAngle)
      beamLoopFrameRef.current = requestAnimationFrame(advance)
    }

    beamLoopFrameRef.current = requestAnimationFrame(advance)

    return clearBeamLoopFrame
  }, [active, beamLoopActive, clearBeamLoopFrame, paused, reduceMotion])

  return {
    activateSignalNode,
    activeNodeId,
    ambienceReveal,
    beamAngle,
    beamFocusAngle,
    beamFocusSweepAngle,
    beamLoopActive,
    beamOpacity,
    beamRotate,
    beamSweepStartAngle,
    explorationProgress,
    horizontalLineReveal,
    introReveal,
    progress,
    scheduleSignalNodeDeactivate,
    sectionRef,
    verticalLineReveal,
  }
}
