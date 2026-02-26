import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { FileQuestion } from 'lucide-react'
import { cn } from '../utils/cn'

export function NotFound() {
  const { t } = useTranslation()

  return (
    <Card className={styles.card}>
      <div className={styles.iconContainer}>
        <FileQuestion size={64} className={styles.icon} />
      </div>
      <h1 className={styles.title}>
        {t('notFound.title')}
      </h1>
      <p className={styles.description}>
        {t('notFound.description')}
      </p>
      <Link
        to="/"
        className={styles.button}
      >
        {t('notFound.backHome')}
      </Link>
    </Card>
  )
}

const styles = {
  card: "mx-auto max-w-2xl flex flex-col items-center justify-center py-20 text-center",
  iconContainer: "mb-6 rounded-full bg-slate-100 p-6 dark:bg-slate-800",
  icon: "text-slate-400 dark:text-slate-500",
  title: "mb-4 text-3xl font-bold text-slate-800 dark:text-slate-200",
  description: "mb-8 text-lg text-slate-600 dark:text-slate-400",
  button: cn(
    "rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors",
    "hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
  )
}
