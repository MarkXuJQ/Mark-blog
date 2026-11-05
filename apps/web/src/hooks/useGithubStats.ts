import { useEffect, useState } from 'react'
import type { GithubStats } from '@/lib/github/types'

type GithubStatsState = {
  data: GithubStats | null
  status: 'loading' | 'ready' | 'error'
  error?: string
}

export function useGithubStats() {
  const [state, setState] = useState<GithubStatsState>({
    data: null,
    status: 'loading',
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/github')
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(
            typeof payload?.error === 'string'
              ? payload.error
              : `GitHub HTTP ${response.status}`
          )
        }

        if (!cancelled) {
          setState({ data: payload as GithubStats, status: 'ready' })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}