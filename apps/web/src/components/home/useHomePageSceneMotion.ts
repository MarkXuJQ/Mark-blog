import {
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'

interface HomePageSceneMotion {
  heroClipPath: MotionValue<string>
  heroContentOpacity: MotionValue<number>
  heroContentY: MotionValue<number>
  heroFilter: MotionValue<string>
  heroMediaScale: MotionValue<number>
  heroMediaY: MotionValue<number>
  heroOpacity: MotionValue<number>
  heroPointerEvents: MotionValue<string>
  heroRadius: MotionValue<number>
  heroScale: MotionValue<number>
  heroSceneProgress: MotionValue<number>
  heroShadow: MotionValue<string>
  heroY: MotionValue<number>
  prefersReducedMotion: boolean
  widgetFilter: MotionValue<string>
  widgetOpacity: MotionValue<number>
  widgetPointerEvents: MotionValue<string>
  widgetScale: MotionValue<number>
  widgetY: MotionValue<number>
}

export function useHomePageSceneMotion(): HomePageSceneMotion {
  const prefersReducedMotion = Boolean(useReducedMotion())
  const { scrollY } = useScroll()

  const sceneProgressSource = useTransform(
    scrollY,
    [0, prefersReducedMotion ? 960 : 1320],
    [0, 1]
  )

  const heroSceneProgress = useSpring(sceneProgressSource, {
    stiffness: prefersReducedMotion ? 240 : 160,
    damping: prefersReducedMotion ? 36 : 24,
    mass: 0.3,
  })

  const heroScale = useTransform(
    heroSceneProgress,
    [0, 0.12, 0.34, 0.58],
    prefersReducedMotion ? [1, 0.997, 0.992, 0.988] : [1, 0.988, 0.9, 0.78]
  )
  const heroOpacity = useTransform(
    heroSceneProgress,
    [0, 0.24, 0.44, 0.6],
    prefersReducedMotion ? [1, 1, 0.96, 0.9] : [1, 1, 0.54, 0.12]
  )
  const heroY = useTransform(
    heroSceneProgress,
    [0, 0.14, 0.38, 0.62],
    prefersReducedMotion ? [0, -3, -10, -18] : [0, -18, -132, -228]
  )
  const heroRadius = useTransform(heroSceneProgress, [0, 1], [0, 0])
  const heroClipPath = useTransform(
    heroSceneProgress,
    [0, 1],
    ['inset(0% 0% 0% 0% round 0px)', 'inset(0% 0% 0% 0% round 0px)']
  )
  const heroPointerEvents = useTransform(heroSceneProgress, (value) =>
    value > 0.44 ? 'none' : 'auto'
  ) as MotionValue<string>
  const heroShadow = useTransform(
    heroSceneProgress,
    [0, 0.2, 0.42, 0.6],
    [
      '0 24px 70px -34px rgba(15,23,42,0.56)',
      '0 52px 128px -56px rgba(15,23,42,0.66)',
      '0 46px 96px -62px rgba(15,23,42,0.14)',
      '0 20px 42px -34px rgba(15,23,42,0.04)',
    ]
  )
  const heroFilter = useTransform(
    heroSceneProgress,
    [0, 0.18, 0.36, 0.56],
    ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)']
  )
  const heroContentOpacity = useTransform(
    heroSceneProgress,
    [0, 0.18, 0.38, 0.54],
    prefersReducedMotion ? [1, 1, 0.96, 0.9] : [1, 1, 0.44, 0]
  )
  const heroContentY = useTransform(
    heroSceneProgress,
    [0, 0.18, 0.46],
    prefersReducedMotion ? [0, -6, -10] : [0, -14, -58]
  )
  const heroMediaScale = useTransform(
    heroSceneProgress,
    [0, 0.22, 0.5],
    prefersReducedMotion ? [1.02, 1.03, 1.04] : [1.02, 1.08, 1.18]
  )
  const heroMediaY = useTransform(
    heroSceneProgress,
    [0, 0.22, 0.5],
    prefersReducedMotion ? [0, -4, -8] : [0, -16, -42]
  )

  const widgetScale = useTransform(
    heroSceneProgress,
    [0.04, 0.18, 0.42, 0.66],
    prefersReducedMotion ? [1.003, 1.002, 1.001, 1] : [1.06, 1.03, 1.008, 1]
  )
  const widgetY = useTransform(
    heroSceneProgress,
    [0.02, 0.22, 0.46, 0.66],
    prefersReducedMotion ? [8, 3, 0, -2] : [72, 26, 0, -6]
  )
  const widgetOpacity = useTransform(
    heroSceneProgress,
    [0.02, 0.16, 0.38, 0.56],
    prefersReducedMotion ? [0.92, 0.96, 0.99, 1] : [0.18, 0.4, 0.82, 1]
  )
  const widgetFilter = useTransform(
    heroSceneProgress,
    [0.02, 0.22, 0.44, 0.6],
    ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)']
  )
  const widgetPointerEvents = useTransform(heroSceneProgress, (value) =>
    value > 0.18 ? 'auto' : 'none'
  ) as MotionValue<string>

  return {
    heroClipPath,
    heroContentOpacity,
    heroContentY,
    heroFilter,
    heroMediaScale,
    heroMediaY,
    heroOpacity,
    heroPointerEvents,
    heroRadius,
    heroScale,
    heroSceneProgress,
    heroShadow,
    heroY,
    prefersReducedMotion,
    widgetFilter,
    widgetOpacity,
    widgetPointerEvents,
    widgetScale,
    widgetY,
  }
}
