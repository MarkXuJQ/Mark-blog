import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { cn } from '../../utils/cn'

const MOTION_PATH_POINTS = [0, 0.16, 0.2, 0.58, 0.68, 0.86, 0.93, 1]
const AVATAR_KEYFRAME_IDS = ['hero', 'blog', 'travel', 'radar'] as const
const BLOG_SPIN_START = 0.22
const BLOG_SPIN_END = 0.54
const BLOG_SPIN_RESET_AT = 0.58

type AvatarKeyframeId = (typeof AVATAR_KEYFRAME_IDS)[number]

interface AvatarKeyframeTiming {
  enterStart: number
  holdStart: number
  holdEnd: number
  exitEnd: number
}

interface AvatarKeyframeMeasurement {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  shellRadiusRatio: number
  coreScaleX: number
  coreScaleY: number
  coreRadiusRatio: number
  borderWidth: number
  shellBackground: string
  shellBorderColor: string
  shellShadow: string
  shellBackdropFilter: string
  coreBackground: string
  imageScale: number
}

interface AvatarKeyframeElements {
  shell: HTMLElement | null
  core: HTMLElement | null
  rotate: HTMLElement | null
  image: HTMLElement | null
}

type AvatarKeyframeMeasurements = Record<
  AvatarKeyframeId,
  AvatarKeyframeMeasurement
>

type AvatarKeyframeElementMap = Record<
  AvatarKeyframeId,
  AvatarKeyframeElements
>

const KEYFRAME_TIMINGS: Record<AvatarKeyframeId, AvatarKeyframeTiming> = {
  hero: { enterStart: 0.12, holdStart: 0.16, holdEnd: 0.16, exitEnd: 0.2 },
  blog: { enterStart: 0.16, holdStart: 0.2, holdEnd: 0.58, exitEnd: 0.68 },
  travel: { enterStart: 0.58, holdStart: 0.68, holdEnd: 0.86, exitEnd: 0.93 },
  radar: { enterStart: 0.86, holdStart: 0.93, holdEnd: 1, exitEnd: 1 },
}

const MOTION_WINDOWS = [
  { start: 0.16, end: 0.2 },
  { start: 0.58, end: 0.68 },
  { start: 0.86, end: 0.93 },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function interpolateKeyframes(
  value: number,
  input: readonly number[],
  output: readonly number[]
) {
  if (input.length !== output.length) {
    throw new Error('Input and output keyframes must have the same length.')
  }

  if (value <= input[0]) return output[0]
  if (value >= input[input.length - 1]) return output[output.length - 1]

  for (let index = 0; index < input.length - 1; index += 1) {
    const start = input[index]
    const end = input[index + 1]

    if (value >= start && value <= end) {
      const progress = (value - start) / (end - start)
      return output[index] + (output[index + 1] - output[index]) * progress
    }
  }

  return output[output.length - 1]
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function parseCssNumber(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeCssValue(value: string, fallback: string) {
  return value && value !== 'none' ? value : fallback
}

function extractRotationFromTransform(transform: string) {
  if (!transform || transform === 'none') return 0

  const matrixMatch = transform.match(/^matrix\((.+)\)$/)
  if (matrixMatch) {
    const [a, b] = matrixMatch[1]
      .split(',')
      .slice(0, 2)
      .map((item) => Number.parseFloat(item.trim()))

    if (Number.isFinite(a) && Number.isFinite(b)) {
      return (Math.atan2(b, a) * 180) / Math.PI
    }
  }

  const matrix3dMatch = transform.match(/^matrix3d\((.+)\)$/)
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(',').map((item) =>
      Number.parseFloat(item.trim())
    )
    const a = values[0]
    const b = values[1]

    if (Number.isFinite(a) && Number.isFinite(b)) {
      return (Math.atan2(b, a) * 180) / Math.PI
    }
  }

  return 0
}

function extractScaleFromTransform(transform: string) {
  if (!transform || transform === 'none') return 1

  const matrixMatch = transform.match(/^matrix\((.+)\)$/)
  if (matrixMatch) {
    const [a, b] = matrixMatch[1]
      .split(',')
      .slice(0, 2)
      .map((item) => Number.parseFloat(item.trim()))

    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Math.sqrt(a * a + b * b)
    }
  }

  const matrix3dMatch = transform.match(/^matrix3d\((.+)\)$/)
  if (matrix3dMatch) {
    const values = matrix3dMatch[1].split(',').map((item) =>
      Number.parseFloat(item.trim())
    )
    const a = values[0]
    const b = values[1]

    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Math.sqrt(a * a + b * b)
    }
  }

  return 1
}

