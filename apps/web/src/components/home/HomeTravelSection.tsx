import { motion, type MotionValue } from 'framer-motion'
import { TravelFootprintPlugin } from './TravelFootprintPlugin'
import { useTranslation } from 'react-i18next'

interface HomeTravelSectionProps {
  travelScale: MotionValue<number>
  travelY: MotionValue<number>
  travelOpacity: MotionValue<number>
  travelFilter: MotionValue<string>
  travelPointerEvents: MotionValue<string>
  travelCardY: MotionValue<number>
  travelCardOpacity: MotionValue<number>
}

export function HomeTravelSection({
  travelScale,
  travelY,
  travelOpacity,
  travelFilter,
  travelPointerEvents,
  travelCardY,
  travelCardOpacity,
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
        opacity: travelOpacity,
        filter: travelFilter,
        pointerEvents: travelPointerEvents,
      }}
    >
      <div className={styles.travelSection}>
        <div aria-hidden="true" className={styles.travelBackdropBase} />
        <div aria-hidden="true" className={styles.travelBackdropGlow} />
        <div aria-hidden="true" className={styles.travelTopBlend} />
        <div className={styles.travelSectionInner}>
          <motion.div
            className={styles.travelPluginWrap}
            style={{ y: travelCardY, opacity: travelCardOpacity }}
          >
            <TravelFootprintPlugin />
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

const styles = {
  travelLayer: 'relative w-full',
  travelSection: 'relative w-full overflow-hidden',
  travelBackdropBase:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#050810_0%,#050a12_18%,#060d16_36%,#08111a_62%,#0a141f_100%)]',
  travelBackdropGlow:
    'pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0.05)_34%,rgba(56,189,248,0)_72%)] blur-3xl',
  travelTopBlend:
    'pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(5,8,16,0)_0%,rgba(5,8,16,0.16)_38%,rgba(5,8,16,0.72)_78%,rgba(5,8,16,0.96)_100%)]',
  travelSectionInner:
    'relative mx-auto flex w-full max-w-7xl flex-col justify-center gap-10 px-4 pt-20 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28',
  travelPluginWrap: 'w-full min-w-0 will-change-transform',
}
