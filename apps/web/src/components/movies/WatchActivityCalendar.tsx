import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

interface CalendarDayCell {
  date: Date
  dateKey: string
  count: number
}

interface WatchActivityCalendarProps {
  watchDates: string[]
  locale: string
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateFromObject(input: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(input)
}

function getHeatmapLevelClass(count: number) {
  if (count <= 0) return 'bg-slate-100 dark:bg-slate-800'
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/70'
  if (count === 2) return 'bg-emerald-300 dark:bg-emerald-700/80'
  if (count === 3) return 'bg-emerald-500 dark:bg-emerald-500/85'
  return 'bg-emerald-700 dark:bg-emerald-300'
}

export function WatchActivityCalendar({
  watchDates,
  locale,
}: WatchActivityCalendarProps) {
  const { t } = useTranslation()

  const watchCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const watchDate of watchDates) {
      if (!watchDate) continue
      const parsed = new Date(watchDate)
      if (Number.isNaN(parsed.getTime())) continue
      const key = toDateKey(parsed)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [watchDates])

  const calendarDays = useMemo<CalendarDayCell[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const start = new Date(today)
    start.setDate(start.getDate() - 364)
    const startOffset = start.getDay()
    start.setDate(start.getDate() - startOffset)

    const days: CalendarDayCell[] = []
    const cursor = new Date(start)

    while (cursor <= today) {
      const dateKey = toDateKey(cursor)
      days.push({
        date: new Date(cursor),
        dateKey,
        count: watchCountMap[dateKey] ?? 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    return days
  }, [watchCountMap])

  const calendarWeeks = useMemo(() => {
    const weeks: CalendarDayCell[][] = []
    for (let index = 0; index < calendarDays.length; index += 7) {
      weeks.push(calendarDays.slice(index, index + 7))
    }
    return weeks
  }, [calendarDays])

  const calendarMonthLabels = useMemo(() => {
    let lastMonth = -1
    return calendarWeeks.map((week) => {
      const firstDay = week[0]
      if (!firstDay) return ''
      const month = firstDay.date.getMonth()
      if (month === lastMonth) return ''
      lastMonth = month
      return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        firstDay.date
      )
    })
  }, [calendarWeeks, locale])

  const activeWatchDays = useMemo(
    () => Object.values(watchCountMap).filter((count) => count > 0).length,
    [watchCountMap]
  )

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t('movies.calendar.title')}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('movies.calendar.summary', { count: activeWatchDays })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="mb-2 flex gap-1 pl-8">
            {calendarMonthLabels.map((label, index) => (
              <span
                key={`month-${index}`}
                className="w-3 text-[10px] text-slate-400 dark:text-slate-500"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col justify-between py-[2px] text-[10px] text-slate-400 dark:text-slate-500">
              <span>{t('movies.calendar.week.mon')}</span>
              <span>{t('movies.calendar.week.wed')}</span>
              <span>{t('movies.calendar.week.fri')}</span>
            </div>

            <div className="flex gap-1">
              {calendarWeeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={cn(
                        'h-3 w-3 rounded-[3px] ring-1 ring-black/5 dark:ring-white/5',
                        getHeatmapLevelClass(day.count)
                      )}
                      title={t('movies.calendar.tooltip', {
                        date: formatDateFromObject(day.date, locale),
                        count: day.count,
                      })}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500">
        <span>{t('movies.calendar.less')}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(
              'h-3 w-3 rounded-[3px] ring-1 ring-black/5 dark:ring-white/5',
              getHeatmapLevelClass(level)
            )}
          />
        ))}
        <span>{t('movies.calendar.more')}</span>
      </div>
    </section>
  )
}
