import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarYearWheel } from './CalendarYearWheel'
import { cn } from '@/lib/classNames'

interface CalendarDayCell {
  date: Date
  dateKey: string
  count: number
  isCurrentYear: boolean
}

interface WatchActivityCalendarProps {
  watchDates: string[]
  locale: string
  selectedDateKey: string | null
  onSelectDateKey: (value: string | null) => void
}

interface CalendarLayout {
  chartGap: number
  cellSize: number
  legendSize: number
  monthLabelHeight: number
  monthLabelMinSpacing: number
  monthLabelTextClassName: string
  weekdayColumnWidth: number
  weekdayLabelTextClassName: string
  weekGap: number
  weekGridWidth: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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
  if (count <= 0) return 'bg-slate-100 dark:bg-[#23262c]'
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

function getCalendarLayout(
  containerWidth: number,
  weekCount: number
): CalendarLayout {
  const safeWeekCount = Math.max(weekCount, 1)
  const safeWidth = Math.max(containerWidth, 280)
  const weekdayColumnWidth =
    safeWidth < 360 ? 14 : safeWidth < 480 ? 18 : safeWidth < 960 ? 24 : 28
  const chartGap =
    safeWidth < 360 ? 4 : safeWidth < 480 ? 6 : safeWidth < 960 ? 8 : 10
  const preferredWeekGap =
    safeWidth < 340
      ? 0
      : safeWidth < 420
        ? 1
        : safeWidth < 560
          ? 2
          : safeWidth < 960
            ? 3
            : safeWidth < 1320
              ? 4
              : 5

  let weekGap = preferredWeekGap
  let cellSize = Math.floor(
    (safeWidth -
      weekdayColumnWidth -
      chartGap -
      (safeWeekCount - 1) * weekGap) /
      safeWeekCount
  )

  while (cellSize < 4 && weekGap > 0) {
    weekGap -= 1
    cellSize = Math.floor(
      (safeWidth -
        weekdayColumnWidth -
        chartGap -
        (safeWeekCount - 1) * weekGap) /
        safeWeekCount
    )
  }

  const maxCellSize =
    safeWidth < 480
      ? 12
      : safeWidth < 720
        ? 14
        : safeWidth < 960
          ? 16
          : safeWidth < 1200
            ? 18
            : safeWidth < 1500
              ? 22
              : 26

  cellSize = clamp(cellSize, 4, maxCellSize)

  return {
    chartGap,
    cellSize,
    legendSize: clamp(Math.round(cellSize * 0.78), 4, 14),
    monthLabelHeight: safeWidth < 360 ? 12 : safeWidth < 960 ? 16 : 18,
    monthLabelMinSpacing:
      safeWidth < 360
        ? 24
        : safeWidth < 480
          ? 30
          : safeWidth < 640
            ? 38
            : safeWidth < 960
              ? 46
              : safeWidth < 1320
                ? 56
                : 66,
    monthLabelTextClassName:
      safeWidth < 360
        ? 'text-[9px]'
        : safeWidth < 480
          ? 'text-[10px]'
          : safeWidth < 960
            ? 'text-[11px]'
            : 'text-xs',
    weekdayColumnWidth,
    weekdayLabelTextClassName:
      safeWidth < 360
        ? 'text-[9px]'
        : safeWidth < 960
          ? 'text-[10px]'
          : 'text-[11px]',
    weekGap,
    weekGridWidth: safeWeekCount * cellSize + (safeWeekCount - 1) * weekGap,
  }
}

export function WatchActivityCalendar({
  watchDates,
  locale,
  selectedDateKey,
  onSelectDateKey,
}: WatchActivityCalendarProps) {
  const { t } = useTranslation()
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  )
  const heatmapRef = useRef<HTMLDivElement | null>(null)
  const [heatmapWidth, setHeatmapWidth] = useState(0)

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
    const uniqueYears = new Set(
      parsedWatchDates.map((date) => date.getFullYear())
    )
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

  const calendarLayout = useMemo(
    () => getCalendarLayout(heatmapWidth, calendarWeeks.length),
    [calendarWeeks.length, heatmapWidth]
  )

  const visibleCalendarMonthLabels = useMemo(() => {
    let lastPlacedX = Number.NEGATIVE_INFINITY

    return calendarMonthLabels.filter((item) => {
      const currentX =
        item.weekIndex * (calendarLayout.cellSize + calendarLayout.weekGap)

      if (currentX - lastPlacedX < calendarLayout.monthLabelMinSpacing) {
        return false
      }

      lastPlacedX = currentX
      return true
    })
  }, [
    calendarLayout.cellSize,
    calendarLayout.monthLabelMinSpacing,
    calendarLayout.weekGap,
    calendarMonthLabels,
  ])

  const activeWatchDays = useMemo(
    () =>
      parsedWatchDates
        .filter((date) => date.getFullYear() === selectedYear)
        .reduce((days, date, _index, source) => {
          const key = toDateKey(date)
          return source.findIndex((item) => toDateKey(item) === key) === _index
            ? days + 1
            : days
        }, 0),
    [parsedWatchDates, selectedYear]
  )

