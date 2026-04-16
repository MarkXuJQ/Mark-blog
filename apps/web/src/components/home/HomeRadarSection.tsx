import { motion, useReducedMotion } from 'framer-motion'
import { useLenis } from 'lenis/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import eventuallymakingFavicon from '../../assets/home/radar/eventuallymaking.png'
import joshwcomeauFavicon from '../../assets/home/radar/joshwcomeau.png'
import messengerFavicon from '../../assets/home/radar/messenger.png'
import pathosFavicon from '../../assets/home/radar/pathos.png'
import radiogardenFavicon from '../../assets/home/radar/radiogarden.png'
import ruanyifengFavicon from '../../assets/home/radar/ruanyifeng.png'
import tongliaoFavicon from '../../assets/home/radar/tongliao.png'

interface HomeRadarSectionProps {
  avatarSrc: string
}

interface RadarNode {
  id: string
  href: string
  left: string
  top: string
  faviconSrc: string
  label: {
    zh: string
    en: string
  }
  eyebrow: {
    zh: string
    en: string
  }
  description: {
    zh: string
    en: string
  }
  cardAlignX: 'left' | 'center' | 'right'
  cardAlignY: 'top' | 'bottom'
  color: string
  glow: string
}

const RADAR_NODES: RadarNode[] = [
  {
    id: 'ruanyifeng',
    href: 'https://www.ruanyifeng.com/blog/',
    left: '79%',
    top: '29%',
    faviconSrc: ruanyifengFavicon,
    label: { zh: '阮一峰的网络日志', en: "Ruanyifeng's Blog" },
    eyebrow: {
      zh: '科技写作 / 编程观察',
      en: 'Tech essays / Programming notes',
    },
    description: {
      zh: '长期更新的中文技术博客，围绕编程方法、工具趋势与科技周刊展开。',
      en: 'A long-running Chinese tech blog about programming practice, tools, and weekly observations on the web.',
    },
    cardAlignX: 'right',
    cardAlignY: 'bottom',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.42)',
  },
  {
    id: 'eventuallymaking',
    href: 'https://eventuallymaking.io/',
    left: '23%',
    top: '33%',
    faviconSrc: eventuallymakingFavicon,
    label: { zh: 'Eventuallymaking', en: 'Eventuallymaking' },
    eyebrow: {
      zh: '软件工程 / 创业笔记',
      en: 'Software engineering / Startups',
    },
    description: {
      zh: '一位拥有二十多年经验的软件工程师，持续分享技术、产品和创业实践。',
      en: 'A veteran software engineer sharing notes on technology, product building, and startups.',
    },
    cardAlignX: 'left',
    cardAlignY: 'bottom',
    color: '#7c9cff',
    glow: 'rgba(124,156,255,0.4)',
  },
  {
    id: 'messenger',
    href: 'https://messenger.abeto.co/',
    left: '17%',
    top: '66%',
    faviconSrc: messengerFavicon,
    label: { zh: 'Messenger', en: 'Messenger' },
    eyebrow: {
      zh: '独立网页游戏',
      en: 'Indie web game',
    },
    description: {
      zh: '“星球虽小，总得有人送货。”一款气质很强的太空投递小游戏。',
      en: '"It\'s a small planet, but someone\'s gotta make the deliveries." A tiny space-delivery web game with attitude.',
    },
    cardAlignX: 'left',
    cardAlignY: 'top',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.38)',
  },
  {
    id: 'radiogarden',
    href: 'https://radio.garden/visit/washington-dc/DIlWBUQt',
    left: '34%',
    top: '78%',
    faviconSrc: radiogardenFavicon,
    label: { zh: 'Radio Garden', en: 'Radio Garden' },
    eyebrow: {
      zh: 'Washington DC / Live radio',
      en: 'Washington DC / Live radio',
    },
    description: {
      zh: '直接落到 Washington DC 的收听页，像在地球仪上旋钮式漫游全球电台。',
      en: 'Drops straight into the Washington DC listening view, a globe-like way to wander through live radio stations.',
    },
    cardAlignX: 'center',
    cardAlignY: 'top',
    color: '#14b8a6',
    glow: 'rgba(20,184,166,0.38)',
  },
  {
    id: 'joshwcomeau',
    href: 'https://www.joshwcomeau.com/',
    left: '50%',
    top: '12%',
    faviconSrc: joshwcomeauFavicon,
    label: { zh: 'Josh W. Comeau', en: 'Josh W. Comeau' },
    eyebrow: {
      zh: 'React / CSS / Animation',
      en: 'React / CSS / Animation',
    },
    description: {
      zh: '面向开发者的友好教程站点，内容聚焦 React、CSS、动画与前端体验。',
      en: 'Friendly tutorials for developers, focused on React, CSS, animation, and front-end craft.',
    },
    cardAlignX: 'center',
    cardAlignY: 'bottom',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.36)',
  },
  {
    id: 'pathos',
    href: 'https://pathos.page/',
    left: '67%',
    top: '74%',
    faviconSrc: pathosFavicon,
    label: { zh: 'Pathos.page', en: 'Pathos.page' },
    eyebrow: {
      zh: '2750 words / 法哲学',
      en: '2750 words / Legal philosophy',
    },
    description: {
      zh: '一个法哲学研究者的博客，记录学术写作、问题意识与社会观察。',
      en: 'A blog by a legal philosophy researcher, documenting scholarship, writing, and social observation.',
    },
    cardAlignX: 'right',
    cardAlignY: 'top',
    color: '#fb7185',
    glow: 'rgba(251,113,133,0.36)',
  },
  {
    id: 'tongliao',
    href: 'https://www.tongliaouniverse.cn/',
    left: '85%',
    top: '57%',
    faviconSrc: tongliaoFavicon,
    label: { zh: '通辽宇宙知识库', en: 'Tongliao Universe' },
    eyebrow: {
      zh: '小国梗 / 历史狠人',
      en: 'Microstates / History lore',
    },
    description: {
      zh: '围绕奇葩小国、硬核历史人物与通辽宇宙梗文化展开的互动知识站。',
      en: 'An interactive knowledge base about eccentric microstates, hard-core historical figures, and Tongliao Universe lore.',
    },
    cardAlignX: 'right',
    cardAlignY: 'top',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.36)',
  },
]