function getCurrentVisualKeyframeId(progress: number) {
  if (progress < 0.18) return 'hero'
  if (progress < 0.63) return 'blog'
  if (progress < 0.895) return 'travel'
  return 'radar'
}

function getBlogSpinDegrees(progress: number) {
  if (progress <= BLOG_SPIN_START) return 0

  if (progress < BLOG_SPIN_END) {
    const spinProgress = clamp(
      (progress - BLOG_SPIN_START) / Math.max(0.0001, BLOG_SPIN_END - BLOG_SPIN_START),
      0,
      1
    )

    return easeInOutCubic(spinProgress) * 360
  }

  if (progress < BLOG_SPIN_RESET_AT) {
    return 360
  }

  return 0
}

function getTakeoverStrength(progress: number, keyframeId: AvatarKeyframeId) {
  const timing = KEYFRAME_TIMINGS[keyframeId]

  if (progress < timing.enterStart || progress > timing.exitEnd) return 0

  if (progress < timing.holdStart) {
    const enterProgress = clamp(
      (progress - timing.enterStart) / Math.max(0.0001, timing.holdStart - timing.enterStart),
      0,
      1
    )
    return easeInOutCubic(enterProgress)
  }

  if (progress <= timing.holdEnd) {
    return 1
  }

  const exitProgress = clamp(
    (progress - timing.holdEnd) / Math.max(0.0001, timing.exitEnd - timing.holdEnd),
    0,
    1
  )

  return 1 - easeInOutCubic(exitProgress)
}

function getMaxTakeoverStrength(progress: number) {
  return AVATAR_KEYFRAME_IDS.reduce((maxStrength, keyframeId) => {
    return Math.max(maxStrength, getTakeoverStrength(progress, keyframeId))
  }, 0)
}

function getMovementStrength(progress: number) {
  for (const window of MOTION_WINDOWS) {
    if (progress < window.start || progress > window.end) continue

    const segmentProgress = clamp(
      (progress - window.start) / Math.max(0.0001, window.end - window.start),
      0,
      1
    )

    return Math.sin(segmentProgress * Math.PI)
  }

  return 0
}