  const watchedCount = useMemo(
    () =>
      parsedWatchDates.filter((date) => date.getFullYear() === selectedYear)
        .length,
    [parsedWatchDates, selectedYear]
  )

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return ''
    const parsed = new Date(`${selectedDateKey}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return selectedDateKey
    return formatDateFromObject(parsed, locale)
  }, [selectedDateKey, locale])

  useEffect(() => {
    if (window.__PRERENDER__) return

    const node = heatmapRef.current
    if (!node) return

    const updateWidth = () => {
      setHeatmapWidth(node.getBoundingClientRect().width)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <section className="mb-8 pb-6">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3">
        <div className="min-w-0 pr-1">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('movies.calendar.title')}
          </h2>
          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
            {t('movies.calendar.summary', {
              count: activeWatchDays,
              total: watchedCount,
              year: selectedYear,
            })}
          </p>
        </div>

        {years.length > 0 ? (
          <div className="justify-self-end">
            <CalendarYearWheel
              years={years}
              value={selectedYear}
              onValueChange={setSelectedYear}
              label={t('movies.calendar.year')}
              ariaLabel={t('movies.calendar.year')}
            />
          </div>
        ) : null}
      </div>

      {selectedDateKey ? (
        <div className="mb-4 flex items-center justify-between gap-4 border-t border-slate-200/80 pt-3 text-[11px] text-slate-500 dark:border-[#2b2f36] dark:text-slate-400">
          <span>{selectedDateLabel}</span>
          <button
            type="button"
            onClick={() => onSelectDateKey(null)}
            className="border-b border-transparent pb-0.5 font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
          >
            {t('movies.stats.clearFilter', '清除筛选')}
          </button>
        </div>
      ) : null}

      <div ref={heatmapRef} className="w-full">
        <div
          className="flex items-end"
          style={{ columnGap: `${calendarLayout.chartGap}px` }}
        >
          <div
            className="shrink-0"
            style={{ width: `${calendarLayout.weekdayColumnWidth}px` }}
          />

          <div
            className="relative"
            style={{
              height: `${calendarLayout.monthLabelHeight}px`,
              width: `${calendarLayout.weekGridWidth}px`,
            }}
          >
            {visibleCalendarMonthLabels.map((item) => (
              <span
                key={`${item.label}-${item.weekIndex}`}
                className={cn(
                  'absolute top-0 block leading-none font-medium whitespace-nowrap text-slate-500 dark:text-slate-400',
                  calendarLayout.monthLabelTextClassName
                )}
                style={{
                  left: `${item.weekIndex * (calendarLayout.cellSize + calendarLayout.weekGap)}px`,
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div
          className="mt-1 flex"
          style={{ columnGap: `${calendarLayout.chartGap}px` }}
        >
          <div
            className={cn(
              'grid shrink-0 grid-rows-7 text-slate-400 dark:text-slate-500',
              calendarLayout.weekdayLabelTextClassName
            )}
            style={{
              width: `${calendarLayout.weekdayColumnWidth}px`,
              gap: `${calendarLayout.weekGap}px`,
            }}
          >
            <span
              className="flex items-center overflow-hidden"
              style={{ height: `${calendarLayout.cellSize}px` }}
            >
              {t('movies.calendar.week.mon')}
            </span>
            <span style={{ height: `${calendarLayout.cellSize}px` }} />
            <span
              className="flex items-center overflow-hidden"
              style={{ height: `${calendarLayout.cellSize}px` }}
            >
              {t('movies.calendar.week.wed')}
            </span>
            <span style={{ height: `${calendarLayout.cellSize}px` }} />
            <span
              className="flex items-center overflow-hidden"
              style={{ height: `${calendarLayout.cellSize}px` }}
            >
              {t('movies.calendar.week.fri')}
            </span>
            <span style={{ height: `${calendarLayout.cellSize}px` }} />
            <span style={{ height: `${calendarLayout.cellSize}px` }} />
          </div>

          <div
            className="flex"
            style={{
              gap: `${calendarLayout.weekGap}px`,
              width: `${calendarLayout.weekGridWidth}px`,
            }}
          >
            {calendarWeeks.map((week, weekIndex) => (
              <div
                key={`week-${weekIndex}`}
                className="flex flex-col"
                style={{ gap: `${calendarLayout.weekGap}px` }}
              >
                {week.map((day) => {
                  const isInteractive = day.isCurrentYear && day.count > 0
                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      onClick={
                        isInteractive
                          ? () => onSelectDateKey(day.dateKey)
                          : undefined
                      }
                      className={cn(
                        'shrink-0 ring-1 ring-black/5 transition-transform duration-200 dark:ring-white/5',
                        isInteractive ? 'hover:scale-[1.12]' : '',
                        selectedDateKey === day.dateKey
                          ? 'ring-[1.5px] ring-emerald-400 dark:ring-emerald-500'
                          : '',
                        day.isCurrentYear
                          ? getHeatmapLevelClass(day.count)
                          : 'bg-transparent ring-transparent'
                      )}
                      style={{
                        width: `${calendarLayout.cellSize}px`,
                        height: `${calendarLayout.cellSize}px`,
                        borderRadius: `${Math.max(2, Math.round(calendarLayout.cellSize * 0.28))}px`,
                      }}
                      title={
                        day.isCurrentYear
                          ? t('movies.calendar.tooltip', {
                              date: formatDateFromObject(day.date, locale),
                              count: day.count,
                            })
                          : ''
                      }
                      disabled={!isInteractive}
                      aria-pressed={selectedDateKey === day.dateKey}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 text-[10px] text-slate-400 dark:text-slate-500">
        <span>{t('movies.calendar.less')}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(
              'ring-1 ring-black/5 dark:ring-white/5',
              getHeatmapLevelClass(level)
            )}
            style={{
              width: `${calendarLayout.legendSize}px`,
              height: `${calendarLayout.legendSize}px`,
              borderRadius: `${Math.max(2, Math.round(calendarLayout.legendSize * 0.28))}px`,
            }}
          />
        ))}
        <span>{t('movies.calendar.more')}</span>
      </div>
    </section>
  )
}
