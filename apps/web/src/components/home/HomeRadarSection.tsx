import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  easeOutBack,
  easeOutCubic,
  getSignalShellShift,
  HOME_RADAR_CENTER_Y,
  HOME_RADAR_RING_DURATION,
  HOME_RADAR_RING_START,
  HOME_RADAR_RING_STAGGER,
  mix,
  segmentProgress,
  useHomeRadarScene,
} from './useHomeRadarScene'
import {
  getNodeDotSize,
  isLightHexColor,
  RADAR_CATEGORY_LABELS,
  RADAR_CATEGORY_ORDER,
  RADAR_AXIS_MARKERS,
  RADAR_NODES,
  RING_INSETS,
  SIGNAL_CARD_SIZE_PX,
  SIGNAL_DOT_SIZE_PX,
  type RadarNodeCategory,
  type RadarNode,
  type SignalPortalState,
  withAlpha,
} from './radarData'

interface HomeRadarSectionProps {
  avatarSrc: string
}

interface DynamicRadarSignal {
  id: string
  node: RadarNode
  left: string
  top: string
  createdAtRotation: number
}

const RADAR_DYNAMIC_SIGNAL_SPACING_MIN = 40
const RADAR_DYNAMIC_SIGNAL_SPACING_MAX = 90
const RADAR_DYNAMIC_SIGNAL_SPACING_MEAN = 60
const RADAR_DYNAMIC_SIGNAL_SPACING_STD_DEV = 12
const RADAR_DYNAMIC_SIGNAL_ENTER_DISTANCE = 22
const RADAR_DYNAMIC_SIGNAL_HIT_GLOW_DISTANCE = 34
const RADAR_DYNAMIC_SIGNAL_FADE_START = 270
const RADAR_DYNAMIC_SIGNAL_FADE_DISTANCE = 40
const RADAR_DYNAMIC_SIGNAL_INNER_RADIUS = 22
const RADAR_DYNAMIC_SIGNAL_OUTER_RADIUS = 43
const RADAR_DYNAMIC_SIGNAL_MAX_COUNT = 5

function normalizeRadarAngle(angle: number) {
  const normalized = angle % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function getClockwiseRadarDelta(from: number, to: number) {
  return normalizeRadarAngle(to - from)
}

function getNormallyBiasedSignalSpacing() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const u1 = Math.max(Number.EPSILON, Math.random())
    const u2 = Math.random()
    const normalSample =
      Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const spacing =
      RADAR_DYNAMIC_SIGNAL_SPACING_MEAN +
      normalSample * RADAR_DYNAMIC_SIGNAL_SPACING_STD_DEV

    if (
      spacing >= RADAR_DYNAMIC_SIGNAL_SPACING_MIN &&
      spacing <= RADAR_DYNAMIC_SIGNAL_SPACING_MAX
    ) {
      return spacing
    }
  }

  return Math.min(
    RADAR_DYNAMIC_SIGNAL_SPACING_MAX,
    Math.max(
      RADAR_DYNAMIC_SIGNAL_SPACING_MIN,
      RADAR_DYNAMIC_SIGNAL_SPACING_MEAN +
        (Math.random() - 0.5) * RADAR_DYNAMIC_SIGNAL_SPACING_STD_DEV
    )
  )
}

function getSignalPositionOnBeam(angle: number) {
  const radius =
    RADAR_DYNAMIC_SIGNAL_INNER_RADIUS +
    Math.random() *
      (RADAR_DYNAMIC_SIGNAL_OUTER_RADIUS - RADAR_DYNAMIC_SIGNAL_INNER_RADIUS)
  const radians = (angle * Math.PI) / 180

  return {
    left: `${50 + radius * Math.sin(radians)}%`,
    top: `${50 - radius * Math.cos(radians)}%`,
  }
}

