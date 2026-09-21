import { useEffect, useState } from 'react'
import { fetchTmdbEnrichment } from '@/lib/movies/tmdb'
import type { CsvMovieItem, TmdbEnrichedMovie } from '@/lib/movies/movieTypes'

type TmdbMap = Record<string, TmdbEnrichedMovie | null>

export function useTmdbEnrichment(
  movies: CsvMovieItem[],
  language: string,
  enabled = true
) {
  const [tmdbMap, setTmdbMap] = useState<TmdbMap>({})

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || window.__PRERENDER__) {
      return
    }

    const targets = movies
      .filter((movie) => !(movie.id in tmdbMap))
      .slice(0, 12)
    if (targets.length === 0) return

    let cancelled = false

    Promise.allSettled(
      targets.map(async (movie) => ({
        movieId: movie.id,
        enriched: await fetchTmdbEnrichment({ movie, language }),
      }))
    ).then((results) => {
      if (cancelled) return
      const entries = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : []
      )
      setTmdbMap((current) => ({
        ...current,
        ...Object.fromEntries(
          entries.map(({ movieId, enriched }) => [movieId, enriched])
        ),
        ...Object.fromEntries(
          results.flatMap((result, index) =>
            result.status === 'rejected' ? [[targets[index].id, null]] : []
          )
        ),
      }))
    })

    return () => {
      cancelled = true
    }
  }, [enabled, language, movies, tmdbMap])

  return tmdbMap
}
