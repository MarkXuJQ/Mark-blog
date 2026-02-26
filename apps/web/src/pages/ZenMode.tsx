import { useTranslation } from 'react-i18next'
import { Card } from '../components/Card'

export function ZenMode() {
  const { t } = useTranslation()

  return (
    <Card className={styles.card}>
      <h1 className={styles.title}>
        {t('zenMode.title')}
      </h1>
      <p className={styles.description}>
        {t('zenMode.description')}
      </p>
      <div className={styles.divider} />
    </Card>
  )
}

const styles = {
  card: "mx-auto max-w-2xl py-20 text-center",
  title: "mb-8 text-4xl font-light tracking-widest text-slate-800 dark:text-slate-100",
  description: "mb-12 text-lg font-light leading-loose text-slate-600 dark:text-slate-400",
  divider: "mx-auto h-px w-20 bg-slate-200 dark:bg-slate-700"
}
