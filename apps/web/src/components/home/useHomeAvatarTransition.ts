import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  useAnimationFrame,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'

const FIRST_LEG_START = 0.16
const FIRST_LEG_END = 0.2
const SECOND_LEG_START = 0.58
const SECOND_LEG_END = 0.68
const THIRD_LEG_START = 0.86
const THIRD_LEG_END = 0.93

const MOTION_PATH_POINTS = [
  0,
  FIRST_LEG_START,
  FIRST_LEG_END,
  SECOND_LEG_START,
  SECOND_LEG_END,
  THIRD_LEG_START,
  THIRD_LEG_END,
  1,
] as const

const AVATAR_KEYFRAME_IDS = ['hero', 'blog', 'travel', 'radar'] as const
const BLOG_SPIN_START = FIRST_LEG_END
const BLOG_SPIN_END = 0.54
const BLOG_SPIN_HOLD_END = SECOND_LEG_START
const SECOND_LEG_SPIN_START = SECOND_LEG_START
const SECOND_LEG_SPIN_END = SECOND_LEG_END
const HERO_EARLY_MOVE_START = 0.18
const HERO_EARLY_MOVE_END = 0.42
const HERO_PROGRESS_DIRECTION_EPSILON = 0.0005

type AvatarKeyframeId = (typeof AVATAR_KEYFRAME_IDS)[number]

type AvatarInterpolatedMeasurementField =
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'shellRadiusRatio'
  | 'coreScaleX'
  | 'coreScaleY'
  | 'coreRadiusRatio'
  | 'borderWidth'

type AvatarLockedMeasurementField =
  | AvatarInterpolatedMeasurementField
  | 'rotation'

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
  blog: {
    enterStart: 0.16,
    holdStart: 0.2,
    holdEnd: SECOND_LEG_START,
    exitEnd: SECOND_LEG_END,
  },
  travel: {
    enterStart: SECOND_LEG_START,
    holdStart: SECOND_LEG_END,
    holdEnd: THIRD_LEG_START,
    exitEnd: THIRD_LEG_END,
  },
  radar: {
    enterStart: THIRD_LEG_START,
    holdStart: THIRD_LEG_END,
    holdEnd: 1,
    exitEnd: 1,
  },
}

