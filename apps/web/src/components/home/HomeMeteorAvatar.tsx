import { motion, type MotionValue } from 'framer-motion'
import { cn } from '../../utils/cn'
import { useHomeAvatarTransition } from './useHomeAvatarTransition'

interface HomeMeteorAvatarProps {
  avatarSrc: string
  pageProgress: MotionValue<number>
  heroSceneProgress?: MotionValue<number>
  isDarkMode: boolean
  prefersReducedMotion: boolean
}

export function HomeMeteorAvatar({
  avatarSrc,
  pageProgress,
  heroSceneProgress,
  isDarkMode,
  prefersReducedMotion,
}: HomeMeteorAvatarProps) {
  const {
    avatarSpin,
    coreWidth,
    coreHeight,
    coreRadius,
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
  } = useHomeAvatarTransition({
    pageProgress,
    heroSceneProgress,
    prefersReducedMotion,
  })

  if (prefersReducedMotion) {
    return null
  }

  return (
    <div aria-hidden="true" className={styles.layer}>
      <motion.div
        className={styles.meteor}
        style={{
          x: shellXValue,
          y: shellYValue,
          rotate: shellRotateValue,
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
            width: shellWidthValue,
            height: shellHeightValue,
            borderRadius: shellRadius,
            borderWidth: shellBorderWidthValue,
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
    'relative flex w-full shrink-0 items-center justify-center overflow-hidden will-change-transform',
  avatar: 'h-full w-full object-cover object-center will-change-transform',
}