const RING_INSETS = ['8%', '18%', '30%', '42%', '54%']
const RADAR_CENTER_Y = '50%'
const RADAR_VIRTUAL_SCROLL_FACTOR = 0.96
const RADAR_VIRTUAL_SCROLL_MIN = 760
const RADAR_VIRTUAL_SCROLL_MAX = 1040
const RADAR_LOCK_TOLERANCE_PX = 36
const RADAR_RELEASE_NUDGE_PX = 28

const AVATAR_SETTLE_END = 0.1
const HORIZONTAL_LINE_START = 0.12
const HORIZONTAL_LINE_END = 0.25
const AMBIENCE_START = 0.16
const AMBIENCE_END = 0.34
const RINGS_START = 0.26
const RING_STAGGER = 0.065
const RING_DURATION = 0.11
const VERTICAL_LINE_START = 0.54
const VERTICAL_LINE_END = 0.66
const AUTO_EXPLORATION_TRIGGER_PROGRESS = 0.72
const AUTO_EXPLORATION_START_DELAY_MS = 180
const AUTO_EXPLORATION_DURATION_MS = 7200
const AUTO_EXPLORATION_SCROLL_ACCELERATION_MS_PER_PX = 4.5
const AUTO_EXPLORATION_MAX_SCROLL_ACCELERATION_MS = 4200
const BEAM_CONTINUOUS_ROTATION_DURATION_MS = 7200
const FULL_ROTATION_DEGREES = 360
const BEAM_HEAD_OFFSET = -16
const BEAM_FOCUS_OFFSET = -20
const NODE_REVEAL_ANGLE_WINDOW = 18
const NODE_PULSE_ANGLE_WINDOW = 24
const SIGNAL_CARD_EASE = [0.22, 1, 0.36, 1] as const
const SIGNAL_DOT_SIZE_PX = 44
const SIGNAL_CARD_SIZE_PX = 212

const signalShellVariants = {
  rest: ({ restShadow }: { restShadow: string }) => ({
    width: SIGNAL_DOT_SIZE_PX,
    height: SIGNAL_DOT_SIZE_PX,
    x: 0,
    y: 0,
    borderRadius: 999,
    boxShadow: restShadow,
    transition: { duration: 0.24, ease: SIGNAL_CARD_EASE },
  }),
  hover: ({
    hoverShadow,
    shiftX,
    shiftY,
  }: {
    hoverShadow: string
    shiftX: number
    shiftY: number
  }) => ({
    width: SIGNAL_CARD_SIZE_PX,
    height: SIGNAL_CARD_SIZE_PX,
    x: shiftX,
    y: shiftY,
    borderRadius: 32,
    boxShadow: hoverShadow,
    transition: { duration: 0.28, ease: SIGNAL_CARD_EASE },
  }),
}