const MOTION_WINDOWS = [
  { start: FIRST_LEG_START, end: FIRST_LEG_END },
  { start: SECOND_LEG_START, end: SECOND_LEG_END },
  { start: THIRD_LEG_START, end: THIRD_LEG_END },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function mixValues(from: number, to: number, progress: number) {
  return from + (to - from) * progress
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

function normalizeAngle(angle: number) {
  let normalized = angle % 360

  if (normalized > 180) {
    normalized -= 360
  }

  if (normalized < -180) {
    normalized += 360
  }

  return normalized
}

function mixAngles(from: number, to: number, progress: number) {
  return from + normalizeAngle(to - from) * progress
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

function getCurrentVisualKeyframeId(progress: number): AvatarKeyframeId {
  if (progress < FIRST_LEG_END) return 'hero'
  if (progress < SECOND_LEG_END) return 'blog'
  if (progress < THIRD_LEG_END) return 'travel'
  return 'radar'
}

function getAvatarSpinDegrees(progress: number) {
  if (progress <= BLOG_SPIN_START) return 0

  if (progress < BLOG_SPIN_END) {
    const spinProgress = clamp(
      (progress - BLOG_SPIN_START) /
        Math.max(0.0001, BLOG_SPIN_END - BLOG_SPIN_START),
      0,
      1
    )

    return easeInOutCubic(spinProgress) * 360
  }

  if (progress < BLOG_SPIN_HOLD_END) {
    return 360
  }

  if (progress < SECOND_LEG_SPIN_END) {
    const spinProgress = clamp(
      (progress - SECOND_LEG_SPIN_START) /
        Math.max(0.0001, SECOND_LEG_SPIN_END - SECOND_LEG_SPIN_START),
      0,
      1
    )

    return 360 + easeInOutCubic(spinProgress) * 360
  }

  return 720
}

function getHeroEarlyMoveProgress(progress: number) {
  return clamp(
    (progress - HERO_EARLY_MOVE_START) /
      Math.max(0.0001, HERO_EARLY_MOVE_END - HERO_EARLY_MOVE_START),
    0,
    1
  )
}

function getHeroEarlyMoveValue(
  heroSceneProgressValue?: number,
  heroSceneDirection = 0
) {
  if (heroSceneProgressValue == null || heroSceneDirection < 0) {
    return 0
  }

  return getHeroEarlyMoveProgress(heroSceneProgressValue)
}

function getLegProgress(pageProgress: number, start: number, end: number) {
  return clamp((pageProgress - start) / Math.max(0.0001, end - start), 0, 1)
}

function getFirstLegProgress(pageProgress: number, heroEarlyMove: number) {
  return Math.max(
    getLegProgress(pageProgress, FIRST_LEG_START, FIRST_LEG_END),
    heroEarlyMove
  )
}

function isFirstLegActive(pageProgress: number, heroEarlyMove: number) {
  return (
    pageProgress < FIRST_LEG_END &&
    getFirstLegProgress(pageProgress, heroEarlyMove) > 0
  )
}

function isMotionWindowActive(progress: number, start: number, end: number) {
  return progress >= start && progress <= end
}

function isSecondLegActive(progress: number) {
  return isMotionWindowActive(progress, SECOND_LEG_START, SECOND_LEG_END)
}

function isDirectPathActive(progress: number, heroEarlyMove: number) {
  return (
    isFirstLegActive(progress, heroEarlyMove) ||
    isSecondLegActive(progress) ||
    isMotionWindowActive(progress, THIRD_LEG_START, THIRD_LEG_END)
  )
}

function getPinnedKeyframeId(
  progress: number,
  heroEarlyMove: number
): AvatarKeyframeId | null {
  if (isDirectPathActive(progress, heroEarlyMove)) {
    return null
  }

  if (progress < FIRST_LEG_END) {
    return 'hero'
  }

  if (progress < SECOND_LEG_START) {
    return 'blog'
  }

  if (progress < THIRD_LEG_START) {
    return 'travel'
  }

  return 'radar'
}

function getActiveMeasurementKeyframeIds(
  progress: number,
  heroEarlyMove: number
): AvatarKeyframeId[] {
  if (isFirstLegActive(progress, heroEarlyMove)) {
    return ['hero', 'blog']
  }

  if (isSecondLegActive(progress)) {
    return ['blog', 'travel']
  }

  if (isMotionWindowActive(progress, THIRD_LEG_START, THIRD_LEG_END)) {
    return ['travel', 'radar']
  }

  const pinnedKeyframeId = getPinnedKeyframeId(progress, heroEarlyMove)
  return pinnedKeyframeId ? [pinnedKeyframeId] : []
}

function getSecondLegRotateValue(
  pageProgress: number,
  fromRotation: number,
  toRotation: number
) {
  const progress = getLegProgress(pageProgress, SECOND_LEG_START, SECOND_LEG_END)
  return mixAngles(fromRotation, toRotation, easeInOutCubic(progress))
}

function getThirdLegRotateValue(
  pageProgress: number,
  fromRotation: number,
  travelDirectionRotation: number,
  toRotation: number
) {
  const progress = getLegProgress(pageProgress, THIRD_LEG_START, THIRD_LEG_END)
  const directionBlendEnd = 0.72

  if (progress <= directionBlendEnd) {
    return mixAngles(
      fromRotation,
      travelDirectionRotation,
      easeInOutCubic(progress / directionBlendEnd)
    )
  }

  return mixAngles(
    travelDirectionRotation,
    toRotation,
    easeInOutCubic(
      (progress - directionBlendEnd) / Math.max(0.0001, 1 - directionBlendEnd)
    )
  )
}

function getTakeoverStrength(progress: number, keyframeId: AvatarKeyframeId) {
  const timing = KEYFRAME_TIMINGS[keyframeId]

  if (progress < timing.enterStart || progress > timing.exitEnd) return 0

  if (progress < timing.holdStart) {
    const enterProgress = clamp(
      (progress - timing.enterStart) /
        Math.max(0.0001, timing.holdStart - timing.enterStart),
      0,
      1
    )
    return easeInOutCubic(enterProgress)
  }

  if (progress <= timing.holdEnd) {
    return 1
  }

  const exitProgress = clamp(
    (progress - timing.holdEnd) /
      Math.max(0.0001, timing.exitEnd - timing.holdEnd),
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

function syncShellOpacity(
  elementMap: AvatarKeyframeElementMap,
  progress: number,
  heroEarlyMove: number
) {
  for (const keyframeId of AVATAR_KEYFRAME_IDS) {
    let elementSet = elementMap[keyframeId]

    if (isElementSetStale(keyframeId, elementSet)) {
      elementSet = queryAvatarKeyframeElements(keyframeId)
      elementMap[keyframeId] = elementSet
    }

    const shell = elementSet.shell

    if (!shell) continue

    const takeoverStrength =
      keyframeId === 'hero'
        ? Math.max(getTakeoverStrength(progress, keyframeId), heroEarlyMove)
        : getTakeoverStrength(progress, keyframeId)

    shell.style.opacity = String(clamp(1 - takeoverStrength, 0, 1))
  }
}

function getInterpolatedMeasurementValue(
  progress: number,
  heroEarlyMove: number,
  measurements: AvatarKeyframeMeasurements,
  field: AvatarInterpolatedMeasurementField
) {
  const { hero, blog, travel, radar } = measurements

  if (progress < FIRST_LEG_END) {
    const morphProgress = getFirstLegProgress(progress, heroEarlyMove)
    return mixValues(hero[field], blog[field], morphProgress)
  }

  return interpolateKeyframes(progress, MOTION_PATH_POINTS, [
    hero[field],
    hero[field],
    blog[field],
    blog[field],
    travel[field],
    travel[field],
    radar[field],
    radar[field],
  ])
}

function getInterpolatedShellRotation(
  progress: number,
  heroEarlyMove: number,
  measurements: AvatarKeyframeMeasurements
) {
  const { hero, blog, travel, radar } = measurements
  const heroToBlogAngle = (Math.atan2(blog.y - hero.y, blog.x - hero.x) * 180) / Math.PI
  const blogToTravelAngle =
    (Math.atan2(travel.y - blog.y, travel.x - blog.x) * 180) / Math.PI
  const travelToRadarAngle =
    (Math.atan2(radar.y - travel.y, radar.x - travel.x) * 180) / Math.PI

  if (progress < FIRST_LEG_END) {
    const firstLegProgress = getFirstLegProgress(progress, heroEarlyMove)
    return mixValues(hero.rotation, blog.rotation, firstLegProgress)
  }

  if (isSecondLegActive(progress)) {
    return getSecondLegRotateValue(progress, blog.rotation, travel.rotation)
  }

  if (isMotionWindowActive(progress, THIRD_LEG_START, THIRD_LEG_END)) {
    return getThirdLegRotateValue(
      progress,
      travel.rotation,
      travelToRadarAngle,
      radar.rotation
    )
  }

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
}

function getInterpolatedImageScale(
  progress: number,
  heroEarlyMove: number,
  measurements: AvatarKeyframeMeasurements
) {
  const { hero, blog, travel, radar } = measurements

  if (progress < FIRST_LEG_END) {
    const morphProgress = getFirstLegProgress(progress, heroEarlyMove)
    return mixValues(hero.imageScale, blog.imageScale, morphProgress)
  }

  if (isSecondLegActive(progress)) {
    const secondLegProgress = easeInOutCubic(
      getLegProgress(progress, SECOND_LEG_START, SECOND_LEG_END)
    )

    return mixValues(blog.imageScale, travel.imageScale, secondLegProgress)
  }

  if (isMotionWindowActive(progress, THIRD_LEG_START, THIRD_LEG_END)) {
    const thirdLegProgress = easeInOutCubic(
      getLegProgress(progress, THIRD_LEG_START, THIRD_LEG_END)
    )

    return mixValues(travel.imageScale, radar.imageScale, thirdLegProgress)
  }

  const visualId = getCurrentVisualKeyframeId(progress)
  return measurements[visualId].imageScale
}

function queryAvatarKeyframeElements(
  keyframeId: AvatarKeyframeId
): AvatarKeyframeElements {
  return {
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
}

function isElementSetStale(
  keyframeId: AvatarKeyframeId,
  elementSet: AvatarKeyframeElements
) {
  return (
    !elementSet.shell ||
    !elementSet.shell.isConnected ||
    (keyframeId !== 'blog' && elementSet.core == null) ||
    (elementSet.core != null && !elementSet.core.isConnected) ||
    (keyframeId === 'travel' && elementSet.rotate == null) ||
    (elementSet.rotate != null && !elementSet.rotate.isConnected) ||
    elementSet.image == null ||
    (elementSet.image != null && !elementSet.image.isConnected)
  )
}

interface MeasureAvatarKeyframesArgs {
  elementMap: AvatarKeyframeElementMap
  width: number
  height: number
  isCompact: boolean
  keyframeIds: readonly AvatarKeyframeId[]
  previousMeasurements: AvatarKeyframeMeasurements
  progress: number
  heroEarlyMove: number
}

function measureAvatarKeyframes({
  elementMap,
  width,
  height,
  isCompact,
  keyframeIds,
  previousMeasurements,
  progress,
  heroEarlyMove,
}: MeasureAvatarKeyframesArgs): AvatarKeyframeMeasurements {
  const fallbackMeasurements = getFallbackMeasurements(width, height, isCompact)

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return previousMeasurements
  }

  const viewportCenterX = width / 2
  const viewportCenterY = height / 2
  const nextMeasurements = { ...previousMeasurements }

  for (const keyframeId of keyframeIds) {
    let elementSet = elementMap[keyframeId]

    if (isElementSetStale(keyframeId, elementSet)) {
      elementSet = queryAvatarKeyframeElements(keyframeId)
      elementMap[keyframeId] = elementSet
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
  }

  syncShellOpacity(elementMap, progress, heroEarlyMove)

  return nextMeasurements
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

function useFrameDrivenValue<T>(
  frameTicker: MotionValue<number>,
  compute: () => T
) {
  return useTransform(() => {
    frameTicker.get()
    return compute()
  })
}

function useInterpolatedMeasurementMotion({
  frameTicker,
  pageProgress,
  heroEarlyMoveRef,
  keyframeMeasurementsRef,
  field,
}: {
  frameTicker: MotionValue<number>
  pageProgress: MotionValue<number>
  heroEarlyMoveRef: MutableRefObject<number>
  keyframeMeasurementsRef: MutableRefObject<AvatarKeyframeMeasurements>
  field: AvatarInterpolatedMeasurementField
}) {
  return useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const heroEarlyMove = heroEarlyMoveRef.current

    return getInterpolatedMeasurementValue(
      progress,
      heroEarlyMove,
      keyframeMeasurementsRef.current,
      field
    )
  })
}

function useLockedMeasurementMotion({
  frameTicker,
  pageProgress,
  heroEarlyMoveRef,
  keyframeMeasurementsRef,
  rawValue,
  springValue,
  field,
}: {
  frameTicker: MotionValue<number>
  pageProgress: MotionValue<number>
  heroEarlyMoveRef: MutableRefObject<number>
  keyframeMeasurementsRef: MutableRefObject<AvatarKeyframeMeasurements>
  rawValue: MotionValue<number>
  springValue: MotionValue<number>
  field: AvatarLockedMeasurementField
}) {
  return useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const heroEarlyMove = heroEarlyMoveRef.current

    if (isDirectPathActive(progress, heroEarlyMove)) {
      return rawValue.get()
    }

    const lockedKeyframeId = getPinnedKeyframeId(progress, heroEarlyMove)

    if (lockedKeyframeId) {
      return keyframeMeasurementsRef.current[lockedKeyframeId][field]
    }

    return springValue.get()
  })
}

interface UseHomeAvatarTransitionArgs {
  pageProgress: MotionValue<number>
  heroSceneProgress?: MotionValue<number>
  prefersReducedMotion: boolean
}

export function useHomeAvatarTransition({
  pageProgress,
  heroSceneProgress,
  prefersReducedMotion,
}: UseHomeAvatarTransitionArgs) {
  const frameTicker = useMotionValue(0)
  const { width, height } = useViewportSize()
  const isCompact = width < 768
  const keyframeElementsRef = useRef(createEmptyElementMap())
  const heroEarlyMoveRef = useRef(0)
  const previousHeroSceneProgressRef = useRef<number | null>(null)
  const heroSceneDirectionRef = useRef<-1 | 0 | 1>(0)
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
    const heroSceneValue = heroSceneProgress?.get()

    if (heroSceneValue == null) {
      heroEarlyMoveRef.current = 0
      heroSceneDirectionRef.current = 0
      previousHeroSceneProgressRef.current = null
    } else {
      const previousHeroSceneValue = previousHeroSceneProgressRef.current

      if (previousHeroSceneValue != null) {
        const delta = heroSceneValue - previousHeroSceneValue

        if (Math.abs(delta) > HERO_PROGRESS_DIRECTION_EPSILON) {
          heroSceneDirectionRef.current = delta > 0 ? 1 : -1
        }
      }

      previousHeroSceneProgressRef.current = heroSceneValue
      heroEarlyMoveRef.current = getHeroEarlyMoveValue(
        heroSceneValue,
        heroSceneDirectionRef.current
      )
    }

    frameTicker.set(timestamp)

    if (prefersReducedMotion) {
      resetShellVisibility(keyframeElementsRef.current)
      return
    }

    const progress = pageProgress.get()
    const heroEarlyMove = heroEarlyMoveRef.current
    const activeMeasurementKeyframeIds = getActiveMeasurementKeyframeIds(
      progress,
      heroEarlyMove
    )

    keyframeMeasurementsRef.current = measureAvatarKeyframes({
      elementMap: keyframeElementsRef.current,
      width,
      height,
      isCompact,
      keyframeIds: activeMeasurementKeyframeIds,
      previousMeasurements: keyframeMeasurementsRef.current,
      progress,
      heroEarlyMove,
    })
  })

  const shellXRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'x',
  })
  const shellYRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'y',
  })
  const shellWidthRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'width',
  })
  const shellHeightRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'height',
  })
  const shellRadiusRatioRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'shellRadiusRatio',
  })
  const coreScaleXRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'coreScaleX',
  })
  const coreScaleYRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'coreScaleY',
  })
  const coreRadiusRatioRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'coreRadiusRatio',
  })
  const shellBorderWidthRaw = useInterpolatedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    field: 'borderWidth',
  })

  const shellRotateRaw = useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const heroEarlyMove = heroEarlyMoveRef.current

    return getInterpolatedShellRotation(
      progress,
      heroEarlyMove,
      keyframeMeasurementsRef.current
    )
  })
  const currentShellBackground = useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const visualId =
      progress >= THIRD_LEG_START ? 'radar' : getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].shellBackground
  })
  const currentShellBorderColor = useFrameDrivenValue(frameTicker, () => {
    const visualId = getCurrentVisualKeyframeId(pageProgress.get())
    return keyframeMeasurementsRef.current[visualId].shellBorderColor
  })
  const currentShellShadow = useFrameDrivenValue(frameTicker, () => {
    const visualId = getCurrentVisualKeyframeId(pageProgress.get())
    return keyframeMeasurementsRef.current[visualId].shellShadow
  })
  const currentShellBackdropFilter = useFrameDrivenValue(frameTicker, () => {
    const visualId = getCurrentVisualKeyframeId(pageProgress.get())
    return keyframeMeasurementsRef.current[visualId].shellBackdropFilter
  })
  const currentCoreBackground = useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const visualId =
      progress >= THIRD_LEG_START ? 'radar' : getCurrentVisualKeyframeId(progress)
    return keyframeMeasurementsRef.current[visualId].coreBackground
  })
  const currentImageScale = useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const heroEarlyMove = heroEarlyMoveRef.current

    return getInterpolatedImageScale(
      progress,
      heroEarlyMove,
      keyframeMeasurementsRef.current
    )
  })
  const takeoverStrength = useFrameDrivenValue(frameTicker, () => {
    const progress = pageProgress.get()
    const heroEarlyMove = heroEarlyMoveRef.current

    return Math.max(getMaxTakeoverStrength(progress), heroEarlyMove)
  })
  const movementStrengthRaw = useFrameDrivenValue(frameTicker, () =>
    getMovementStrength(pageProgress.get())
  )
  const avatarSpin = useFrameDrivenValue(frameTicker, () =>
    getAvatarSpinDegrees(pageProgress.get())
  )
  const secondLegHaloEnabled = useFrameDrivenValue(frameTicker, () =>
    isSecondLegActive(pageProgress.get()) ? 0 : 1
  )

  const overlayOpacity = useSpring(takeoverStrength, {
    stiffness: 360,
    damping: 40,
    mass: 0.22,
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

  const shellXValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellXRaw,
    springValue: shellX,
    field: 'x',
  })
  const shellYValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellYRaw,
    springValue: shellY,
    field: 'y',
  })
  const shellWidthValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellWidthRaw,
    springValue: shellWidth,
    field: 'width',
  })
  const shellHeightValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellHeightRaw,
    springValue: shellHeight,
    field: 'height',
  })
  const shellRadiusRatioValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellRadiusRatioRaw,
    springValue: shellRadiusRatio,
    field: 'shellRadiusRatio',
  })
  const coreScaleXValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: coreScaleXRaw,
    springValue: coreScaleX,
    field: 'coreScaleX',
  })
  const coreScaleYValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: coreScaleYRaw,
    springValue: coreScaleY,
    field: 'coreScaleY',
  })
  const coreRadiusRatioValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: coreRadiusRatioRaw,
    springValue: coreRadiusRatio,
    field: 'coreRadiusRatio',
  })
  const shellBorderWidthValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellBorderWidthRaw,
    springValue: shellBorderWidth,
    field: 'borderWidth',
  })
  const shellRotateValue = useLockedMeasurementMotion({
    frameTicker,
    pageProgress,
    heroEarlyMoveRef,
    keyframeMeasurementsRef,
    rawValue: shellRotateRaw,
    springValue: shellRotate,
    field: 'rotation',
  })

  const shellRadius = useTransform(
    [shellWidthValue, shellHeightValue, shellRadiusRatioValue],
    (values) => {
      const currentWidth = Number(values[0] ?? 0)
      const currentHeight = Number(values[1] ?? 0)
      const ratio = Number(values[2] ?? 0)

      return Math.min(currentWidth, currentHeight) * ratio
    }
  )
  const coreWidth = useTransform([shellWidthValue, coreScaleXValue], (values) => {
    const currentWidth = Number(values[0] ?? 0)
    const ratio = Number(values[1] ?? 0)

    return currentWidth * ratio
  })
  const coreHeight = useTransform(
    [shellHeightValue, coreScaleYValue],
    (values) => {
      const currentHeight = Number(values[0] ?? 0)
      const ratio = Number(values[1] ?? 0)

      return currentHeight * ratio
    }
  )
  const coreRadius = useTransform(
    [coreWidth, coreHeight, coreRadiusRatioValue],
    (values) => {
      const currentWidth = Number(values[0] ?? 0)
      const currentHeight = Number(values[1] ?? 0)
      const ratio = Number(values[2] ?? 0)

      return Math.min(currentWidth, currentHeight) * ratio
    }
  )
  const sceneSize = useTransform([shellWidthValue, shellHeightValue], (values) => {
    const currentWidth = Number(values[0] ?? 0)
    const currentHeight = Number(values[1] ?? 0)

    return Math.max(currentWidth, currentHeight)
  })
  const trailWidth = useTransform([sceneSize, movementStrength], (values) => {
    const size = Number(values[0] ?? 0)
    const currentMovement = Number(values[1] ?? 0)

    return size * currentMovement * 1.45
  })
  const trailHeight = useTransform([sceneSize, movementStrength], (values) => {
    const size = Number(values[0] ?? 0)
    const currentMovement = Number(values[1] ?? 0)

    return Math.max(0, size * currentMovement * 0.16)
  })
  const trailOffsetX = useTransform([trailWidth, shellWidthValue], (values) => {
    const currentTrailWidth = Number(values[0] ?? 0)
    const currentShellWidth = Number(values[1] ?? 0)

    return -(currentShellWidth * 0.42 + currentTrailWidth * 0.62)
  })
  const haloSize = useTransform([sceneSize, movementStrength], (values) => {
    const size = Number(values[0] ?? 0)
    const currentMovement = Number(values[1] ?? 0)

    return size * (1.28 + currentMovement * 0.34)
  })
  const trailOpacity = useTransform(
    [movementStrength, takeoverStrength],
    (values) => {
      const currentMovement = Number(values[0] ?? 0)
      const currentTakeover = Number(values[1] ?? 0)

      return currentMovement * 0.42 * (1 - currentTakeover * 0.18)
    }
  )
  const haloOpacity = useFrameDrivenValue(frameTicker, () => {
    const currentMovement = movementStrength.get()
    const currentTakeover = takeoverStrength.get()
    const haloEnabled = secondLegHaloEnabled.get()

    return currentMovement * 0.28 * (1 - currentTakeover * 0.12) * haloEnabled
  })

  return {
    avatarSpin,
    coreHeight,
    coreRadius,
    coreWidth,
    currentCoreBackground,
    currentImageScale,
    currentShellBackdropFilter,
    currentShellBackground,
    currentShellBorderColor,
    currentShellShadow,
    haloOpacity,
    haloSize,
    overlayOpacity,
    shellBorderWidthValue,
    shellHeightValue,
    shellRadius,
    shellRotateValue,
    shellWidthValue,
    shellXValue,
    shellYValue,
    trailHeight,
    trailOffsetX,
    trailOpacity,
    trailWidth,
  }
}