function HomeRadarAvatar({ avatarSrc }: { avatarSrc: string }) {
  return (
    <div aria-hidden="true" className={styles.avatarAnchorWrap}>
      <div className={styles.avatarAnchorGlow} />
      <div className={styles.avatarAnchorGlass} />
      <div className={styles.avatarAnchorFrame}>
        <img
          src={avatarSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className={styles.avatarAnchorImage}
        />
      </div>
    </div>
  )
}

function RadarMetaItem({
  value,
  label,
  button = false,
  expanded,
  pressed,
  controlsId,
  onClick,
}: {
  value: string
  label: string
  button?: boolean
  expanded?: boolean
  pressed?: boolean
  controlsId?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <span className={styles.metaValue}>{value}</span>
      <span className={styles.metaLabel}>{label}</span>
    </>
  )

  if (button) {
    return (
      <button
        type="button"
        aria-expanded={expanded}
        aria-pressed={pressed}
        aria-controls={controlsId}
        className={cn(styles.metaItem, styles.metaItemButton)}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return <div className={styles.metaItem}>{content}</div>
}

function RadarAxisMarker({
  label,
  left,
  top,
  className,
}: {
  label: string
  left: string
  top: string
  className: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(styles.axisMarker, className)}
      style={{ left, top }}
    >
      <span className={styles.axisMarkerTick} />
      <span>{label}</span>
    </div>
  )
}

export function HomeRadarSection({ avatarSrc }: HomeRadarSectionProps) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const [isSignalListOpen, setIsSignalListOpen] = useState(false)
  const [activeSignalCategory, setActiveSignalCategory] =
    useState<RadarNodeCategory>('personal-blog')
  const [isRadarManuallyPaused, setIsRadarManuallyPaused] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [isRadarSectionVisible, setIsRadarSectionVisible] = useState(true)
  const [signalPortalState, setSignalPortalState] =
    useState<SignalPortalState | null>(null)
  const [signalListPosition, setSignalListPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const signalTriggerRef = useRef<HTMLDivElement | null>(null)
  const signalListRef = useRef<HTMLDivElement | null>(null)
  const signalNodeRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const signalPortalFrameRef = useRef<number | null>(null)
  const signalPortalCloseTimeoutRef = useRef<number | null>(null)
  useEffect(() => {
    const updateVisibility = () => {
      setIsPageVisible(document.visibilityState !== 'hidden')
    }

    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    window.addEventListener('focus', updateVisibility)
    window.addEventListener('blur', updateVisibility)

    return () => {
      document.removeEventListener('visibilitychange', updateVisibility)
      window.removeEventListener('focus', updateVisibility)
      window.removeEventListener('blur', updateVisibility)
    }
  }, [])

  const isRadarPaused =
    isRadarManuallyPaused || !isPageVisible || !isRadarSectionVisible
  const introEyebrow = isZh
    ? '个人雷达 / Curated orbit'
    : 'Personal radar / Curated orbit'
  const introDescription = isZh
    ? '把我喜欢的博客、网页和有意思的网络角落整理成一个小雷达'
    : 'A slow personal scan of the blogs, experiments, and web corners I keep returning to.'
  const signalCount = String(RADAR_NODES.length).padStart(2, '0')
  const activeSignalSourceNodes = RADAR_NODES.filter(
    (node) => node.category === activeSignalCategory
  )
  const signalListId = 'home-radar-signal-list'
  const {
    activateSignalNode,
    activeNodeId,
    ambienceReveal,
    beamAngle,
    beamFocusAngle,
    beamOpacity,
    beamRotate,
    horizontalLineReveal,
    introReveal,
    progress,
    scheduleSignalNodeDeactivate,
    sectionRef,
    verticalLineReveal,
  } = useHomeRadarScene({ paused: isRadarPaused })
  const activeNode = activeNodeId
    ? (RADAR_NODES.find((node) => node.id === activeNodeId) ?? null)
    : null

  const [dynamicSignals, setDynamicSignals] = useState<DynamicRadarSignal[]>([])
  const previousBeamAngleRef = useRef(beamAngle)
  const totalBeamRotationRef = useRef(beamAngle)
  const nextSignalRotationRef = useRef(
    beamAngle + getNormallyBiasedSignalSpacing()
  )
  const dynamicSignalSequenceRef = useRef(0)
  const nextSignalNodeIndexRef = useRef(0)

  useEffect(() => {
    const sectionNode = sectionRef.current
    if (!sectionNode || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsRadarSectionVisible(entry.isIntersecting)
      },
      {
        threshold: 0.08,
      }
    )

    observer.observe(sectionNode)

    return () => observer.disconnect()
  }, [sectionRef])

  useEffect(() => {
    if (beamOpacity <= 0.02) {
      previousBeamAngleRef.current = beamAngle
      totalBeamRotationRef.current = beamAngle
      nextSignalRotationRef.current =
        beamAngle + getNormallyBiasedSignalSpacing()
      setDynamicSignals((current) => (current.length > 0 ? [] : current))
      return
    }

    if (isRadarPaused) {
      previousBeamAngleRef.current = beamAngle
      return
    }

    const previousAngle = previousBeamAngleRef.current
    const angleDelta = getClockwiseRadarDelta(previousAngle, beamAngle)

    previousBeamAngleRef.current = beamAngle
    totalBeamRotationRef.current += angleDelta

    if (angleDelta <= 0) {
      return
    }

    const currentRotation = totalBeamRotationRef.current
    const liveSignals = dynamicSignals.filter(
      (signal) =>
        currentRotation - signal.createdAtRotation <
        RADAR_DYNAMIC_SIGNAL_FADE_START + RADAR_DYNAMIC_SIGNAL_FADE_DISTANCE
    )
    const nextSignals: DynamicRadarSignal[] = []

    while (
      currentRotation >= nextSignalRotationRef.current &&
      nextSignals.length < 1 &&
      liveSignals.length + nextSignals.length < RADAR_DYNAMIC_SIGNAL_MAX_COUNT
    ) {
      const targetAngle = beamFocusAngle
      const occupiedNodeIds = new Set([
        ...liveSignals.map((signal) => signal.node.id),
        ...nextSignals.map((signal) => signal.node.id),
      ])
      let node =
        RADAR_NODES[nextSignalNodeIndexRef.current % RADAR_NODES.length]

      for (let offset = 0; offset < RADAR_NODES.length; offset += 1) {
        const candidateIndex =
          (nextSignalNodeIndexRef.current + offset) % RADAR_NODES.length
        const candidate = RADAR_NODES[candidateIndex]

        if (!occupiedNodeIds.has(candidate.id)) {
          node = candidate
          nextSignalNodeIndexRef.current =
            (candidateIndex + 1) % RADAR_NODES.length
          break
        }
      }

      const { left, top } = getSignalPositionOnBeam(targetAngle)

      dynamicSignalSequenceRef.current += 1
      nextSignals.push({
        id: `${node.id}-${currentRotation.toFixed(2)}-${dynamicSignalSequenceRef.current}`,
        node,
        left,
        top,
        createdAtRotation: currentRotation,
      })

      nextSignalRotationRef.current =
        currentRotation + getNormallyBiasedSignalSpacing()
    }

    setDynamicSignals((current) => {
      const currentLiveSignals = current.filter(
        (signal) =>
          currentRotation - signal.createdAtRotation <
          RADAR_DYNAMIC_SIGNAL_FADE_START + RADAR_DYNAMIC_SIGNAL_FADE_DISTANCE
      )

      if (
        nextSignals.length === 0 &&
        currentLiveSignals.length === current.length
      ) {
        return current
      }

      const combined = [...currentLiveSignals, ...nextSignals]

      return combined.slice(
        Math.max(0, combined.length - RADAR_DYNAMIC_SIGNAL_MAX_COUNT)
      )
    })
  }, [beamAngle, beamFocusAngle, beamOpacity, dynamicSignals, isRadarPaused])

  const measureSignalPortalLayout = (node: RadarNode) => {
    const triggerRect = signalNodeRefs.current[node.id]?.getBoundingClientRect()

    if (!triggerRect) return null

    const { shiftX, shiftY } = getSignalShellShift(
      node,
      SIGNAL_CARD_SIZE_PX,
      triggerRect.width
    )

    return {
      originTop: triggerRect.top,
      originLeft: triggerRect.left,
      originSize: triggerRect.width,
      targetTop:
        triggerRect.top +
        (triggerRect.height - SIGNAL_CARD_SIZE_PX) / 2 +
        shiftY,
      targetLeft:
        triggerRect.left +
        (triggerRect.width - SIGNAL_CARD_SIZE_PX) / 2 +
        shiftX,
    }
  }

  useEffect(() => {
    if (signalPortalFrameRef.current != null) {
      cancelAnimationFrame(signalPortalFrameRef.current)
      signalPortalFrameRef.current = null
    }

    if (signalPortalCloseTimeoutRef.current != null) {
      window.clearTimeout(signalPortalCloseTimeoutRef.current)
      signalPortalCloseTimeoutRef.current = null
    }

    if (!activeNode) {
      setSignalPortalState((current) =>
        current ? { ...current, expanded: false } : null
      )
      signalPortalCloseTimeoutRef.current = window.setTimeout(() => {
        signalPortalCloseTimeoutRef.current = null
        setSignalPortalState(null)
      }, 240)
      return
    }

    const nextLayout = measureSignalPortalLayout(activeNode)
    if (!nextLayout) return

    setSignalPortalState({
      node: activeNode,
      ...nextLayout,
      expanded: false,
    })

    signalPortalFrameRef.current = window.requestAnimationFrame(() => {
      signalPortalFrameRef.current = null
      setSignalPortalState((current) =>
        current && current.node.id === activeNode.id
          ? { ...current, expanded: true }
          : current
      )
    })
  }, [activeNode])

  useEffect(() => {
    if (!signalPortalState) return

    const updateSignalPortalLayout = () => {
      const nextLayout = measureSignalPortalLayout(signalPortalState.node)
      if (!nextLayout) return

      setSignalPortalState((current) =>
        current && current.node.id === signalPortalState.node.id
          ? { ...current, ...nextLayout }
          : current
      )
    }

    window.addEventListener('resize', updateSignalPortalLayout)
    window.addEventListener('scroll', updateSignalPortalLayout, true)

    return () => {
      window.removeEventListener('resize', updateSignalPortalLayout)
      window.removeEventListener('scroll', updateSignalPortalLayout, true)
    }
  }, [signalPortalState])

  useEffect(() => {
    return () => {
      if (signalPortalFrameRef.current != null) {
        cancelAnimationFrame(signalPortalFrameRef.current)
      }
      if (signalPortalCloseTimeoutRef.current != null) {
        window.clearTimeout(signalPortalCloseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isSignalListOpen) return

    const updateSignalListPosition = () => {
      const triggerRect = signalTriggerRef.current?.getBoundingClientRect()
      if (!triggerRect) return

      const viewportWidth = window.innerWidth
      const sideMargin = viewportWidth >= 640 ? 32 : 24
      const panelWidth = Math.min(336, viewportWidth - sideMargin * 2)
      const maxLeft = Math.max(
        sideMargin,
        viewportWidth - panelWidth - sideMargin
      )

      setSignalListPosition({
        top: triggerRect.bottom + 12,
        left: Math.max(sideMargin, Math.min(triggerRect.left, maxLeft)),
        width: panelWidth,
      })
    }

    updateSignalListPosition()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      const isInsideTrigger =
        signalTriggerRef.current?.contains(target) ?? false
      const isInsideList = signalListRef.current?.contains(target) ?? false

      if (!isInsideTrigger && !isInsideList) {
        setIsSignalListOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSignalListOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateSignalListPosition)
    window.addEventListener('scroll', updateSignalListPosition, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateSignalListPosition)
      window.removeEventListener('scroll', updateSignalListPosition, true)
    }
  }, [isSignalListOpen])

  return (
    <section
      ref={sectionRef}
      data-home-snap="radar"
      aria-label={isZh ? '主页雷达区' : 'Homepage radar'}
      className="relative isolate z-[30] h-[100svh] overflow-hidden"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <div
        aria-hidden="true"
        className={styles.softGlowLeft}
        style={{ opacity: ambienceReveal * 0.72 }}
      />
      <div
        aria-hidden="true"
        className={styles.softGlowRight}
        style={{ opacity: ambienceReveal * 0.9 }}
      />
      <div
        aria-hidden="true"
        className={styles.gridBackdrop}
        style={{ opacity: ambienceReveal * 0.4 }}
      />
      <div
        aria-hidden="true"
        className={styles.crosshairVertical}
        style={{
          opacity: verticalLineReveal * 0.9,
          transform: `translateX(-50%) scaleY(${Math.max(0.001, verticalLineReveal)})`,
        }}
      />
      <div
        aria-hidden="true"
        className={styles.crosshairHorizontal}
        style={{
          top: HOME_RADAR_CENTER_Y,
          opacity: horizontalLineReveal,
          transform: `translateY(-50%) scaleX(${Math.max(0.001, horizontalLineReveal)})`,
        }}
      />

      <div
        aria-hidden="true"
        className={styles.radarSweepClip}
        style={{ opacity: beamOpacity }}
      >
        <div className={styles.radarSweepStage}>
          <div
            className={styles.scanBeam}
            style={{
              top: HOME_RADAR_CENTER_Y,
              rotate: `${beamRotate}deg`,
              background:
                'conic-gradient(from 0deg, rgba(6,182,212,0) 0deg, rgba(6,182,212,0) 324deg, rgba(6,182,212,0.05) 338deg, rgba(6,182,212,0.12) 348deg, rgba(6,182,212,0.34) 356deg, rgba(6,182,212,0.08) 360deg)',
            }}
          />
        </div>
      </div>

      <div className="relative z-10 h-full w-full">
        <div
          className={styles.introPanel}
          style={{
            opacity: introReveal,
            transform: `translateY(${(1 - introReveal) * 18}px)`,
          }}
        >
          <div className={styles.introEyebrowRow}>
            <div aria-hidden="true" className={styles.introEyebrowRule} />
            <p className={styles.introEyebrow}>{introEyebrow}</p>
          </div>
          <h2
            className={cn(
              'heading-display',
              styles.introTitle,
              isZh && styles.introTitleNoWrap
            )}
          >
            {isZh ? '发现的博客和网站' : 'Blogs and Sites I Discovered'}
          </h2>
          <p className={styles.introDescription}>{introDescription}</p>
          <div className={styles.metaRow}>
            <div ref={signalTriggerRef} className={styles.metaPopoverAnchor}>
              <RadarMetaItem
                value={signalCount}
                label={isZh ? '信号源' : 'Signals'}
                button
                expanded={isSignalListOpen}
                controlsId={signalListId}
                onClick={() => setIsSignalListOpen((open) => !open)}
              />
            </div>

            <RadarMetaItem
              value={
                isRadarManuallyPaused
                  ? isZh
                    ? '暂停'
                    : 'Paused'
                  : isZh
                    ? '扫描'
                    : 'Sweep'
              }
              label={
                isRadarManuallyPaused
                  ? isZh
                    ? '继续'
                    : 'Resume'
                  : isZh
                    ? '动态'
                    : 'Live'
              }
              button
              pressed={isRadarManuallyPaused}
              onClick={() => setIsRadarManuallyPaused((paused) => !paused)}
            />
          </div>
        </div>

        <div className={styles.radarStage}>
          <div
            style={{ top: HOME_RADAR_CENTER_Y }}
            className={styles.radarField}
          >
            <div
              aria-hidden="true"
              className={styles.fieldVignette}
              style={{ opacity: ambienceReveal * 0.82 }}
            />
            <div
              aria-hidden="true"
              className={styles.fieldPerimeter}
              style={{ opacity: mix(0.22, 0.76, ambienceReveal) }}
            />
            <div
              aria-hidden="true"
              className={styles.fieldCenterGlow}
              style={{ opacity: ambienceReveal * 0.58 }}
            />
            <div
              aria-hidden="true"
              className={styles.fieldCenterDisc}
              style={{ opacity: mix(0.14, 0.62, verticalLineReveal) }}
            />
            {RADAR_AXIS_MARKERS.map((marker) => (
              <RadarAxisMarker
                key={marker.label}
                label={marker.label}
                left={marker.left}
                top={marker.top}
                className={marker.className}
              />
            ))}
            {RING_INSETS.map((inset, index) => {
              const ringRaw = segmentProgress(
                progress,
                HOME_RADAR_RING_START + index * HOME_RADAR_RING_STAGGER,
                HOME_RADAR_RING_START +
                  index * HOME_RADAR_RING_STAGGER +
                  HOME_RADAR_RING_DURATION
              )
              const ringOpacity = easeOutCubic(ringRaw)
              const ringScale = mix(0.34, 1, easeOutBack(ringRaw))

              return (
                <div
                  key={inset}
                  aria-hidden="true"
                  className={cn(
                    styles.ring,
                    index === RING_INSETS.length - 1 && styles.outerRing
                  )}
                  style={{
                    inset,
                    opacity: ringOpacity,
                    scale: ringScale,
                  }}
                />
              )
            })}

            <HomeRadarAvatar avatarSrc={avatarSrc} />

            {dynamicSignals.map((signal) => {
              const node = signal.node
              const nodeLabel = isZh ? node.label.zh : node.label.en
              const nodeEyebrow = isZh ? node.eyebrow.zh : node.eyebrow.en
              const nodeDescription = isZh
                ? node.description.zh
                : node.description.en
              const dotSize = getNodeDotSize(node)
              const pulseFieldSize = dotSize + 56
              const useDarkCardText = isLightHexColor(node.color)
              const cardTextColor = useDarkCardText ? '#0F172A' : '#FFFFFF'
              const cardMutedTextColor = useDarkCardText
                ? 'rgba(15,23,42,0.72)'
                : 'rgba(255,255,255,0.8)'
              const iconInsetPercent = Math.max(
                4,
                10 - (node.dotScaleSteps ?? 0) * 2
              )
              const faviconScale = 1.12 + (node.dotScaleSteps ?? 0) * 0.08
              const { shiftX, shiftY } = getSignalShellShift(
                node,
                SIGNAL_CARD_SIZE_PX,
                dotSize
              )
              const shellOffset = (dotSize - SIGNAL_CARD_SIZE_PX) / 2
              const hoverPadLeft = shellOffset + shiftX
              const hoverPadTop = shellOffset + shiftY
              const signalShellBackground = 'transparent'
              const signalShellBorderColor = 'transparent'
              const signalIconFrameBackground = '#FFFFFF'
              const signalIconFrameBorderColor = '#E2E8F0'
              const signalIconFrameScale = 1
              const signalIconFrameShadow =
                '0 12px 18px -14px rgba(15,23,42,0.14)'
              const signalAge =
                totalBeamRotationRef.current - signal.createdAtRotation
              const enterProgress = easeOutBack(
                Math.min(
                  1,
                  Math.max(0, signalAge / RADAR_DYNAMIC_SIGNAL_ENTER_DISTANCE)
                )
              )
              const hitGlowProgress = Math.max(
                0,
                1 - signalAge / RADAR_DYNAMIC_SIGNAL_HIT_GLOW_DISTANCE
              )
              const fadeProgress = Math.min(
                1,
                Math.max(
                  0,
                  (signalAge - RADAR_DYNAMIC_SIGNAL_FADE_START) /
                    RADAR_DYNAMIC_SIGNAL_FADE_DISTANCE
                )
              )
              const signalOpacity = enterProgress * (1 - fadeProgress)
              const signalScale =
                mix(0.42, 1, enterProgress) * mix(1, 0.88, fadeProgress)
              const pulseOpacity =
                Math.max(0, 0.86 - fadeProgress * 0.92) *
                Math.max(0.18, enterProgress)
              const pulseScale =
                mix(0.7, 1.08, enterProgress) + fadeProgress * 0.2
              const hitGlowOpacity = hitGlowProgress * (1 - fadeProgress)
              const hitGlowScale = mix(
                0.72,
                1.28,
                easeOutCubic(hitGlowProgress)
              )
              const rippleDelay = `-${(signal.createdAtRotation % 1.8).toFixed(2)}s`

              return (
                <a
                  key={signal.id}
                  ref={(element) => {
                    signalNodeRefs.current[node.id] = element
                  }}
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={nodeLabel}
                  title={nodeLabel}
                  className={cn(
                    styles.signalLink,
                    activeNodeId === node.id && styles.signalLinkActive
                  )}
                  onPointerEnter={() => activateSignalNode(node.id)}
                  onPointerLeave={() => scheduleSignalNodeDeactivate(node.id)}
                  onFocus={() => activateSignalNode(node.id)}
                  onBlur={() => scheduleSignalNodeDeactivate(node.id)}
                  style={{
                    left: signal.left,
                    top: signal.top,
                    width: dotSize,
                    height: dotSize,
                    opacity: signalOpacity,
                    scale: signalScale,
                    pointerEvents: signalOpacity >= 0.85 ? 'auto' : 'none',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={styles.signalHoverPad}
                    style={{
                      left: hoverPadLeft,
                      top: hoverPadTop,
                      width: SIGNAL_CARD_SIZE_PX,
                      height: SIGNAL_CARD_SIZE_PX,
                      pointerEvents: 'none',
                    }}
                  />

                  <span
                    aria-hidden="true"
                    className={styles.signalPulseField}
                    style={{
                      width: pulseFieldSize,
                      height: pulseFieldSize,
                      opacity: pulseOpacity,
                    }}
                  >
                    <span
                      className={styles.signalPulseHalo}
                      style={{
                        opacity: pulseOpacity * 0.8,
                        scale: pulseScale,
                        background: `radial-gradient(circle, ${withAlpha(
                          node.color,
                          0.22
                        )} 0%, ${withAlpha(node.color, 0.1)} 34%, ${withAlpha(
                          node.color,
                          0
                        )} 60%)`,
                      }}
                    />
                    <span
                      className={cn(
                        styles.signalPulseRing,
                        styles.signalPulseRipple
                      )}
                      style={{
                        opacity: pulseOpacity * 0.7,
                        scale: pulseScale + 0.08,
                        borderColor: withAlpha(node.color, 0.3),
                        boxShadow: `0 0 20px ${withAlpha(node.color, 0.16)}`,
                        animationDelay: rippleDelay,
                      }}
                    />
                    <span
                      className={cn(
                        styles.signalPulseEcho,
                        styles.signalPulseRippleSlow
                      )}
                      style={{
                        opacity: pulseOpacity * 0.42,
                        scale: pulseScale + 0.24,
                        borderColor: withAlpha(node.color, 0.12),
                        animationDelay: rippleDelay,
                      }}
                    />
                  </span>

                  <span
                    aria-hidden="true"
                    className={styles.signalShell}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      opacity: activeNodeId === node.id ? 0 : signalOpacity,
                      borderRadius: dotSize,
                      background: signalShellBackground,
                      borderColor: signalShellBorderColor,
                      boxShadow: 'none',
                      ['--signal-shell-translate' as string]: '0 0',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={styles.signalScanGlow}
                      style={{
                        opacity: 0.18 + hitGlowOpacity * 0.58,
                        scale: Math.max(1.02, hitGlowScale),
                        background: `radial-gradient(circle, ${withAlpha(
                          node.color,
                          0.42 + hitGlowOpacity * 0.18
                        )} 0%, ${withAlpha(node.color, 0.16)} 44%, ${withAlpha(
                          node.color,
                          0
                        )} 74%)`,
                      }}
                    />

                    <span
                      aria-hidden="true"
                      className={styles.signalIconFrame}
                      style={{
                        left: 0,
                        top: 0,
                        borderRadius: dotSize,
                        background: signalIconFrameBackground,
                        borderColor: signalIconFrameBorderColor,
                        boxShadow: signalIconFrameShadow,
                        scale: signalIconFrameScale,
                      }}
                    >
                      <span
                        className={styles.signalIconFrameInner}
                        style={{ padding: `${iconInsetPercent}%` }}
                      >
                        <img
                          src={node.faviconSrc}
                          alt=""
                          className={styles.signalIconImage}
                          loading="lazy"
                          decoding="async"
                          style={{ scale: faviconScale }}
                        />
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        styles.signalCopy,
                        styles.signalCopyInactive
                      )}
                    >
                      <span className={styles.signalCopyHeader}>
                        <span className={styles.signalCopySpacer} />
                        <span className={styles.signalCopyTitleBlock}>
                          <span
                            className={styles.signalCardEyebrow}
                            style={{ color: cardMutedTextColor }}
                          >
                            {nodeEyebrow}
                          </span>
                          <span
                            className={styles.signalCardTitle}
                            style={{ color: cardTextColor }}
                          >
                            {nodeLabel}
                          </span>
                        </span>
                      </span>
                      <span
                        className={styles.signalCardDescription}
                        style={{ color: cardMutedTextColor }}
                      >
                        {nodeDescription}
                      </span>
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {signalPortalState && typeof document !== 'undefined'
        ? createPortal(
            <a
              href={signalPortalState.node.href}
              target="_blank"
              rel="noreferrer"
              aria-label={
                isZh
                  ? signalPortalState.node.label.zh
                  : signalPortalState.node.label.en
              }
              title={
                isZh
                  ? signalPortalState.node.label.zh
                  : signalPortalState.node.label.en
              }
              className={styles.signalPortalCard}
              style={{
                position: 'fixed',
                top: signalPortalState.expanded
                  ? signalPortalState.targetTop
                  : signalPortalState.originTop,
                left: signalPortalState.expanded
                  ? signalPortalState.targetLeft
                  : signalPortalState.originLeft,
                width: signalPortalState.expanded
                  ? SIGNAL_CARD_SIZE_PX
                  : signalPortalState.originSize,
                height: signalPortalState.expanded
                  ? SIGNAL_CARD_SIZE_PX
                  : signalPortalState.originSize,
                borderRadius: signalPortalState.expanded
                  ? 32
                  : signalPortalState.originSize,
                background: signalPortalState.expanded
                  ? signalPortalState.node.color
                  : 'transparent',
                color: isLightHexColor(signalPortalState.node.color)
                  ? '#0F172A'
                  : '#FFFFFF',
                boxShadow: signalPortalState.expanded
                  ? '0 24px 56px -42px rgba(15,23,42,0.18)'
                  : 'none',
              }}
              onPointerEnter={() =>
                activateSignalNode(signalPortalState.node.id)
              }
              onPointerLeave={() =>
                scheduleSignalNodeDeactivate(signalPortalState.node.id)
              }
              onFocus={() => activateSignalNode(signalPortalState.node.id)}
              onBlur={() =>
                scheduleSignalNodeDeactivate(signalPortalState.node.id)
              }
            >
              <span
                aria-hidden="true"
                className={styles.signalPortalIconFrame}
                style={{
                  left: signalPortalState.expanded ? 16 : 0,
                  top: signalPortalState.expanded ? 16 : 0,
                  width: signalPortalState.expanded
                    ? SIGNAL_DOT_SIZE_PX
                    : signalPortalState.originSize,
                  height: signalPortalState.expanded
                    ? SIGNAL_DOT_SIZE_PX
                    : signalPortalState.originSize,
                  borderRadius: signalPortalState.expanded
                    ? 18
                    : signalPortalState.originSize,
                  background: '#FFFFFF',
                  borderColor: signalPortalState.expanded
                    ? 'transparent'
                    : '#E2E8F0',
                  boxShadow: signalPortalState.expanded
                    ? '0 14px 26px -22px rgba(15,23,42,0.16)'
                    : '0 12px 18px -14px rgba(15,23,42,0.14)',
                }}
              >
                <span
                  className={styles.signalIconFrameInner}
                  style={{
                    padding: signalPortalState.expanded
                      ? '6%'
                      : `${Math.max(
                          4,
                          10 - (signalPortalState.node.dotScaleSteps ?? 0) * 2
                        )}%`,
                  }}
                >
                  <img
                    src={signalPortalState.node.faviconSrc}
                    alt=""
                    className={styles.signalIconImage}
                    loading="lazy"
                    decoding="async"
                    style={{
                      scale: signalPortalState.expanded
                        ? 1.08
                        : 1.12 +
                          (signalPortalState.node.dotScaleSteps ?? 0) * 0.08,
                    }}
                  />
                </span>
              </span>

              <span
                className={cn(
                  styles.signalCopy,
                  signalPortalState.expanded
                    ? styles.signalCopyActive
                    : styles.signalCopyInactive,
                  styles.signalPortalCopy
                )}
                style={{
                  color: isLightHexColor(signalPortalState.node.color)
                    ? 'rgba(15,23,42,0.72)'
                    : 'rgba(255,255,255,0.8)',
                }}
              >
                <span className={styles.signalCopyHeader}>
                  <span className={styles.signalCopySpacer} />
                  <span className={styles.signalCopyTitleBlock}>
                    <span className={styles.signalCardEyebrow}>
                      {isZh
                        ? signalPortalState.node.eyebrow.zh
                        : signalPortalState.node.eyebrow.en}
                    </span>
                    <span
                      className={styles.signalCardTitle}
                      style={{
                        color: isLightHexColor(signalPortalState.node.color)
                          ? '#0F172A'
                          : '#FFFFFF',
                      }}
                    >
                      {isZh
                        ? signalPortalState.node.label.zh
                        : signalPortalState.node.label.en}
                    </span>
                  </span>
                </span>
                <span className={styles.signalCardDescription}>
                  {isZh
                    ? signalPortalState.node.description.zh
                    : signalPortalState.node.description.en}
                </span>
              </span>
            </a>,
            document.body
          )
        : null}

      {isSignalListOpen && signalListPosition && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={signalListRef}
              id={signalListId}
              aria-label={isZh ? '雷达信号列表' : 'Radar signal list'}
              className={styles.signalSourceList}
              onWheel={(event) => event.stopPropagation()}
              style={{
                position: 'fixed',
                top: signalListPosition.top,
                left: signalListPosition.left,
                width: signalListPosition.width,
              }}
            >
              <div className={styles.signalSourceListHeader}>
                <span className={styles.signalSourceListTitle}>
                  {isZh ? '雷达信号列表' : 'Radar signals'}
                </span>
                <span className={styles.signalSourceListCount}>
                  {signalCount}
                </span>
              </div>

              <div
                className={styles.signalSourceTabs}
                role="tablist"
                aria-label={isZh ? '信号分类' : 'Signal categories'}
              >
                {RADAR_CATEGORY_ORDER.map((category) => {
                  const isActiveCategory = activeSignalCategory === category
                  const categoryLabel = isZh
                    ? RADAR_CATEGORY_LABELS[category].zh
                    : RADAR_CATEGORY_LABELS[category].en
                  const categoryCount = RADAR_NODES.filter(
                    (node) => node.category === category
                  ).length

                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActiveCategory}
                      className={cn(
                        styles.signalSourceTab,
                        isActiveCategory && styles.signalSourceTabActive
                      )}
                      onClick={() => setActiveSignalCategory(category)}
                    >
                      <span>{categoryLabel}</span>
                      <span className={styles.signalSourceTabCount}>
                        {String(categoryCount).padStart(2, '0')}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div
                className={styles.signalSourceListBody}
                onWheel={(event) => event.stopPropagation()}
              >
                {activeSignalSourceNodes.map((node) => (
                  <a
                    key={node.id}
                    href={node.href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.signalSourceItem}
                    onClick={() => setIsSignalListOpen(false)}
                  >
                    <span className={styles.signalSourceIconWrap}>
                      <img
                        src={node.faviconSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={styles.signalSourceIcon}
                      />
                    </span>
                    <span className={styles.signalSourceName}>
                      {isZh ? node.label.zh : node.label.en}
                    </span>
                  </a>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  )
}

const styles = {
  softGlowLeft:
    'pointer-events-none absolute left-[-12rem] top-[7rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.14)_0%,rgba(6,182,212,0.04)_34%,rgba(6,182,212,0)_74%)] blur-3xl',
  softGlowRight:
    'pointer-events-none absolute bottom-[3rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,rgba(249,115,22,0.04)_34%,rgba(249,115,22,0)_74%)] blur-3xl',
  gridBackdrop:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.07)_0px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_0px,transparent_1px)] [background-size:24px_24px]',
  introPanel:
    'pointer-events-none absolute left-6 top-[12svh] z-[110] max-w-[min(34rem,calc(100vw-3rem))] space-y-4 sm:left-8 sm:top-[13svh] sm:max-w-[min(34rem,calc(100vw-4rem))] sm:space-y-5 lg:left-12 lg:top-[14svh] xl:left-16 2xl:left-24',
  introEyebrowRow: 'flex items-center gap-3',
  introEyebrowRule:
    'h-px w-12 bg-[linear-gradient(90deg,rgba(15,23,42,0.18),rgba(15,23,42,0))] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.2),rgba(255,255,255,0))]',
  introEyebrow:
    'font-[var(--font-pixel)] text-[0.68rem] uppercase tracking-[0.26em] text-slate-500/74 dark:text-white/42',
  introTitle:
    'max-w-[15ch] text-[1.55rem] leading-[1.02] text-balance text-slate-950 [text-shadow:0_10px_28px_rgba(255,255,255,0.82)] sm:text-[1.95rem] dark:text-white dark:[text-shadow:0_14px_32px_rgba(2,6,23,0.68)]',
  introTitleNoWrap: 'max-w-none whitespace-nowrap text-wrap-normal',
  introDescription:
    'max-w-[34ch] text-sm leading-6 text-slate-600/84 dark:text-white/58 sm:text-[0.95rem]',
  metaRow: 'flex flex-wrap items-baseline gap-x-5 gap-y-3',
  metaPopoverAnchor: 'relative z-[120] pointer-events-auto',
  metaItem:
    'flex items-baseline gap-2.5 border-l border-slate-300/55 pl-4 first:border-l-0 first:pl-0 dark:border-white/12',
  metaItemButton:
    'pointer-events-auto cursor-pointer transition-colors duration-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 dark:hover:text-white dark:focus-visible:ring-cyan-300/45',
  metaValue:
    'text-[1.08rem] font-semibold leading-none tracking-[0.02em] text-slate-900 dark:text-white/88',
  metaLabel:
    'text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-slate-500/78 dark:text-white/40',
  signalSourceList:
    'pointer-events-auto z-[140] rounded-[24px] bg-white/88 p-3 shadow-[0_28px_64px_-36px_rgba(15,23,42,0.34)] backdrop-blur-xl dark:bg-slate-950/84',
  signalSourceListHeader: 'flex items-center justify-between gap-4 px-1 pb-2',
  signalSourceListTitle:
    'text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-slate-500/82 dark:text-white/44',
  signalSourceListCount:
    'text-sm font-semibold tracking-[0.02em] text-slate-900 dark:text-white/88',
  signalSourceTabs:
    'mb-2 grid grid-cols-2 gap-1 rounded-[18px] bg-slate-100/70 p-1 dark:bg-white/[0.045]',
  signalSourceTab:
    'inline-flex min-w-0 items-center justify-center gap-2 rounded-[14px] px-2.5 py-2 text-[0.72rem] font-semibold text-slate-500/82 transition-[background-color,color,box-shadow,transform] duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 dark:text-white/46 dark:hover:text-white/88',
  signalSourceTabActive:
    'bg-white text-slate-950 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.22)] dark:bg-white/12 dark:text-white',
  signalSourceTabCount:
    'shrink-0 font-[var(--font-pixel)] text-[0.62rem] opacity-60',
  signalSourceListBody:
    'grid max-h-[min(18rem,45svh)] gap-1.5 overflow-y-auto overscroll-contain pr-1',
  signalSourceItem:
    'group flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-colors duration-200 hover:bg-slate-100/84 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 dark:hover:bg-white/6 dark:focus-visible:ring-cyan-300/45',
  signalSourceIconWrap:
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)] dark:bg-white',
  signalSourceIcon: 'h-6 w-6 object-contain object-center',
  signalSourceName:
    'min-w-0 text-sm font-medium leading-6 text-slate-900 dark:text-white/88',
  signalPortalCard:
    'pointer-events-auto relative z-[140] overflow-hidden transition-[top,left,width,height,border-radius,background-color,box-shadow] duration-[380ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalPortalIconFrame:
    'absolute overflow-hidden border bg-white transition-[top,left,width,height,border-radius,border-color,box-shadow] duration-[340ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalPortalCopy: 'pointer-events-none inset-0',
  crosshairVertical:
    'pointer-events-none absolute left-1/2 top-0 h-full w-px origin-center bg-[linear-gradient(180deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.22)_18%,rgba(148,163,184,0.22)_82%,rgba(148,163,184,0)_100%)]',
  crosshairHorizontal:
    'pointer-events-none absolute left-0 h-px w-full origin-center bg-[linear-gradient(90deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.26)_18%,rgba(148,163,184,0.26)_82%,rgba(148,163,184,0)_100%)]',
  radarStage: 'absolute inset-0',
  radarSweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
  radarSweepStage: 'pointer-events-none absolute inset-0',
  radarField:
    'absolute left-1/2 h-[min(94vw,94vh)] w-[min(94vw,94vh)] max-h-[72rem] max-w-[72rem] -translate-x-1/2 -translate-y-1/2',
  fieldVignette:
    'pointer-events-none absolute inset-[2%] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0)_54%,rgba(15,23,42,0.12)_100%)] dark:bg-[radial-gradient(circle,rgba(2,6,23,0)_54%,rgba(2,6,23,0.3)_100%)]',
  fieldPerimeter:
    'pointer-events-none absolute inset-[3.5%] rounded-full border border-slate-300/42 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] dark:border-white/10 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
  fieldCenterGlow:
    'pointer-events-none absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.14)_0%,rgba(6,182,212,0.05)_42%,rgba(6,182,212,0)_76%)] blur-3xl',
  fieldCenterDisc:
    'pointer-events-none absolute left-1/2 top-1/2 h-[15.5%] w-[15.5%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300/55 dark:border-white/14',
  avatarAnchorWrap:
    'pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-[20%] w-[20%] min-h-[6.5rem] min-w-[6.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
  avatarAnchorGlow:
    'absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.2)_0%,rgba(6,182,212,0.08)_42%,rgba(6,182,212,0)_76%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(125,211,252,0.18)_0%,rgba(125,211,252,0.06)_44%,rgba(15,23,42,0)_78%)]',
  avatarAnchorGlass:
    'absolute inset-0 rounded-full border border-white/45 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_20px_44px_-32px_rgba(15,23,42,0.54)] backdrop-blur-2xl dark:border-white/14 dark:bg-white/8 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_44px_-32px_rgba(2,6,23,0.9)]',
  avatarAnchorFrame:
    'relative h-[72%] w-[72%] overflow-hidden rounded-full border border-slate-200/80 bg-white/72 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.48)] ring-1 ring-white/70 dark:border-white/24 dark:bg-slate-950/54 dark:shadow-[0_18px_34px_-24px_rgba(2,6,23,0.84)] dark:ring-white/10',
  avatarAnchorImage: 'h-full w-full scale-[1.04] object-cover object-center',
  axisMarker:
    'absolute z-[5] flex items-center gap-2 font-[var(--font-pixel)] text-[0.6rem] uppercase tracking-[0.24em] text-slate-500/72 dark:text-white/32',
  axisMarkerTick: 'h-px w-4 bg-slate-400/58 dark:bg-white/24',
  ring: 'pointer-events-none absolute rounded-full border border-slate-300/62',
  outerRing:
    'border-dashed border-slate-300/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.58)]',
  scanBeam:
    'pointer-events-none absolute left-1/2 top-1/2 h-[170vmax] w-[170vmax] -translate-x-1/2 -translate-y-1/2',
  signalLink:
    'absolute z-30 flex h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-visible focus-visible:z-50 focus-visible:outline-none',
  signalLinkActive: 'z-50',
  signalHoverPad: 'absolute rounded-[32px] opacity-0',
  signalPulseField:
    'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  signalPulseHalo:
    'absolute inset-0 rounded-full blur-[10px] transition-[opacity,scale] duration-[120ms] ease-out',
  signalPulseRing:
    'absolute inset-0 rounded-full border transition-[opacity,scale,border-color,box-shadow] duration-[120ms] ease-out',
  signalPulseEcho:
    'absolute inset-0 rounded-full border transition-[opacity,scale,border-color] duration-[160ms] ease-out',
  signalPulseRipple:
    '[animation:radar-signal-ripple_1.8s_cubic-bezier(0.16,1,0.3,1)_both] [@media(prefers-reduced-motion:reduce)]:[animation:none]',
  signalPulseRippleSlow:
    '[animation:radar-signal-ripple_2.35s_cubic-bezier(0.16,1,0.3,1)_both] [@media(prefers-reduced-motion:reduce)]:[animation:none]',
  signalScanGlow:
    'pointer-events-none absolute inset-0 rounded-full transition-[opacity,scale] duration-[180ms] ease-out',
  signalShell:
    'relative z-10 block shrink-0 overflow-hidden border border-transparent bg-white text-left text-slate-900 [translate:var(--signal-shell-translate)] transition-[width,height,translate,border-radius,box-shadow] duration-[380ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalIconFrame:
    'absolute h-[44px] w-[44px] overflow-hidden border border-slate-200 bg-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.18)] transition-[top,left,border-radius,scale] duration-[340ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalIconFrameInner:
    'relative z-10 grid h-full w-full place-items-center p-0',
  signalIconImage: 'h-full w-full object-contain object-center',
  signalCopy:
    'pointer-events-none absolute inset-0 flex flex-col justify-between p-[1.05rem] transition-[opacity,translate,filter] duration-[260ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalCopyInactive: 'translate-y-2.5 opacity-0 blur-[8px]',
  signalCopyActive: 'translate-y-0 opacity-100 blur-none',
  signalCopyHeader: 'flex items-start gap-3',
  signalCopySpacer: 'h-11 w-11 shrink-0',
  signalCopyTitleBlock: 'flex min-w-0 flex-1 flex-col gap-1 pt-0.5',
  signalCardEyebrow: 'text-[0.64rem] font-semibold uppercase tracking-[0.18em]',
  signalCardTitle: 'text-[0.98rem] font-semibold leading-5 tracking-[-0.01em]',
  signalCardDescription: 'relative z-10 text-[0.84rem] leading-6',
}
