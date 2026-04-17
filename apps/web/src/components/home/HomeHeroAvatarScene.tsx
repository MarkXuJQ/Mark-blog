import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { cn } from '../../utils/cn'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const COARSE_POINTER_QUERY = '(pointer: coarse)'
const MAX_SENSOR_TILT = 18

type MotionSensorState =
  | 'checking'
  | 'unsupported'
  | 'idle'
  | 'granted'
  | 'denied'

type DeviceOrientationPermissionResult = 'granted' | 'denied'

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<DeviceOrientationPermissionResult>
}

function getInitialCoarsePointerPreference() {
  if (typeof window === 'undefined' || !('matchMedia' in window)) {
    return false
  }

  return window.matchMedia(COARSE_POINTER_QUERY).matches
}

function useIsCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    getInitialCoarsePointerPreference
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) {
      return
    }

    const mediaQuery = window.matchMedia(COARSE_POINTER_QUERY)
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void
      removeListener?: (listener: () => void) => void
    }
    const syncCoarsePointer = () => {
      setIsCoarsePointer(mediaQuery.matches)
    }

    syncCoarsePointer()

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', syncCoarsePointer)
      return () => mediaQuery.removeEventListener('change', syncCoarsePointer)
    }

    legacyMediaQuery.addListener?.(syncCoarsePointer)
    return () => legacyMediaQuery.removeListener?.(syncCoarsePointer)
  }, [])

  return isCoarsePointer
}

function getDeviceOrientationConstructor() {
  if (typeof window === 'undefined') {
    return null
  }

  return (window.DeviceOrientationEvent ??
    null) as DeviceOrientationWithPermission | null
}

function getScreenOrientationAngle() {
  if (typeof window === 'undefined') {
    return 0
  }

  if (typeof window.screen?.orientation?.angle === 'number') {
    return window.screen.orientation.angle
  }

  const legacyWindow = window as Window & { orientation?: number }
  return typeof legacyWindow.orientation === 'number'
    ? legacyWindow.orientation
    : 0
}

function normalizeTilt(value: number) {
  const normalized = clamp(value / MAX_SENSOR_TILT, -1, 1)

  return Math.abs(normalized) < 0.05 ? 0 : normalized
}

function projectTilt(beta: number, gamma: number) {
  const normalizedBeta = normalizeTilt(beta)
  const normalizedGamma = normalizeTilt(gamma)

  // Remap axes so the effect keeps feeling natural after portrait/landscape rotation.
  switch (getScreenOrientationAngle()) {
    case 90:
      return { x: normalizedBeta, y: -normalizedGamma }
    case -90:
    case 270:
      return { x: -normalizedBeta, y: normalizedGamma }
    case 180:
    case -180:
      return { x: -normalizedGamma, y: -normalizedBeta }
    default:
      return { x: normalizedGamma, y: normalizedBeta }
  }
}

function SceneTag({
  label,
  value,
  className,
  isDarkMode,
}: {
  label: string
  value: string
  className: string
  isDarkMode: boolean
}) {
  return (
    <div
      className={cn(
        styles.tag,
        className,
        isDarkMode ? styles.tagDark : styles.tagLight
      )}
    >
      <span className={styles.tagLabel}>{label}</span>
      <span className={styles.tagValue}>{value}</span>
    </div>
  )
}

