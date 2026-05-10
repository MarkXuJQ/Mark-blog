import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  easeOutBack,
  easeOutCubic,
  getBeamRevealProgress,
  getRadarNodeAngle,
  getTrailingBeamImpact,
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
  NODE_REVEAL_ANGLE_WINDOW,
  NODE_SCAN_GLOW_ANGLE_WINDOW,
  RADAR_AXIS_MARKERS,
  RADAR_NODES,
  RING_INSETS,
  SIGNAL_CARD_SIZE_PX,
  SIGNAL_DOT_SIZE_PX,
  type RadarNode,
  type SignalPortalState,
  withAlpha,
} from './radarData'

interface HomeRadarSectionProps {
  avatarSrc: string
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
  controlsId,
  onClick,
}: {
  value: string
  label: string
  button?: boolean
  expanded?: boolean
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
  const introEyebrow = isZh
    ? '个人雷达 / Curated orbit'
    : 'Personal radar / Curated orbit'
  const introDescription = isZh
    ? '把我喜欢的博客、网页和有意思的网络角落整理成一个小雷达'
    : 'A slow personal scan of the blogs, experiments, and web corners I keep returning to.'
  const signalCount = String(RADAR_NODES.length).padStart(2, '0')
  const signalListId = 'home-radar-signal-list'
  const {
    activateSignalNode,
    activeNodeId,
    ambienceReveal,
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
  } = useHomeRadarScene()
  const activeNode = activeNodeId
    ? (RADAR_NODES.find((node) => node.id === activeNodeId) ?? null)
    : null

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
              value={isZh ? '动态' : 'Live'}
              label={isZh ? '扫描' : 'Sweep'}
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

            {RADAR_NODES.map((node) => {
              const nodeAngle = getRadarNodeAngle(node)
              const isNodeActive = activeNodeId === node.id
              const isNodePortalActive = signalPortalState?.node.id === node.id
              const nodeLabel = isZh ? node.label.zh : node.label.en
              const nodeEyebrow = isZh ? node.eyebrow.zh : node.eyebrow.en
              const nodeDescription = isZh
                ? node.description.zh
                : node.description.en
              const nodeRevealRaw =
                explorationProgress <= 0
                  ? 0
                  : beamLoopActive
                    ? 1
                    : getBeamRevealProgress(
                        beamFocusSweepAngle,
                        nodeAngle,
                        NODE_REVEAL_ANGLE_WINDOW,
                        beamSweepStartAngle
                      )
              const nodeOpacity = easeOutCubic(nodeRevealRaw)
              const nodeScale = mix(0.36, 1, easeOutBack(nodeRevealRaw))
              const scanGlowRaw =
                explorationProgress <= 0
                  ? 0
                  : getTrailingBeamImpact(
                      beamFocusAngle,
                      nodeAngle,
                      NODE_SCAN_GLOW_ANGLE_WINDOW
                    )
              const scanGlow = easeOutCubic(scanGlowRaw)
              const scanPulseProgress = 1 - scanGlowRaw
              const scanPulseTravel = easeOutCubic(scanPulseProgress)
              const dotSize = getNodeDotSize(node)
              const pulseFieldSize = dotSize + 46
              const pulseStartScale = dotSize / pulseFieldSize
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
              const restShellShadow = 'none'
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
              const signalScanGlowOpacity = isNodePortalActive
                ? 0
                : scanGlow * 0.92
              const signalScanGlowScale = mix(0.92, 1.14, scanGlow)
              const signalPulseFieldOpacity = isNodePortalActive
                ? 0
                : Math.min(1, scanGlow * 0.82)
              const signalPulseHaloOpacity = isNodePortalActive
                ? 0
                : Math.min(1, scanGlow * 0.9)
              const signalPulseHaloScale = mix(
                pulseStartScale * 0.96,
                1.18,
                scanPulseTravel
              )
              const signalPulseRingOpacity = isNodePortalActive
                ? 0
                : Math.min(1, scanGlow * 0.96)
              const signalPulseRingScale = mix(
                pulseStartScale,
                1.38,
                scanPulseTravel
              )
              const signalPulseEchoOpacity = isNodePortalActive
                ? 0
                : Math.min(1, scanGlow * 0.56)
              const signalPulseEchoScale = mix(
                pulseStartScale,
                1.58,
                scanPulseTravel
              )
              const signalIconFrameScale = 1
              const signalIconFrameShadow =
                scanGlow > 0.001
                  ? `0 12px 18px -14px rgba(15,23,42,0.14), 0 0 ${
                      14 + scanGlow * 20
                    }px ${withAlpha(node.color, 0.26 + scanGlow * 0.18)}`
                  : '0 12px 18px -14px rgba(15,23,42,0.14)'

              return (
                <a
                  key={node.id}
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
                    isNodeActive && styles.signalLinkActive
                  )}
                  onPointerEnter={() => activateSignalNode(node.id)}
                  onPointerLeave={() => scheduleSignalNodeDeactivate(node.id)}
                  onFocus={() => activateSignalNode(node.id)}
                  onBlur={() => scheduleSignalNodeDeactivate(node.id)}
                  style={{
                    left: node.left,
                    top: node.top,
                    width: dotSize,
                    height: dotSize,
                    opacity: nodeOpacity,
                    scale: nodeScale,
                    pointerEvents: nodeOpacity < 0.98 ? 'none' : 'auto',
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
                      opacity: signalPulseFieldOpacity,
                    }}
                  >
                    <span
                      className={styles.signalPulseHalo}
                      style={{
                        opacity: signalPulseHaloOpacity,
                        scale: signalPulseHaloScale,
                        background: `radial-gradient(circle, ${withAlpha(
                          node.color,
                          0.32 + scanGlow * 0.16
                        )} 0%, ${withAlpha(node.color, 0.12 + scanGlow * 0.08)} 34%, ${withAlpha(
                          node.color,
                          0
                        )} 60%)`,
                      }}
                    />
                    <span
                      className={styles.signalPulseRing}
                      style={{
                        opacity: signalPulseRingOpacity,
                        scale: signalPulseRingScale,
                        borderColor: withAlpha(
                          node.color,
                          0.28 + scanGlow * 0.24
                        ),
                        boxShadow: `0 0 ${16 + scanGlow * 18}px ${withAlpha(
                          node.color,
                          0.18 + scanGlow * 0.12
                        )}`,
                      }}
                    />
                    <span
                      className={styles.signalPulseEcho}
                      style={{
                        opacity: signalPulseEchoOpacity,
                        scale: signalPulseEchoScale,
                        borderColor: withAlpha(
                          node.color,
                          0.12 + scanGlow * 0.1
                        ),
                      }}
                    />
                  </span>

                  <span
                    aria-hidden="true"
                    className={styles.signalShell}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      opacity: isNodePortalActive ? 0 : nodeOpacity,
                      borderRadius: dotSize,
                      background: signalShellBackground,
                      borderColor: signalShellBorderColor,
                      boxShadow: restShellShadow,
                      ['--signal-shell-translate' as string]: '0 0',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={styles.signalScanGlow}
                      style={{
                        opacity: signalScanGlowOpacity,
                        scale: signalScanGlowScale,
                        background: `radial-gradient(circle, ${withAlpha(
                          node.color,
                          0.48
                        )} 0%, ${withAlpha(node.color, 0.18)} 44%, ${withAlpha(
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

              <div className={styles.signalSourceListBody}>
                {RADAR_NODES.map((node) => (
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
    'pointer-events-auto -mx-3 -my-2 cursor-pointer rounded-full px-3 py-2 transition-colors duration-200 hover:bg-slate-200/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 dark:hover:bg-white/10 dark:focus-visible:ring-cyan-300/45',
  metaValue:
    'text-[1.08rem] font-semibold leading-none tracking-[0.02em] text-slate-900 dark:text-white/88',
  metaLabel:
    'text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-slate-500/78 dark:text-white/40',
  signalSourceList:
    'pointer-events-auto z-[140] rounded-[24px] border border-slate-300/70 bg-white/88 p-3 shadow-[0_28px_64px_-36px_rgba(15,23,42,0.34)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/84',
  signalSourceListHeader: 'flex items-center justify-between gap-4 px-1 pb-2',
  signalSourceListTitle:
    'text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-slate-500/82 dark:text-white/44',
  signalSourceListCount:
    'text-sm font-semibold tracking-[0.02em] text-slate-900 dark:text-white/88',
  signalSourceListBody:
    'grid max-h-[min(18rem,45svh)] gap-1.5 overflow-y-auto pr-1',
  signalSourceItem:
    'group flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-colors duration-200 hover:bg-slate-100/84 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 dark:hover:bg-white/6 dark:focus-visible:ring-cyan-300/45',
  signalSourceIconWrap:
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-slate-200/80 bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white',
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
