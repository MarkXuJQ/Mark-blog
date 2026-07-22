import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface TimeProgressMetrics {
  dayOfYear: number
  yearProgress: number
  dayProgress: number
}

const REFRESH_INTERVAL = 30_000
const DAY_IN_MILLISECONDS = 86_400_000

function getTimeProgress(nowValue = Date.now()): TimeProgressMetrics {
  const now = new Date(nowValue)
  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()
  const startOfDay = new Date(year, month, date).getTime()
  const startOfNextDay = new Date(year, month, date + 1).getTime()
  const dayProgress = Math.min(
    1,
    Math.max(0, (nowValue - startOfDay) / (startOfNextDay - startOfDay))
  )
  const dayOfYear =
    Math.floor(
      (Date.UTC(year, month, date) - Date.UTC(year, 0, 1)) /
        DAY_IN_MILLISECONDS
    ) + 1
  const daysInYear =
    (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) /
    DAY_IN_MILLISECONDS

  return {
    dayOfYear,
    yearProgress: ((dayOfYear - 1 + dayProgress) / daysInYear) * 100,
    dayProgress: dayProgress * 100,
  }
}

function DecimalValue({ value }: { value: number }) {
  const [integer, fraction] = value.toFixed(1).split('.')

  return (
    <>
      <span className={styles.integer} data-time-progress-integer>
        {integer}
      </span>
      <span className={styles.fraction} data-time-progress-fraction>
        .{fraction}%
      </span>
    </>
  )
}

function RollingDecimalValue({ value }: { value: number }) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  const formattedValue = value.toFixed(1)

  return (
    <span className={styles.roller} data-time-progress-roller>
      <AnimatePresence initial={false}>
        <motion.span
          key={formattedValue}
          className={styles.rollerValue}
          initial={
            shouldReduceMotion ? false : { opacity: 0, y: '105%' }
          }
          animate={{ opacity: 1, y: '0%' }}
          exit={
            shouldReduceMotion ? undefined : { opacity: 0, y: '-105%' }
          }
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          data-time-progress-roller-value={formattedValue}
        >
          <DecimalValue value={value} />
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function TimeProgress() {
  const { t } = useTranslation()
  const [metrics, setMetrics] = useState(() => getTimeProgress())

  useEffect(() => {
    const refresh = () => setMetrics(getTimeProgress())
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL)

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const items = [
    {
      id: 'day-of-year',
      label: t('timeline.progress.dayOfYear'),
      value: (
        <>
          <span className={styles.integer} data-time-progress-integer>
            {metrics.dayOfYear}
          </span>
          <span className={styles.fraction} data-time-progress-fraction>
            {t('timeline.progress.dayUnit')}
          </span>
        </>
      ),
      accessibleValue: `${metrics.dayOfYear}${t('timeline.progress.dayUnit')}`,
    },
    {
      id: 'year-progress',
      label: t('timeline.progress.yearProgress'),
      value: <DecimalValue value={metrics.yearProgress} />,
      accessibleValue: `${metrics.yearProgress.toFixed(1)}%`,
    },
    {
      id: 'day-progress',
      label: t('timeline.progress.dayProgress'),
      value: <RollingDecimalValue value={metrics.dayProgress} />,
      accessibleValue: `${metrics.dayProgress.toFixed(1)}%`,
    },
  ]

  return (
    <section
      className={styles.section}
      aria-label={t('timeline.progress.ariaLabel')}
      data-time-progress
    >
      <div className={styles.metrics}>
        {items.map((item) => (
          <div key={item.id} className={styles.metric} data-time-progress-metric>
            <span className={styles.label}>{item.label}</span>
            <span
              className={styles.value}
              aria-label={`${item.label}：${item.accessibleValue}`}
              data-time-progress-value
              suppressHydrationWarning
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

const styles = {
  section:
    'order-first w-fit max-w-full self-start opacity-85 md:order-last md:self-end',
  metrics: 'grid w-fit grid-cols-[repeat(3,5.5rem)] gap-x-1',
  metric: 'min-w-0',
  label:
    'mb-1.5 block whitespace-nowrap text-[0.625rem] font-medium text-slate-500 dark:text-slate-500',
  value:
    'flex items-baseline whitespace-nowrap text-slate-900 dark:text-slate-100',
  integer:
    'font-mono text-[1.25rem] font-semibold leading-none tracking-[0] tabular-nums sm:text-[1.75rem]',
  fraction:
    'font-mono text-[0.625rem] font-medium leading-none tracking-[0] text-slate-500 tabular-nums dark:text-slate-400 sm:text-[0.875rem]',
  roller: 'relative inline-grid overflow-hidden py-0.5',
  rollerValue:
    'col-start-1 row-start-1 flex items-baseline whitespace-nowrap',
}