export function HomeHeroAvatarScene({
  avatarSrc,
  sceneProgress,
  isDarkMode,
  prefersReducedMotion,
  isZh,
}: {
  avatarSrc: string
  sceneProgress: MotionValue<number>
  isDarkMode: boolean
  prefersReducedMotion: boolean
  isZh: boolean
}) {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const isCoarsePointer = useIsCoarsePointer()
  const [motionSensorState, setMotionSensorState] =
    useState<MotionSensorState>('checking')
  const tiltBaselineRef = useRef<{ beta: number; gamma: number } | null>(null)
  const orientationAngleRef = useRef(0)
  const springConfig = prefersReducedMotion
    ? { stiffness: 240, damping: 34, mass: 0.7 }
    : { stiffness: 130, damping: 18, mass: 0.56 }
  const smoothX = useSpring(pointerX, springConfig)
  const smoothY = useSpring(pointerY, springConfig)

  const shellRotateX = useTransform(
    smoothY,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [8, -8]
  )
  const shellRotateY = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-10, 10]
  )
  const shellX = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-10, 10]
  )
  const shellY = useTransform(
    smoothY,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-10, 10]
  )

  const sceneLift = useTransform(
    sceneProgress,
    [0, 0.32, 0.52],
    prefersReducedMotion ? [0, -4, -8] : [0, -20, -40]
  )
  const shellScale = useTransform(
    sceneProgress,
    [0, 0.42],
    [1, prefersReducedMotion ? 1.01 : 1.05]
  )
  const orbitRotate = useTransform(
    sceneProgress,
    [0, 1],
    [0, prefersReducedMotion ? 8 : 56]
  )
  const orbitY = useTransform(
    sceneProgress,
    [0, 0.46],
    prefersReducedMotion ? [0, -4] : [0, -16]
  )
  const glowScale = useTransform(
    sceneProgress,
    [0, 0.5],
    [1.02, prefersReducedMotion ? 1.04 : 1.14]
  )

  const orbitX = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-18, 18]
  )
  const orbitParallaxY = useTransform(
    smoothY,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-18, 18]
  )
  const avatarX = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-22, 22]
  )
  const avatarY = useTransform(
    smoothY,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-18, 18]
  )
  const echoX = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [18, -18]
  )
  const echoY = useTransform(
    smoothY,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [14, -14]
  )
  const glareX = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-58, 58]
  )
  const glareY = useTransform(
    smoothY,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-46, 46]
  )
  const avatarRotate = useTransform(
    smoothX,
    [-1, 1],
    prefersReducedMotion ? [0, 0] : [-7, 7]
  )
  const ringOpacity = useTransform(
    sceneProgress,
    [0, 0.4, 0.6],
    [0.44, 0.72, 0.56]
  )

  const shellShadow = useMotionTemplate`0 40px 120px -60px ${
    isDarkMode ? 'rgba(2, 6, 23, 0.88)' : 'rgba(15, 23, 42, 0.34)'
  }`

  useEffect(() => {
    if (prefersReducedMotion || !isCoarsePointer) {
      setMotionSensorState('unsupported')
      tiltBaselineRef.current = null
      orientationAngleRef.current = 0
      return
    }

    const deviceOrientation = getDeviceOrientationConstructor()

    if (!deviceOrientation) {
      setMotionSensorState('unsupported')
      return
    }

    if (typeof deviceOrientation.requestPermission === 'function') {
      setMotionSensorState((currentState) =>
        currentState === 'granted' ? currentState : 'idle'
      )
      return
    }

    setMotionSensorState('granted')
  }, [isCoarsePointer, prefersReducedMotion])

  useEffect(() => {
    if (
      prefersReducedMotion ||
      !isCoarsePointer ||
      motionSensorState !== 'granted'
    ) {
      tiltBaselineRef.current = null
      orientationAngleRef.current = 0
      pointerX.set(0)
      pointerY.set(0)
      return
    }

    const handleOrientationChange = (event: DeviceOrientationEvent) => {
      if (
        typeof event.beta !== 'number' ||
        typeof event.gamma !== 'number'
      ) {
        return
      }

      const currentAngle = getScreenOrientationAngle()

      if (
        !tiltBaselineRef.current ||
        orientationAngleRef.current !== currentAngle
      ) {
        tiltBaselineRef.current = { beta: event.beta, gamma: event.gamma }
        orientationAngleRef.current = currentAngle
      }

      const baseline = tiltBaselineRef.current

      if (!baseline) {
        return
      }

      const { x, y } = projectTilt(
        event.beta - baseline.beta,
        event.gamma - baseline.gamma
      )

      pointerX.set(x)
      pointerY.set(y)
    }

    window.addEventListener('deviceorientation', handleOrientationChange)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientationChange)
      tiltBaselineRef.current = null
      orientationAngleRef.current = 0
      pointerX.set(0)
      pointerY.set(0)
    }
  }, [isCoarsePointer, motionSensorState, pointerX, pointerY, prefersReducedMotion])

  const handleEnableMotionSensor = async () => {
    if (prefersReducedMotion) {
      return
    }

    const deviceOrientation = getDeviceOrientationConstructor()

    if (!deviceOrientation) {
      setMotionSensorState('unsupported')
      return
    }

    if (typeof deviceOrientation.requestPermission !== 'function') {
      setMotionSensorState('granted')
      return
    }

    try {
      const permission = await deviceOrientation.requestPermission()
      setMotionSensorState(permission === 'granted' ? 'granted' : 'denied')
    } catch {
      setMotionSensorState('denied')
    }
  }

  const showMotionSensorPrompt =
    isCoarsePointer &&
    !prefersReducedMotion &&
    (motionSensorState === 'idle' || motionSensorState === 'denied')
  const showMotionSensorHint =
    isCoarsePointer &&
    !prefersReducedMotion &&
    motionSensorState === 'granted'
  const motionSensorLabel =
    motionSensorState === 'denied'
      ? isZh
        ? '重新启用体感头像'
        : 'Try tilt avatar again'
      : isZh
        ? '轻触启用体感头像'
        : 'Tap to enable tilt avatar'
  const motionSensorHint = isZh ? '倾斜手机试试' : 'Tilt your phone'

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || event.pointerType === 'touch') return

    const rect = event.currentTarget.getBoundingClientRect()
    const nextX = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const nextY = ((event.clientY - rect.top) / rect.height - 0.5) * 2

    pointerX.set(clamp(nextX, -1, 1))
    pointerY.set(clamp(nextY, -1, 1))
  }

  const handlePointerLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <motion.div
      className={styles.frameWrap}
      style={{ y: sceneLift }}
    >
      <motion.div
        aria-hidden="true"
        className={styles.frame}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <motion.div
          className={cn(
            styles.backGlow,
            isDarkMode ? styles.backGlowDark : styles.backGlowLight
          )}
          style={{ scale: glowScale }}
        />

        <motion.div
          className={styles.orbitLayer}
          style={{
            rotate: orbitRotate,
            x: orbitX,
            y: orbitParallaxY,
            opacity: ringOpacity,
          }}
        >
          <div
            className={cn(
              styles.orbitRing,
              isDarkMode ? styles.orbitRingDark : styles.orbitRingLight
            )}
          />
          <div
            className={cn(
              styles.orbitRingInner,
              isDarkMode ? styles.orbitRingDark : styles.orbitRingLight
            )}
          />
          <motion.span
            className={cn(
              styles.signalDot,
              isDarkMode ? styles.signalDotDark : styles.signalDotLight
            )}
            style={{ y: orbitY }}
          />
        </motion.div>

        <motion.div
          className={styles.shellWrap}
          style={{
            rotateX: shellRotateX,
            rotateY: shellRotateY,
            x: shellX,
            y: shellY,
            scale: shellScale,
            boxShadow: shellShadow,
          }}
        >
          <div
            className={cn(
              styles.shell,
              isDarkMode ? styles.shellDark : styles.shellLight
            )}
          >
            <div
              className={cn(
                styles.gridOverlay,
                isDarkMode ? styles.gridOverlayDark : styles.gridOverlayLight
              )}
            />
            <div
              className={cn(
                styles.paperNoise,
                isDarkMode ? styles.paperNoiseDark : styles.paperNoiseLight
              )}
            />
            <motion.div
              className={styles.glare}
              style={{ x: glareX, y: glareY }}
            />

            <SceneTag
              label={isZh ? '技术方向' : 'Focus'}
              value={isZh ? '技术 / 设计 / 体验' : 'Code / Design / Motion'}
              className={styles.tagA}
              isDarkMode={isDarkMode}
            />
            <SceneTag
              label={isZh ? '内容模块' : 'Modules'}
              value={isZh ? 'Blog / 生活 / 影视' : 'Blog / Life / Movies'}
              className={styles.tagB}
              isDarkMode={isDarkMode}
            />

            <div className={styles.avatarStage}>
              <motion.div
                className={cn(
                  styles.avatarBackdrop,
                  isDarkMode
                    ? styles.avatarBackdropDark
                    : styles.avatarBackdropLight
                )}
                style={{ x: echoX, y: echoY }}
              />
              <motion.div
                className={cn(
                  styles.avatarEcho,
                  isDarkMode ? styles.avatarEchoDark : styles.avatarEchoLight
                )}
                style={{ x: echoX, y: echoY, rotate: avatarRotate }}
              />
              <motion.div
                className={styles.avatarShell}
                style={{ x: avatarX, y: avatarY, rotate: avatarRotate }}
              >
                <div className={styles.avatarHalo} />
                <div className={styles.avatarMask}>
                  <img
                    src={avatarSrc}
                    alt=""
                    width={360}
                    height={360}
                    decoding="async"
                    fetchPriority="high"
                    className={styles.avatar}
                  />
                </div>
                <div className={styles.avatarOutline} />
              </motion.div>

              <motion.div
                className={cn(
                  styles.ambientOrb,
                  styles.ambientOrbA,
                  isDarkMode ? styles.ambientOrbDark : styles.ambientOrbLight
                )}
                style={{ x: orbitX, y: orbitParallaxY }}
              />
              <motion.div
                className={cn(
                  styles.ambientOrb,
                  styles.ambientOrbB,
                  isDarkMode ? styles.ambientOrbDark : styles.ambientOrbLight
                )}
                style={{ x: avatarX, y: avatarY }}
              />

              <SceneTag
                label={isZh ? '生活模块' : 'Modules'}
                value={isZh ? '旅行 / 音乐 / 游戏' : 'Travel / Music / Games'}
                className={styles.tagC}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showMotionSensorPrompt ? (
        <button
          type="button"
          className={cn(
            styles.tiltPrompt,
            isDarkMode ? styles.tiltPromptDark : styles.tiltPromptLight
          )}
          onClick={handleEnableMotionSensor}
        >
          {motionSensorLabel}
        </button>
      ) : null}

      {showMotionSensorHint ? (
        <div
          className={cn(
            styles.tiltPrompt,
            styles.tiltHint,
            isDarkMode ? styles.tiltPromptDark : styles.tiltPromptLight
          )}
        >
          {motionSensorHint}
        </div>
      ) : null}
    </motion.div>
  )
}