function getFallbackMeasurements(
  width: number,
  height: number,
  isCompact: boolean
): AvatarKeyframeMeasurements {
  return {
    hero: {
      x: isCompact ? width * 0.1 : width * 0.22,
      y: isCompact ? height * 0.12 : height * 0.02,
      width: isCompact ? 240 : 300,
      height: isCompact ? 240 : 300,
      rotation: 0,
      shellRadiusRatio: 0.38,
      coreScaleX: 0.78,
      coreScaleY: 0.78,
      coreRadiusRatio: 0.34,
      borderWidth: 1,
      shellBackground: 'rgba(255,255,255,0.1)',
      shellBorderColor: 'rgba(255,255,255,0.4)',
      shellShadow: '0 30px 68px -34px rgba(15,23,42,0.82)',
      shellBackdropFilter: 'blur(20px)',
      coreBackground: 'rgba(15,23,42,0.12)',
      imageScale: 1.08,
    },
    blog: {
      x: isCompact ? width * 0.24 : width * 0.3,
      y: isCompact ? -height * 0.12 : -height * 0.24,
      width: isCompact ? 40 : 44,
      height: isCompact ? 40 : 44,
      rotation: 0,
      shellRadiusRatio: 0.5,
      coreScaleX: 1,
      coreScaleY: 1,
      coreRadiusRatio: 0.5,
      borderWidth: 1,
      shellBackground: 'rgba(255,255,255,0)',
      shellBorderColor: 'rgba(148,163,184,0.24)',
      shellShadow: '0 10px 28px -18px rgba(15,23,42,0.5)',
      shellBackdropFilter: 'none',
      coreBackground: 'rgba(255,255,255,0)',
      imageScale: 1,
    },
    travel: {
      x: isCompact ? -width * 0.18 : -width * 0.22,
      y: isCompact ? height * 0.18 : height * 0.16,
      width: isCompact ? 88 : 116,
      height: isCompact ? 88 : 116,
      rotation: 0,
      shellRadiusRatio: 0.2,
      coreScaleX: 0.84,
      coreScaleY: 0.84,
      coreRadiusRatio: 0.18,
      borderWidth: 1,
      shellBackground: 'rgba(2,6,23,0.56)',
      shellBorderColor: 'rgba(255,255,255,0.12)',
      shellShadow: '0 22px 48px -30px rgba(0,0,0,0.74)',
      shellBackdropFilter: 'blur(4px)',
      coreBackground: 'rgb(13,19,25)',
      imageScale: 1.04,
    },
    radar: {
      x: 0,
      y: 0,
      width: isCompact ? 68 : 88,
      height: isCompact ? 68 : 88,
      rotation: 0,
      shellRadiusRatio: 0.5,
      coreScaleX: 0.72,
      coreScaleY: 0.72,
      coreRadiusRatio: 0.5,
      borderWidth: 1,
      shellBackground: 'rgba(255,255,255,0)',
      shellBorderColor: 'rgba(255,255,255,0.4)',
      shellShadow: '0 14px 28px -22px rgba(15,23,42,0.24)',
      shellBackdropFilter: 'blur(24px)',
      coreBackground: 'rgba(255,255,255,0)',
      imageScale: 1,
    },
  }
}

function createEmptyElementMap(): AvatarKeyframeElementMap {
  return {
    hero: { shell: null, core: null, rotate: null, image: null },
    blog: { shell: null, core: null, rotate: null, image: null },
    travel: { shell: null, core: null, rotate: null, image: null },
    radar: { shell: null, core: null, rotate: null, image: null },
  }
}

function resetShellVisibility(elementMap: AvatarKeyframeElementMap) {
  for (const keyframeId of AVATAR_KEYFRAME_IDS) {
    const shell = elementMap[keyframeId].shell
    if (shell) {
      shell.style.opacity = ''
    }
  }
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 820 : window.innerHeight,
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const update = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return size
}

