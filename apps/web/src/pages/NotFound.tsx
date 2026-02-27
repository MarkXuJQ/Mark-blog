import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { FileQuestion } from 'lucide-react'
import { cn } from '../utils/cn'

export function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
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
    </div>
  )
}

const styles = {
  card: "w-full max-w-3xl flex flex-col items-center justify-center text-center p-12 shadow-2xl border-slate-200/50 dark:border-slate-700/50",
  iconContainer: "mb-8 rounded-full bg-slate-100 p-8 dark:bg-slate-800",
  icon: "text-slate-400 dark:text-slate-500",
  title: "mb-6 text-4xl font-bold text-slate-800 dark:text-slate-200 tracking-tight",
  description: "mb-10 text-xl text-slate-600 dark:text-slate-400 max-w-lg mx-auto",
  button: cn(
    "rounded-full bg-slate-900 px-8 py-4 text-base font-medium text-white transition-all hover:scale-105",
    "hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg hover:shadow-xl"
  )
}
