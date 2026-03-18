import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

interface CalendarDayCell {
  date: Date
  dateKey: string
  count: number
  isCurrentYear: boolean
}

interface WatchActivityCalendarProps {
  watchDates: string[]
  locale: string
}

function getMondayDayIndex(date: Date) {
  return (date.getDay() + 6) % 7
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

function formatMonthLabel(date: Date, locale: string) {
  if (locale === 'zh-CN') {
    return [
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ][date.getMonth()]
  }

  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)
}

export function WatchActivityCalendar({
  watchDates,
  locale,
}: WatchActivityCalendarProps) {
  const { t } = useTranslation()
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const parsedWatchDates = useMemo(
    () =>
      watchDates
        .map((watchDate) => {
          const parsed = new Date(watchDate)
          return Number.isNaN(parsed.getTime()) ? null : parsed
        })
        .filter((date): date is Date => date !== null),
    [watchDates]
  )

  const years = useMemo(() => {
    const uniqueYears = new Set(parsedWatchDates.map((date) => date.getFullYear()))
    return Array.from(uniqueYears).sort((left, right) => right - left)
  }, [parsedWatchDates])

  useEffect(() => {
    if (years.length === 0) return
    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0])
    }
  }, [selectedYear, years])

  const watchCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const parsedDate of parsedWatchDates) {
      const key = toDateKey(parsedDate)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [parsedWatchDates])

  const calendarDays = useMemo<CalendarDayCell[]>(() => {
    const start = new Date(selectedYear, 0, 1)
    const end = new Date(selectedYear, 11, 31)
    const startOffset = getMondayDayIndex(start)
    const endOffset = 6 - getMondayDayIndex(end)

    start.setDate(start.getDate() - startOffset)
    end.setDate(end.getDate() + endOffset)

    const days: CalendarDayCell[] = []
    const cursor = new Date(start)

    while (cursor <= end) {
      const dateKey = toDateKey(cursor)
      days.push({
        date: new Date(cursor),
        dateKey,
        count: watchCountMap[dateKey] ?? 0,
        isCurrentYear: cursor.getFullYear() === selectedYear,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    return days
  }, [selectedYear, watchCountMap])

  const calendarWeeks = useMemo(() => {
    const weeks: CalendarDayCell[][] = []
    for (let index = 0; index < calendarDays.length; index += 7) {
      weeks.push(calendarDays.slice(index, index + 7))
    }
    return weeks
  }, [calendarDays])

  const calendarMonthLabels = useMemo(() => {
    let lastMonth = -1
    return calendarWeeks.flatMap((week, weekIndex) => {
      const labelDay = week.find((day) => day.isCurrentYear)
      if (!labelDay) return []
      const month = labelDay.date.getMonth()
      if (month === lastMonth) return []
      lastMonth = month
      return [
        {
          label: formatMonthLabel(labelDay.date, locale),
          weekIndex,
        },
      ]
    })
  }, [calendarWeeks, locale])

  const activeWatchDays = useMemo(
    () =>
      parsedWatchDates.filter((date) => date.getFullYear() === selectedYear).reduce(
        (days, date, _index, source) => {
          const key = toDateKey(date)
          return source.findIndex((item) => toDateKey(item) === key) === _index
            ? days + 1
            : days
        },
        0
      ),
    [parsedWatchDates, selectedYear]
  )

  const watchedCount = useMemo(
    () =>
      parsedWatchDates.filter((date) => date.getFullYear() === selectedYear).length,
    [parsedWatchDates, selectedYear]
  )

  return (
    <section className="mb-6 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('movies.calendar.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('movies.calendar.summary', {
              count: activeWatchDays,
              total: watchedCount,
              year: selectedYear,
            })}
          </p>
        </div>

        {years.length > 0 ? (
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
            <span className="text-slate-500 dark:text-slate-400">
              {t('movies.calendar.year')}
            </span>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="rounded-md bg-transparent font-medium text-slate-700 outline-none dark:text-slate-200"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex items-end gap-2">
            <div className="w-6 shrink-0" />

            <div className="relative h-4">
              <div className="flex gap-1 opacity-0">
                {calendarWeeks.map((_, index) => (
                  <span key={`month-slot-${index}`} className="block h-4 w-3 shrink-0" />
                ))}
              </div>

              {calendarMonthLabels.map((item) => (
                <span
                  key={`${item.label}-${item.weekIndex}`}
                  className="absolute top-0 block whitespace-nowrap text-[11px] font-medium leading-none text-slate-500 dark:text-slate-400"
                  style={{
                    left: `calc(${item.weekIndex} * 1rem)`,
                  }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="grid w-6 grid-rows-7 gap-1 py-[1px] text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex h-3 items-center">{t('movies.calendar.week.mon')}</span>
              <span className="h-3" />
              <span className="flex h-3 items-center">{t('movies.calendar.week.wed')}</span>
              <span className="h-3" />
              <span className="flex h-3 items-center">{t('movies.calendar.week.fri')}</span>
              <span className="h-3" />
              <span className="h-3" />
            </div>

            <div className="flex gap-1">
              {calendarWeeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={cn(
                        'h-3 w-3 rounded-[3px] ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.12] dark:ring-white/5',
                        day.isCurrentYear
                          ? getHeatmapLevelClass(day.count)
                          : 'bg-transparent ring-transparent'
                      )}
                      title={
                        day.isCurrentYear
                          ? t('movies.calendar.tooltip', {
                              date: formatDateFromObject(day.date, locale),
                              count: day.count,
                            })
                          : ''
                      }
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
