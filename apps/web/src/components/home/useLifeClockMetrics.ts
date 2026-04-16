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

export function getLifeClockMetrics(now = Date.now()): LifeClockMetrics {
  const diff = Math.max(0, now - BIRTH_TIMESTAMP)

  return {
    years: (diff / YEAR).toFixed(2),
    days: Math.floor(diff / DAY).toString(),
    hours: Math.floor(diff / HOUR).toString(),
  }
}

export function useLifeClockMetrics(): LifeClockMetrics {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, SECOND)

    return () => window.clearInterval(timer)
  }, [])

  return getLifeClockMetrics(now)
}