const styles = {
  frameWrap:
    'relative mx-auto aspect-[0.94] w-full max-w-[360px] [perspective:1800px] sm:max-w-[420px] lg:max-w-[560px]',
  frame: 'relative h-full w-full',
  backGlow:
    'absolute left-1/2 top-1/2 hidden h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl lg:block lg:h-[30rem] lg:w-[30rem]',
  backGlowLight:
    'bg-[radial-gradient(circle,rgba(251,191,36,0.28)_0%,rgba(56,189,248,0.16)_34%,rgba(255,255,255,0)_74%)]',
  backGlowDark:
    'bg-[radial-gradient(circle,rgba(59,130,246,0.24)_0%,rgba(14,165,233,0.14)_32%,rgba(15,23,42,0)_72%)]',
  orbitLayer:
    'pointer-events-none absolute inset-[5%] z-10 hidden [transform-style:preserve-3d] lg:block',
  orbitRing:
    'absolute inset-[2%] rounded-[34px] border border-dashed backdrop-blur-[1px]',
  orbitRingInner:
    'absolute inset-[14%] rounded-[28px] border border-white/18 opacity-70',
  orbitRingLight: 'border-white/30',
  orbitRingDark: 'border-cyan-200/20',
  signalDot: 'absolute left-[14%] top-[8%] h-4 w-4 rounded-full shadow-lg',
  signalDotLight: 'bg-amber-200 shadow-amber-200/60',
  signalDotDark: 'bg-cyan-200 shadow-cyan-200/55',
  shellWrap:
    'relative z-20 flex h-full w-full items-center justify-center [transform-style:preserve-3d] will-change-transform',
  shell: cn(
    'relative flex h-full w-full items-center justify-center overflow-hidden rounded-[34px] border px-4 py-5 backdrop-blur-xl sm:px-5 sm:py-6',
    'lg:rounded-[38px] lg:px-7 lg:py-7 lg:backdrop-blur-2xl',
    '[transform-style:preserve-3d]'
  ),
  shellLight:
    'border-white/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.76)_0%,rgba(248,250,252,0.52)_52%,rgba(236,253,245,0.38)_100%)]',
  shellDark:
    'border-white/12 bg-[linear-gradient(160deg,rgba(15,23,42,0.84)_0%,rgba(7,14,26,0.78)_48%,rgba(8,20,38,0.72)_100%)]',
  gridOverlay:
    'pointer-events-none absolute inset-0 rounded-[34px] bg-[length:26px_26px] sm:bg-[length:30px_30px] lg:rounded-[38px] lg:bg-[length:34px_34px]',
  gridOverlayLight:
    'bg-[linear-gradient(rgba(100,116,139,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.2)_1px,transparent_1px)]',
  gridOverlayDark:
    'bg-[linear-gradient(rgba(186,230,253,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(186,230,253,0.11)_1px,transparent_1px)]',
  paperNoise:
    'pointer-events-none absolute inset-0 rounded-[34px] lg:rounded-[38px]',
  paperNoiseLight:
    'opacity-70 mix-blend-multiply bg-[radial-gradient(circle_at_14%_18%,rgba(15,23,42,0.05)_0_0.8px,transparent_1px),radial-gradient(circle_at_78%_32%,rgba(15,23,42,0.035)_0_0.9px,transparent_1.2px),radial-gradient(circle_at_36%_74%,rgba(15,23,42,0.04)_0_0.7px,transparent_1px),radial-gradient(circle_at_64%_84%,rgba(15,23,42,0.03)_0_0.8px,transparent_1px)] bg-[length:18px_18px,24px_24px,22px_22px,28px_28px]',
  paperNoiseDark:
    'opacity-35 mix-blend-screen bg-[radial-gradient(circle_at_16%_22%,rgba(226,232,240,0.12)_0_0.8px,transparent_1px),radial-gradient(circle_at_76%_36%,rgba(186,230,253,0.1)_0_0.9px,transparent_1.2px),radial-gradient(circle_at_34%_76%,rgba(226,232,240,0.1)_0_0.7px,transparent_1px),radial-gradient(circle_at_62%_82%,rgba(186,230,253,0.08)_0_0.8px,transparent_1px)] bg-[length:18px_18px,24px_24px,22px_22px,28px_28px]',
  glare:
    'pointer-events-none absolute left-1/2 top-1/2 hidden h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-3xl lg:block',
  tag: 'absolute z-20 hidden max-w-[12rem] flex-col gap-1 rounded-2xl border px-4 py-3 text-left backdrop-blur-xl shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] lg:flex',
  tagLight: 'border-white/68 bg-white/72 text-black',
  tagDark: 'border-white/12 bg-slate-950/48 text-white',
  tagLabel:
    'text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400',
  tagValue: 'text-sm font-medium leading-5 text-black dark:text-white',
  tagA: 'left-3 top-4 sm:left-5 sm:top-6',
  tagB: 'right-3 top-12 sm:right-6 sm:top-16',
  tagC: 'bottom-0 left-1/5 -translate-x-1/2',
  avatarStage:
    'relative flex min-h-[18rem] w-full items-center justify-center rounded-[30px] [transform-style:preserve-3d] sm:min-h-[20rem] lg:min-h-[29rem]',
  avatarBackdrop:
    'absolute hidden h-[15rem] w-[15rem] rounded-[38%] blur-3xl lg:block lg:h-[18rem] lg:w-[18rem]',
  avatarBackdropLight:
    'bg-[radial-gradient(circle,rgba(251,191,36,0.28)_0%,rgba(125,211,252,0.16)_36%,rgba(255,255,255,0)_78%)]',
  avatarBackdropDark:
    'bg-[radial-gradient(circle,rgba(34,211,238,0.24)_0%,rgba(59,130,246,0.14)_38%,rgba(15,23,42,0)_78%)]',
  avatarEcho:
    'absolute hidden h-[14rem] w-[14rem] rounded-[38%] border backdrop-blur-xl lg:block lg:h-[16rem] lg:w-[16rem]',
  avatarEchoLight: 'border-white/30 bg-white/16',
  avatarEchoDark: 'border-white/10 bg-slate-900/18',
  avatarShell:
    'relative z-10 flex h-[15rem] w-[15rem] items-center justify-center rounded-[38%] border border-white/40 bg-white/10 p-4 shadow-[0_30px_68px_-34px_rgba(15,23,42,0.82)] backdrop-blur-xl sm:h-[16.5rem] sm:w-[16.5rem] sm:p-[1.125rem] lg:h-[18rem] lg:w-[18rem] lg:p-5 lg:shadow-[0_45px_90px_-48px_rgba(15,23,42,0.82)] lg:[transform:translateZ(70px)]',
  avatarHalo:
    'absolute inset-[8%] rounded-[36%] bg-[radial-gradient(circle,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0)_72%)] blur-2xl',
  avatarMask:
    'relative h-full w-full overflow-hidden rounded-[34%] border border-white/28 bg-slate-950/10',
  avatar: 'h-full w-full scale-[1.08] object-cover object-center',
  avatarOutline:
    'pointer-events-none absolute inset-0 rounded-[38%] ring-1 ring-white/16',
  ambientOrb:
    'absolute hidden rounded-full blur-2xl [transform:translateZ(20px)] lg:block',
  ambientOrbLight:
    'bg-[radial-gradient(circle,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.08)_48%,rgba(255,255,255,0)_74%)]',
  ambientOrbDark:
    'bg-[radial-gradient(circle,rgba(125,211,252,0.34)_0%,rgba(125,211,252,0.08)_48%,rgba(15,23,42,0)_74%)]',
  ambientOrbA: 'right-[12%] top-[16%] h-20 w-20',
  ambientOrbB: 'bottom-[14%] right-[20%] h-28 w-28',
  tiltPrompt:
    'absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center rounded-full border px-4 py-2 text-[0.72rem] font-semibold tracking-[0.18em] uppercase shadow-[0_20px_40px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl transition-transform duration-300 lg:hidden',
  tiltPromptLight:
    'border-white/70 bg-white/72 text-slate-900 hover:-translate-x-1/2 hover:-translate-y-0.5',
  tiltPromptDark:
    'border-white/14 bg-slate-950/48 text-white hover:-translate-x-1/2 hover:-translate-y-0.5',
  tiltHint: 'pointer-events-none',
}
