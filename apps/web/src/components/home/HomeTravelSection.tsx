import { motion, type MotionValue } from 'framer-motion'
import { TravelFootprintPlugin } from './TravelFootprintPlugin'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

interface HomeTravelSectionProps {
  travelScale: MotionValue<number>
  travelY: MotionValue<number>
  travelRotate: MotionValue<number>
  travelOpacity: MotionValue<number>
  travelFilter: MotionValue<string>
  travelPointerEvents: MotionValue<string>
  travelCardY: MotionValue<number>
  travelCardOpacity: MotionValue<number>
  avatarSrc: string
}

export function HomeTravelSection({
  travelScale,
  travelY,
  travelRotate,
  travelOpacity,
  travelFilter,
  travelPointerEvents,
  travelCardY,
  travelCardOpacity,
  avatarSrc,
}: HomeTravelSectionProps) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')

  return (
    <motion.section
      aria-label={isZh ? '旅行页面' : 'Travel page'}
      className={styles.travelLayer}
      style={{
        scale: travelScale,
        y: travelY,
        rotate: travelRotate,
        opacity: travelOpacity,
        filter: travelFilter,
        pointerEvents: travelPointerEvents,
      }}
    >
      <div className={styles.travelSection}>
        <div className={styles.travelSectionInner}>
          <div className={styles.travelSectionHeader}>
            <div className={styles.travelCopy} />
          </div>

          <motion.div
            className={styles.travelPluginWrap}
            style={{ y: travelCardY, opacity: travelCardOpacity }}
          >
            <TravelFootprintPlugin avatarSrc={avatarSrc} />
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

const styles = {
  travelLayer: 'relative w-full',
  travelSection: 'relative w-full overflow-hidden',
  travelSectionInner:
    'mx-auto flex w-full max-w-7xl flex-col justify-center gap-8 px-4 pt-24 pb-16 sm:px-6 lg:px-8',
  travelSectionHeader: 'grid gap-6',
  travelCopy: 'max-w-3xl text-left',
  travelPluginWrap: 'w-full min-w-0 will-change-transform',
}