export function HomeMeteorAvatar({
  avatarSrc,
  pageProgress,
  isDarkMode,
  prefersReducedMotion,
}: {
  avatarSrc: string
  pageProgress: MotionValue<number>
  isDarkMode: boolean
  prefersReducedMotion: boolean
}) {
  const { width, height } = useViewportSize()
  const isCompact = width < 768
  const frameTicker = useMotionValue(0)
  const keyframeElementsRef = useRef(createEmptyElementMap())
  const keyframeMeasurementsRef = useRef<AvatarKeyframeMeasurements>(
    getFallbackMeasurements(width, height, isCompact)
  )

  useEffect(() => {
    keyframeMeasurementsRef.current = getFallbackMeasurements(
      width,
      height,
      isCompact
    )
    resetShellVisibility(keyframeElementsRef.current)
    keyframeElementsRef.current = createEmptyElementMap()
  }, [height, isCompact, width])

  useEffect(() => {
    if (!prefersReducedMotion) return
    resetShellVisibility(keyframeElementsRef.current)
  }, [prefersReducedMotion])

  useEffect(() => {
    return () => {
      resetShellVisibility(keyframeElementsRef.current)
    }
  }, [])

  useAnimationFrame((timestamp) => {
    frameTicker.set(timestamp)

    if (prefersReducedMotion || typeof document === 'undefined') {
      resetShellVisibility(keyframeElementsRef.current)
      return
    }

    const fallbackMeasurements = getFallbackMeasurements(width, height, isCompact)
    const viewportCenterX = width / 2
    const viewportCenterY = height / 2
    const progress = pageProgress.get()
    const nextMeasurements = { ...fallbackMeasurements }

    for (const keyframeId of AVATAR_KEYFRAME_IDS) {
      let elementSet = keyframeElementsRef.current[keyframeId]

      if (
        !elementSet.shell ||
        !elementSet.shell.isConnected ||
        (keyframeId !== 'blog' && elementSet.core == null) ||
        (elementSet.core != null && !elementSet.core.isConnected) ||
        (keyframeId === 'travel' && elementSet.rotate == null) ||
        (elementSet.rotate != null && !elementSet.rotate.isConnected) ||
        elementSet.image == null ||
        (elementSet.image != null && !elementSet.image.isConnected)
      ) {
        elementSet = {
          shell: document.querySelector(
            `[data-home-avatar-keyframe="${keyframeId}"]`
          ) as HTMLElement | null,
          core: document.querySelector(
            `[data-home-avatar-keyframe-core="${keyframeId}"]`
          ) as HTMLElement | null,
          rotate: document.querySelector(
            `[data-home-avatar-keyframe-rotate="${keyframeId}"]`
          ) as HTMLElement | null,
          image: document.querySelector(
            `[data-home-avatar-keyframe-image="${keyframeId}"]`
          ) as HTMLElement | null,
        }
        keyframeElementsRef.current[keyframeId] = elementSet
      }

      const shell = elementSet.shell

      if (!shell) continue

      const shellRect = shell.getBoundingClientRect()
      const shellWidth = shell.offsetWidth || shellRect.width
      const shellHeight = shell.offsetHeight || shellRect.height

      if (shellWidth <= 0 || shellHeight <= 0) continue

      const shellStyle = window.getComputedStyle(shell)
      const rotateSource = elementSet.rotate ?? shell
      const rotateStyle = window.getComputedStyle(rotateSource)
      const core = elementSet.core ?? shell
      const coreRect = core.getBoundingClientRect()
      const coreWidth = core.offsetWidth || coreRect.width || shellWidth
      const coreHeight = core.offsetHeight || coreRect.height || shellHeight
      const coreStyle = window.getComputedStyle(core)
      const image = elementSet.image
      const imageScale = image
        ? extractScaleFromTransform(window.getComputedStyle(image).transform)
        : 1

      nextMeasurements[keyframeId] = {
        x: shellRect.left + shellRect.width / 2 - viewportCenterX,
        y: shellRect.top + shellRect.height / 2 - viewportCenterY,
        width: shellWidth,
        height: shellHeight,
        rotation: extractRotationFromTransform(rotateStyle.transform),
        shellRadiusRatio: clamp(
          parseCssNumber(
            shellStyle.borderTopLeftRadius,
            Math.min(shellWidth, shellHeight) / 2
          ) / Math.min(shellWidth, shellHeight),
          0,
          0.5
        ),
        coreScaleX: clamp(coreWidth / shellWidth, 0.36, 1),
        coreScaleY: clamp(coreHeight / shellHeight, 0.36, 1),
        coreRadiusRatio: clamp(
          parseCssNumber(
            coreStyle.borderTopLeftRadius,
            Math.min(coreWidth, coreHeight) / 2
          ) / Math.min(coreWidth, coreHeight),
          0,
          0.5
        ),
        borderWidth: parseCssNumber(shellStyle.borderTopWidth, 0),
        shellBackground: normalizeCssValue(
          shellStyle.backgroundColor,
          fallbackMeasurements[keyframeId].shellBackground
        ),
        shellBorderColor: normalizeCssValue(
          shellStyle.borderTopColor,
          fallbackMeasurements[keyframeId].shellBorderColor
        ),
        shellShadow: normalizeCssValue(
          shellStyle.boxShadow,
          fallbackMeasurements[keyframeId].shellShadow
        ),
        shellBackdropFilter: normalizeCssValue(
          shellStyle.backdropFilter,
          fallbackMeasurements[keyframeId].shellBackdropFilter
        ),
        coreBackground: normalizeCssValue(
          coreStyle.backgroundColor,
          fallbackMeasurements[keyframeId].coreBackground
        ),
        imageScale,
      }

      const takeoverStrength = getTakeoverStrength(progress, keyframeId)
      shell.style.opacity = String(clamp(1 - takeoverStrength, 0, 1))
    }

    keyframeMeasurementsRef.current = nextMeasurements
  })

  const shellXRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.x,
      hero.x,
      blog.x,
      blog.x,
      travel.x,
      travel.x,
      radar.x,
      radar.x,
    ])
  })

  const shellYRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.y,
      hero.y,
      blog.y,
      blog.y,
      travel.y,
      travel.y,
      radar.y,
      radar.y,
    ])
  })

  const shellWidthRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.width,
      hero.width,
      blog.width,
      blog.width,
      travel.width,
      travel.width,
      radar.width,
      radar.width,
    ])
  })

  const shellHeightRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.height,
      hero.height,
      blog.height,
      blog.height,
      travel.height,
      travel.height,
      radar.height,
      radar.height,
    ])
  })

  const shellRadiusRatioRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.shellRadiusRatio,
      hero.shellRadiusRatio,
      blog.shellRadiusRatio,
      blog.shellRadiusRatio,
      travel.shellRadiusRatio,
      travel.shellRadiusRatio,
      radar.shellRadiusRatio,
      radar.shellRadiusRatio,
    ])
  })

  const coreScaleXRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.coreScaleX,
      hero.coreScaleX,
      blog.coreScaleX,
      blog.coreScaleX,
      travel.coreScaleX,
      travel.coreScaleX,
      radar.coreScaleX,
      radar.coreScaleX,
    ])
  })

  const coreScaleYRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.coreScaleY,
      hero.coreScaleY,
      blog.coreScaleY,
      blog.coreScaleY,
      travel.coreScaleY,
      travel.coreScaleY,
      radar.coreScaleY,
      radar.coreScaleY,
    ])
  })

  const coreRadiusRatioRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.coreRadiusRatio,
      hero.coreRadiusRatio,
      blog.coreRadiusRatio,
      blog.coreRadiusRatio,
      travel.coreRadiusRatio,
      travel.coreRadiusRatio,
      radar.coreRadiusRatio,
      radar.coreRadiusRatio,
    ])
  })

  const shellBorderWidthRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.borderWidth,
      hero.borderWidth,
      blog.borderWidth,
      blog.borderWidth,
      travel.borderWidth,
      travel.borderWidth,
      radar.borderWidth,
      radar.borderWidth,
    ])
  })

  const shellRotateRaw = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const { hero, blog, travel, radar } = keyframeMeasurementsRef.current
    const heroToBlogAngle = (Math.atan2(blog.y - hero.y, blog.x - hero.x) * 180) / Math.PI
    const blogToTravelAngle =
      (Math.atan2(travel.y - blog.y, travel.x - blog.x) * 180) / Math.PI
    const travelToRadarAngle =
      (Math.atan2(radar.y - travel.y, radar.x - travel.x) * 180) / Math.PI

    return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
      hero.rotation,
      heroToBlogAngle,
      blog.rotation,
      blogToTravelAngle,
      travel.rotation,
      travelToRadarAngle,
      radar.rotation,
      radar.rotation,
    ])
  })

  const currentShellBackground = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const visualId = getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].shellBackground
  })

  const currentShellBorderColor = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const visualId = getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].shellBorderColor
  })

  const currentShellShadow = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const visualId = getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].shellShadow
  })

  const currentShellBackdropFilter = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const visualId = getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].shellBackdropFilter
  })

  const currentCoreBackground = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const visualId = getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].coreBackground
  })

  const currentImageScale = useTransform(() => {
    frameTicker.get()
    const progress = pageProgress.get()
    const visualId = getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].imageScale
  })

  const takeoverStrength = useTransform(() => {
    frameTicker.get()
    return getMaxTakeoverStrength(pageProgress.get())
  })
  const movementStrengthRaw = useTransform(() => {
    frameTicker.get()
    return getMovementStrength(pageProgress.get())
  })

  const overlayOpacity = useSpring(takeoverStrength, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const avatarSpin = useTransform(() => {
    frameTicker.get()
    return getBlogSpinDegrees(pageProgress.get())
  })
  const movementStrength = useSpring(movementStrengthRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })

  const shellX = useSpring(shellXRaw, {
    stiffness: 320,
    damping: 40,
    mass: 0.26,
  })
  const shellY = useSpring(shellYRaw, {
    stiffness: 320,
    damping: 40,
    mass: 0.26,
  })
  const shellWidth = useSpring(shellWidthRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const shellHeight = useSpring(shellHeightRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const shellRadiusRatio = useSpring(shellRadiusRatioRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const coreScaleX = useSpring(coreScaleXRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const coreScaleY = useSpring(coreScaleYRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const coreRadiusRatio = useSpring(coreRadiusRatioRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const shellBorderWidth = useSpring(shellBorderWidthRaw, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
  })
  const shellRotate = useSpring(shellRotateRaw, {
    stiffness: 280,
    damping: 34,
    mass: 0.24,
  })

  const shellRadius = useTransform(
    [shellWidth, shellHeight, shellRadiusRatio],
    (values) => {
      const currentWidth = Number(values[0] ?? 0)
      const currentHeight = Number(values[1] ?? 0)
      const ratio = Number(values[2] ?? 0)

      return Math.min(currentWidth, currentHeight) * ratio
    }
  )
  const coreWidth = useTransform(
    [shellWidth, coreScaleX],
    (values) => {
      const currentWidth = Number(values[0] ?? 0)
      const ratio = Number(values[1] ?? 0)

      return currentWidth * ratio
    }
  )
  const coreHeight = useTransform(
    [shellHeight, coreScaleY],
    (values) => {
      const currentHeight = Number(values[0] ?? 0)
      const ratio = Number(values[1] ?? 0)

      return currentHeight * ratio
    }
  )
  const coreRadius = useTransform(
    [coreWidth, coreHeight, coreRadiusRatio],
    (values) => {
      const currentWidth = Number(values[0] ?? 0)
      const currentHeight = Number(values[1] ?? 0)
      const ratio = Number(values[2] ?? 0)

      return Math.min(currentWidth, currentHeight) * ratio
    }
  )
  const sceneSize = useTransform(
    [shellWidth, shellHeight],
    (values) => {
      const currentWidth = Number(values[0] ?? 0)
      const currentHeight = Number(values[1] ?? 0)

      return Math.max(currentWidth, currentHeight)
    }
  )
  const trailWidth = useTransform(
    [sceneSize, movementStrength],
    (values) => {
      const size = Number(values[0] ?? 0)
      const currentMovement = Number(values[1] ?? 0)

      return size * currentMovement * 1.45
    }
  )
  const trailHeight = useTransform(
    [sceneSize, movementStrength],
    (values) => {
      const size = Number(values[0] ?? 0)
      const currentMovement = Number(values[1] ?? 0)

      return Math.max(0, size * currentMovement * 0.16)
    }
  )
  const trailOffsetX = useTransform(
    [trailWidth, shellWidth],
    (values) => {
      const currentTrailWidth = Number(values[0] ?? 0)
      const currentShellWidth = Number(values[1] ?? 0)

      return -(currentShellWidth * 0.42 + currentTrailWidth * 0.62)
    }
  )
  const haloSize = useTransform(
    [sceneSize, movementStrength],
    (values) => {
      const size = Number(values[0] ?? 0)
      const currentMovement = Number(values[1] ?? 0)

      return size * (1.28 + currentMovement * 0.34)
    }
  )
  const trailOpacity = useTransform(
    [movementStrength, takeoverStrength],
    (values) => {
      const currentMovement = Number(values[0] ?? 0)
      const currentTakeover = Number(values[1] ?? 0)

      return currentMovement * 0.42 * (1 - currentTakeover * 0.18)
    }
  )
  const haloOpacity = useTransform(
    [movementStrength, takeoverStrength],
    (values) => {
      const currentMovement = Number(values[0] ?? 0)
      const currentTakeover = Number(values[1] ?? 0)

      return currentMovement * 0.28 * (1 - currentTakeover * 0.12)
    }
  )

  if (prefersReducedMotion) {
    return null
  }

  return (
    <div aria-hidden="true" className={styles.layer}>
      <motion.div
        className={styles.meteor}
        style={{
          x: shellX,
          y: shellY,
          rotate: shellRotate,
          opacity: overlayOpacity,
        }}
      >
        <motion.span
          className={cn(
            styles.trail,
            isDarkMode ? styles.trailDark : styles.trailLight
          )}
          style={{
            x: trailOffsetX,
            width: trailWidth,
            height: trailHeight,
            opacity: trailOpacity,
          }}
        />
        <motion.span
          className={cn(
            styles.halo,
            isDarkMode ? styles.haloDark : styles.haloLight
          )}
          style={{
            width: haloSize,
            height: haloSize,
            opacity: haloOpacity,
          }}
        />

        <motion.div
          className={styles.avatarShell}
          style={{
            rotate: avatarSpin,
            width: shellWidth,
            height: shellHeight,
            borderRadius: shellRadius,
            borderWidth: shellBorderWidth,
            backgroundColor: currentShellBackground,
            borderColor: currentShellBorderColor,
            boxShadow: currentShellShadow,
            backdropFilter: currentShellBackdropFilter,
          }}
        >
          <motion.div
            className={styles.avatarCore}
            style={{
              width: coreWidth,
              height: coreHeight,
              borderRadius: coreRadius,
              backgroundColor: currentCoreBackground,
            }}
          >
            <motion.img
              src={avatarSrc}
              alt=""
              width={360}
              height={360}
              decoding="async"
              className={styles.avatar}
              style={{ scale: currentImageScale }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

const styles = {
  layer: 'pointer-events-none fixed inset-0 z-[34] overflow-hidden',
  meteor:
    'absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center will-change-transform',
  trail:
    'absolute left-1/2 top-1/2 origin-right -translate-y-1/2 rounded-full blur-[10px]',
  trailLight:
    'bg-[linear-gradient(90deg,rgba(253,230,138,0)_0%,rgba(252,211,77,0.22)_34%,rgba(255,255,255,0.92)_100%)]',
  trailDark:
    'bg-[linear-gradient(90deg,rgba(56,189,248,0)_0%,rgba(125,211,252,0.18)_34%,rgba(255,255,255,0.9)_100%)]',
  halo:
    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl',
  haloLight:
    'bg-[radial-gradient(circle,rgba(255,247,214,0.46)_0%,rgba(255,247,214,0.12)_42%,rgba(255,247,214,0)_74%)]',
  haloDark:
    'bg-[radial-gradient(circle,rgba(125,211,252,0.24)_0%,rgba(125,211,252,0.08)_40%,rgba(15,23,42,0)_72%)]',
  avatarShell:
    'relative flex shrink-0 items-center justify-center overflow-hidden border will-change-transform',
  avatarCore:
    'relative flex shrink-0 items-center justify-center overflow-hidden will-change-transform',
  avatar: 'h-full w-full object-cover object-center will-change-transform',
}