const signalIconFrameVariants = {
  rest: {
    top: 0,
    left: 0,
    width: SIGNAL_DOT_SIZE_PX,
    height: SIGNAL_DOT_SIZE_PX,
    borderRadius: 999,
    transition: { duration: 0.24, ease: SIGNAL_CARD_EASE },
  },
  hover: {
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 18,
    transition: { duration: 0.26, ease: SIGNAL_CARD_EASE },
  },
}

const signalCopyVariants = {
  rest: {
    opacity: 0,
    y: 10,
    filter: 'blur(8px)',
    transition: { duration: 0.16, ease: SIGNAL_CARD_EASE },
  },
  hover: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      delay: 0.08,
      duration: 0.22,
      ease: SIGNAL_CARD_EASE,
    },
  },
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function segmentProgress(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0
  return clamp01((value - start) / (end - start))
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function easeOutBack(value: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

function normalizeAngle(angle: number) {
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

function getBeamRevealProgress(
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

function getTrailingBeamImpact(
  beamAngle: number,
  nodeAngle: number,
  pulseWindow: number
) {
  const delta = getClockwiseAngleDelta(nodeAngle, beamAngle)
  if (delta > pulseWindow) return 0
  return 1 - delta / pulseWindow
}

function getSignalShellShift(node: RadarNode) {
  const halfDelta = (SIGNAL_CARD_SIZE_PX - SIGNAL_DOT_SIZE_PX) / 2
  const shiftX =
    node.cardAlignX === 'left' ? halfDelta : node.cardAlignX === 'right' ? -halfDelta : 0
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

function parsePercent(value: string) {
  return Number.parseFloat(value)
}

function getRadarNodeAngle(node: RadarNode) {
  const x = parsePercent(node.left) - 50
  const y = parsePercent(node.top) - 50
  return ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360
}

export function HomeRadarSection({ avatarSrc }: HomeRadarSectionProps) {
  const { i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const reduceMotion = Boolean(prefersReducedMotion)
  const lenis = useLenis()
  const isZh = i18n.language?.startsWith('zh')
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
  const [viewportHeight, setViewportHeight] = useState(0)
  const [sceneProgress, setSceneProgress] = useState(reduceMotion ? 1 : 0)
  const [autoExplorationProgress, setAutoExplorationProgress] = useState(
    reduceMotion ? 1 : 0
  )
  const [beamLoopAngle, setBeamLoopAngle] = useState(0)

  useEffect(() => {
    sceneProgressRef.current = sceneProgress
  }, [sceneProgress])

  useEffect(() => {
    autoExplorationProgressRef.current = autoExplorationProgress
  }, [autoExplorationProgress])

  useEffect(() => {
    const updateViewportHeight = () => {
      const nextHeight = window.innerHeight
      setViewportHeight((current) =>
        current === nextHeight ? current : nextHeight
      )
    }

    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
    }
  }, [])

  const virtualScrollDistance = getBoundedScrollDistance(
    viewportHeight,
    RADAR_VIRTUAL_SCROLL_FACTOR,
    RADAR_VIRTUAL_SCROLL_MIN,
    RADAR_VIRTUAL_SCROLL_MAX
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

  const applyAutoExplorationBoost = useCallback((deltaY: number) => {
    if (deltaY <= 0) return
    if (!isAutoExploringRef.current) return

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
  }, [runAutoExplorationLoop])

  const startAutoExploration = useCallback(() => {
    if (reduceMotion) return
    if (isAutoExploringRef.current || isAutoExplorationCompleteRef.current) return

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
        lenis.scrollTo(
          sectionTop + direction * RADAR_RELEASE_NUDGE_PX,
          { immediate: true, force: true }
        )
        unlockDirectionRef.current = 0
      })
    },
    [lenis]
  )

  const applyVirtualScrollDelta = useCallback(
    (deltaY: number) => {
      if (reduceMotion) return
      if (!isLockedRef.current) return

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

      if (
        deltaY > 0 &&
        next >= AUTO_EXPLORATION_TRIGGER_PROGRESS - 0.0005
      ) {
        startAutoExploration()
      } else if (deltaY < 0 && next <= 0.001) {
        releaseScene(-1)
      }
    },
    [
      reduceMotion,
      releaseScene,
      startAutoExploration,
      applyAutoExplorationBoost,
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

  useEffect(() => {
    if (reduceMotion) return

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
  }, [applyVirtualScrollDelta, reduceMotion])

  useEffect(() => {
    return () => {
      clearAutoExplorationTimers()
      clearBeamLoopFrame()
      if (isLockedRef.current) {
        isLockedRef.current = false
        lenis?.start()
      }
    }
  }, [clearAutoExplorationTimers, clearBeamLoopFrame, lenis])

  useLenis(
    (instance) => {
      if (reduceMotion) return
      if (unlockDirectionRef.current !== 0) return
      if (isLockedRef.current) return
      if (isAutoExplorationCompleteRef.current) return

      const sectionNode = sectionRef.current
      if (!sectionNode) return

      const rect = sectionNode.getBoundingClientRect()
      const nearTop =
        rect.top <= RADAR_LOCK_TOLERANCE_PX &&
        rect.top >= -RADAR_LOCK_TOLERANCE_PX

      if (!nearTop) return

      if (
        instance.direction > 0 &&
        sceneProgressRef.current < AUTO_EXPLORATION_TRIGGER_PROGRESS
      ) {
        lockScene()
      } else if (instance.direction < 0 && sceneProgressRef.current > 0.001) {
        lockScene()
      }
    },
    [lockScene, reduceMotion],
    0
  )

  const progress = reduceMotion ? 1 : sceneProgress

  const avatarSettle = easeOutCubic(
    segmentProgress(progress, 0, AVATAR_SETTLE_END)
  )
  const avatarScale = mix(0.9, 1, avatarSettle)
  const avatarGlowOpacity = mix(0.28, 1, avatarSettle)

  const horizontalLineReveal = easeOutCubic(
    segmentProgress(progress, HORIZONTAL_LINE_START, HORIZONTAL_LINE_END)
  )
  const ambienceReveal = easeOutCubic(
    segmentProgress(progress, AMBIENCE_START, AMBIENCE_END)
  )
  const verticalLineReveal = easeOutCubic(
    segmentProgress(progress, VERTICAL_LINE_START, VERTICAL_LINE_END)
  )

  const explorationProgress = reduceMotion ? 1 : autoExplorationProgress
  const sweepBeamAngle = explorationProgress * FULL_ROTATION_DEGREES
  const beamLoopActive = !reduceMotion && explorationProgress >= 1
  const beamAngle = beamLoopActive ? beamLoopAngle : sweepBeamAngle
  const beamOpacity = easeOutCubic(segmentProgress(explorationProgress, 0, 0.08))
  const beamRotate = beamAngle + BEAM_HEAD_OFFSET
  const beamFocusAngle = normalizeAngle(beamAngle + BEAM_FOCUS_OFFSET)
  const beamSweepStartAngle = normalizeAngle(BEAM_FOCUS_OFFSET)
  const beamFocusSweepAngle = beamSweepStartAngle + sweepBeamAngle

  useEffect(() => {
    if (reduceMotion || !beamLoopActive) {
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
  }, [beamLoopActive, clearBeamLoopFrame, reduceMotion])

  return (
    <section
      ref={sectionRef}
      aria-label={isZh ? '主页雷达区' : 'Homepage radar'}
      className="relative isolate z-[30] h-[100svh] overflow-hidden"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <div
        aria-hidden="true"
        className={styles.softGlowLeft}
        style={{ opacity: ambienceReveal * 0.9 }}
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
      <motion.div
        aria-hidden="true"
        className={styles.crosshairVertical}
        style={{
          opacity: verticalLineReveal * 0.9,
          scaleY: Math.max(0.001, verticalLineReveal),
        }}
      />
      <motion.div
        aria-hidden="true"
        className={styles.crosshairHorizontal}
        style={{
          top: RADAR_CENTER_Y,
          opacity: horizontalLineReveal,
          scaleX: Math.max(0.001, horizontalLineReveal),
        }}
      />

      <motion.div
        aria-hidden="true"
        className={styles.radarSweepClip}
        style={{ opacity: beamOpacity }}
      >
        <div className={styles.radarSweepStage}>
          <motion.div
            className={styles.scanBeam}
            style={{
              top: RADAR_CENTER_Y,
              rotate: beamRotate,
              background:
                'conic-gradient(from 0deg, rgba(6,182,212,0) 0deg, rgba(6,182,212,0) 324deg, rgba(6,182,212,0.05) 338deg, rgba(6,182,212,0.12) 348deg, rgba(6,182,212,0.34) 356deg, rgba(6,182,212,0.08) 360deg)',
            }}
          />
        </div>
      </motion.div>

      <div className="relative z-10 h-full w-full">
        <div className={styles.radarStage}>
          <div style={{ top: RADAR_CENTER_Y }} className={styles.radarField}>
            {RING_INSETS.map((inset, index) => {
              const ringRaw = segmentProgress(
                progress,
                RINGS_START + index * RING_STAGGER,
                RINGS_START + index * RING_STAGGER + RING_DURATION
              )
              const ringOpacity = easeOutCubic(ringRaw)
              const ringScale = mix(0.34, 1, easeOutBack(ringRaw))

              return (
                <motion.div
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

            <motion.div className={styles.avatarWrap} style={{ scale: avatarScale }}>
              <div
                aria-hidden="true"
                className={styles.avatarGlow}
                style={{ opacity: avatarGlowOpacity }}
              />
              <div className={styles.avatarCore}>
                <img
                  src={avatarSrc}
                  alt={isZh ? 'Mark 的头像' : 'Portrait of Mark'}
                  className={styles.avatarImage}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </motion.div>

            {RADAR_NODES.map((node) => {
              const nodeAngle = getRadarNodeAngle(node)
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
              const nodeImpact =
                explorationProgress <= 0
                  ? 0
                  : getTrailingBeamImpact(
                      beamFocusAngle,
                      nodeAngle,
                      NODE_PULSE_ANGLE_WINDOW
                    )
              const signalPulseScale = mix(0.72, 2.08, nodeImpact)
              const signalPulseOpacity = nodeImpact * 0.56 * nodeOpacity
              const restShellShadow = `0 0 0 1px rgba(255,255,255,0.44), 0 18px 34px -22px rgba(15,23,42,0.82), 0 0 ${mix(10, 22, nodeImpact)}px ${node.glow}`
              const hoverShellShadow = `0 34px 92px -48px rgba(15,23,42,0.82), 0 0 ${mix(18, 38, nodeImpact)}px ${node.glow}`
              const { shiftX, shiftY } = getSignalShellShift(node)

              return (
                <motion.a
                  key={node.id}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  whileFocus="hover"
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={nodeLabel}
                  title={nodeLabel}
                  whileTap={
                    nodeOpacity < 0.98
                      ? undefined
                      : { scale: 0.97, transition: { duration: 0.16 } }
                  }
                  className={styles.signalLink}
                  style={{
                    left: node.left,
                    top: node.top,
                    opacity: nodeOpacity,
                    scale: nodeScale,
                    pointerEvents: nodeOpacity < 0.98 ? 'none' : 'auto',
                  }}
                >
                  <motion.span
                    aria-hidden="true"
                    className={styles.signalPulse}
                    style={{
                      background: node.glow,
                      opacity: signalPulseOpacity,
                      scale: signalPulseScale,
                    }}
                  />

                  <motion.span
                    aria-hidden="true"
                    className={styles.signalShell}
                    custom={{
                      restShadow: restShellShadow,
                      hoverShadow: hoverShellShadow,
                      shiftX,
                      shiftY,
                    }}
                    variants={signalShellVariants}
                    style={{
                      opacity: nodeOpacity,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={styles.signalShellTint}
                      style={{
                        background: `radial-gradient(circle at 28% 24%, rgba(255,255,255,0.92) 0%, ${node.glow} 54%, rgba(255,255,255,0) 100%)`,
                      }}
                    />
                    <motion.span
                      aria-hidden="true"
                      className={styles.signalIconFrame}
                      variants={signalIconFrameVariants}
                    >
                      <span
                        aria-hidden="true"
                        className={styles.signalIconFrameTint}
                        style={{
                          background: `radial-gradient(circle at 20% 18%, ${node.glow} 0%, rgba(255,255,255,0) 72%)`,
                        }}
                      />
                      <span className={styles.signalIconFrameInner}>
                        <img
                          src={node.faviconSrc}
                          alt=""
                          className={styles.signalIconImage}
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                    </motion.span>

                    <motion.span
                      aria-hidden="true"
                      className={styles.signalCopy}
                      variants={signalCopyVariants}
                    >
                      <span className={styles.signalCopyHeader}>
                        <span className={styles.signalCopySpacer} />
                        <span className={styles.signalCopyTitleBlock}>
                          <span className={styles.signalCardEyebrow}>
                            {nodeEyebrow}
                          </span>
                          <span className={styles.signalCardTitle}>
                            {nodeLabel}
                          </span>
                        </span>
                      </span>
                      <span className={styles.signalCardDescription}>
                        {nodeDescription}
                      </span>
                    </motion.span>
                  </motion.span>
                </motion.a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  softGlowLeft:
    'pointer-events-none absolute left-[-12rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.16)_0%,rgba(6,182,212,0.05)_34%,rgba(6,182,212,0)_74%)] blur-3xl',
  softGlowRight:
    'pointer-events-none absolute bottom-[3rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,rgba(249,115,22,0.04)_34%,rgba(249,115,22,0)_74%)] blur-3xl',
  gridBackdrop:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.07)_0px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_0px,transparent_1px)] [background-size:24px_24px]',
  crosshairVertical:
    'pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 origin-center bg-[linear-gradient(180deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.22)_18%,rgba(148,163,184,0.22)_82%,rgba(148,163,184,0)_100%)]',
  crosshairHorizontal:
    'pointer-events-none absolute left-0 h-px w-full -translate-y-1/2 origin-center bg-[linear-gradient(90deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.26)_18%,rgba(148,163,184,0.26)_82%,rgba(148,163,184,0)_100%)]',
  radarStage: 'absolute inset-0',
  radarSweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
  radarSweepStage: 'pointer-events-none absolute inset-0',
  radarField:
    'absolute left-1/2 h-[min(94vw,94vh)] w-[min(94vw,94vh)] max-h-[72rem] max-w-[72rem] -translate-x-1/2 -translate-y-1/2',
  ring: 'pointer-events-none absolute rounded-full border border-slate-300/62',
  outerRing:
    'border-dashed border-slate-300/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.58)]',
  scanBeam:
    'pointer-events-none absolute left-1/2 top-1/2 h-[170vmax] w-[170vmax] -translate-x-1/2 -translate-y-1/2',
  avatarWrap:
    'absolute left-1/2 top-1/2 z-20 flex h-[20%] w-[20%] min-h-[6.5rem] min-w-[6.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-transparent backdrop-blur-2xl',
  avatarGlow:
    'pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0.06)_34%,rgba(56,189,248,0)_72%)] blur-2xl',
  avatarCore:
    'relative h-[72%] w-[72%] overflow-hidden rounded-full border border-white/60 bg-transparent shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)]',
  avatarImage: 'h-full w-full object-cover',
  signalLink:
    'absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center focus-visible:z-50 focus:outline-none',
  signalPulse: 'absolute h-14 w-14 rounded-full blur-[14px]',
  signalShell:
    'relative z-10 block overflow-hidden border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.9)_100%)] text-left text-slate-900 backdrop-blur-xl will-change-transform',
  signalShellTint:
    'pointer-events-none absolute inset-0 rounded-[inherit] opacity-90 mix-blend-screen',
  signalIconFrame:
    'absolute overflow-hidden border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.94)_100%)] shadow-[0_18px_32px_-22px_rgba(15,23,42,0.82)]',
  signalIconFrameTint:
    'pointer-events-none absolute inset-0 rounded-[inherit] opacity-90',
  signalIconFrameInner:
    'relative z-10 flex h-full w-full items-center justify-center',
  signalIconImage: 'h-[58%] w-[58%] object-contain',
  signalCopy:
    'absolute inset-0 flex flex-col justify-between p-4 pointer-events-none',
  signalCopyHeader: 'flex items-start gap-3',
  signalCopySpacer: 'h-11 w-11 shrink-0',
  signalCopyTitleBlock: 'flex min-w-0 flex-1 flex-col gap-1 pt-0.5',
  signalCardEyebrow:
    'text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500',
  signalCardTitle:
    'text-[1rem] font-semibold leading-5 text-slate-900',
  signalCardDescription:
    'relative z-10 text-[0.86rem] leading-6 text-slate-700',
}
