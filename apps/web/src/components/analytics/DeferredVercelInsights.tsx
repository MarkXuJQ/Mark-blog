import { useEffect, useState, type ComponentType } from 'react'

declare global {
  interface Window {
    __PRERENDER__?: boolean
  }
}

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

const ANALYTICS_LOAD_TIMEOUT_MS = 3000

export function DeferredVercelInsights() {
  const [AnalyticsComponent, setAnalyticsComponent] = useState<ComponentType | null>(null)
  const [SpeedInsightsComponent, setSpeedInsightsComponent] =
    useState<ComponentType | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!import.meta.env.PROD) return
    if (window.__PRERENDER__) return

    let cancelled = false
    const idleWindow = window as IdleCapableWindow

    const loadInsights = async () => {
      const [analyticsModule, speedInsightsModule] = await Promise.all([
        import('@vercel/analytics/react'),
        import('@vercel/speed-insights/react'),
      ])

      if (cancelled) return
      setAnalyticsComponent(() => analyticsModule.Analytics)
      setSpeedInsightsComponent(() => speedInsightsModule.SpeedInsights)
    }

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => {
        void loadInsights()
      }, { timeout: ANALYTICS_LOAD_TIMEOUT_MS })

      return () => {
        cancelled = true
        if (idleWindow.cancelIdleCallback) {
          idleWindow.cancelIdleCallback(idleId)
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadInsights()
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  if (!AnalyticsComponent || !SpeedInsightsComponent) return null

  return (
    <>
      <AnalyticsComponent />
      <SpeedInsightsComponent />
    </>
  )
}
