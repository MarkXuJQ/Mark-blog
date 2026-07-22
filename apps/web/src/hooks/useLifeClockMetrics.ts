import { useEffect, useState } from 'react'

export interface LifeClockMetrics {
  years: string
  days: string
  hours: string
}

export const BIRTH_TIMESTAMP = new Date('2004-06-07T21:00:00+08:00').getTime()

const SECOND = 1000
const HOUR = 60 * 60 * SECOND
const DAY = 24 * HOUR
const YEAR = 365.2425 * DAY

function areMetricsEqual(left: LifeClockMetrics, right: LifeClockMetrics) {
  return (
    left.years === right.years &&
    left.days === right.days &&
    left.hours === right.hours
  )
}

function getDelayUntilNextHour(now = Date.now()) {
  const hourRemainder = now % HOUR
  return Math.max(SECOND, HOUR - hourRemainder + 50)
}

export function getLifeClockMetrics(now = Date.now()): LifeClockMetrics {
  const diff = Math.max(0, now - BIRTH_TIMESTAMP)

  return {
    years: (diff / YEAR).toFixed(2),
    days: Math.floor(diff / DAY).toString(),
    hours: Math.floor(diff / HOUR).toString(),
  }
}

export function useLifeClockMetrics(): LifeClockMetrics {
  const [metrics, setMetrics] = useState(() => getLifeClockMetrics())

  useEffect(() => {
    let timeoutId: number | null = null

    const refreshMetrics = () => {
      const nextMetrics = getLifeClockMetrics()
      setMetrics((currentMetrics) =>
        areMetricsEqual(currentMetrics, nextMetrics)
          ? currentMetrics
          : nextMetrics
      )
    }

    const scheduleNextRefresh = () => {
      timeoutId = window.setTimeout(() => {
        refreshMetrics()
        scheduleNextRefresh()
      }, getDelayUntilNextHour())
    }

    const handleFocus = () => {
      refreshMetrics()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) refreshMetrics()
    }

    scheduleNextRefresh()
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return metrics
}
