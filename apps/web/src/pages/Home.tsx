import { useTranslation, Trans } from 'react-i18next'
import { cn } from '../utils/cn'

export function Home() {
  const { t } = useTranslation()

  return (
    <div className={styles.container}>
      <div className={styles.avatarContainer}>
        <img
          src="/images/IMG_1766.JPG"
          alt="Mark's Blog Logo"
          className={styles.avatar}
        />
      </div>

      <h1 className={styles.title}>
        <Trans
          i18nKey="home.title"
          components={[
            <span
              key="0"
              className={styles.highlightText}
            />,
          ]}
        />
      </h1>

      <div className={styles.contentContainer}>
        <p>{t('home.intro')}</p>
        <p>{t('home.description')}</p>
      </div>
      
      {/* Decorative element */}
      <div className={styles.decorativeContainer}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>
    </div>
  )
}

// Extract styles to constants for better readability
const styles = {
  container: "animate-in fade-in zoom-in-95 duration-1000",
  avatarContainer: "mb-8 flex justify-center",
  avatar: cn(
    "h-40 w-40 rounded-full border-4 border-white/50 shadow-2xl",
    "transition-transform duration-500 hover:scale-105 hover:rotate-3",
    "dark:border-slate-800/50"
  ),
  title: cn(
    "mb-6 text-4xl font-extrabold tracking-tight",
    "text-slate-900 drop-shadow-sm dark:text-white sm:text-6xl"
  ),
  highlightText: cn(
    "inline-block cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent",
    "transition-transform duration-300 hover:-translate-y-1 hover:scale-110 hover:rotate-3"
  ),
  contentContainer: cn(
    "mx-auto max-w-2xl space-y-6 text-lg font-medium leading-relaxed",
    "text-slate-800 drop-shadow-md dark:text-slate-100"
  ),
  decorativeContainer: "mt-12 flex justify-center gap-2 opacity-50",
  dot: "h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
}
