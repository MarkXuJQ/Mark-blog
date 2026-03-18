const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const DEFAULT_LANGUAGE = 'en-US'
const LANGUAGE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/

class TmdbHttpError extends Error {
  constructor(status) {
    super(`TMDB HTTP ${status}`)
    this.name = 'TmdbHttpError'
    this.status = status
  }
}

function normalizeTmdbToken(token) {
  return token.replace(/^Bearer\s+/i, '').trim()
}

function parseLanguage(input) {
  const value = (input || '').trim()
  if (!value) return DEFAULT_LANGUAGE
  if (LANGUAGE_PATTERN.test(value)) return value
  return DEFAULT_LANGUAGE
}

function getTmdbAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
  }
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function buildTmdbRequest(searchParams) {
  const action = (searchParams.get('action') || '').trim()
  const language = parseLanguage(searchParams.get('language'))

  if (action === 'movieById') {
    const rawMovieId = (searchParams.get('movieId') || '').trim()
    const movieId = Number.parseInt(rawMovieId, 10)
    if (!Number.isFinite(movieId) || movieId <= 0) {
      throw new Error('Invalid movieId')
    }

    return {
      endpoint: `movie/${movieId}`,
      params: { language },
    }
  }

  if (action === 'searchMovie') {
    const query = (searchParams.get('query') || '').trim()
    if (!query) {
      throw new Error('Missing query')
    }

    if (query.length > 160) {
      throw new Error('Query too long')
    }

    return {
      endpoint: 'search/movie',
      params: {
        query,
        include_adult: 'false',
        language,
        page: '1',
      },
    }
  }

  throw new Error('Invalid action')
}

async function fetchTmdbWithFallback(options) {
  const { endpoint, params, token, apiKey } = options
  const cleanedToken = normalizeTmdbToken(token)

  const attempts = []

  if (cleanedToken) {
    const search = new URLSearchParams(params)
    attempts.push({
      url: `${TMDB_BASE_URL}/${endpoint}?${search.toString()}`,
      headers: getTmdbAuthHeaders(cleanedToken),
    })
  }

  if (apiKey) {
    const search = new URLSearchParams(params)
    search.set('api_key', apiKey)
    attempts.push({
      url: `${TMDB_BASE_URL}/${endpoint}?${search.toString()}`,
    })
  }

  let lastError = null

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index]
    const hasMoreAttempts = index < attempts.length - 1

    try {
      const response = await fetch(attempt.url, {
        headers: attempt.headers,
      })

      if (response.ok) {
        return await response.json()
      }

      const isAuthError = response.status === 401 || response.status === 403
      if (isAuthError && hasMoreAttempts) {
        lastError = new TmdbHttpError(response.status)
        continue
      }

      throw new TmdbHttpError(response.status)
    } catch (error) {
      if (error instanceof TmdbHttpError) {
        lastError = error
        if ((error.status === 401 || error.status === 403) && hasMoreAttempts) {
          continue
        }
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError ?? new Error('TMDB request failed')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, {
      code: 'METHOD_NOT_ALLOWED',
      error: 'Only GET is supported',
    })
  }

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const token = normalizeTmdbToken(
    (process.env.TMDB_API_TOKEN || process.env.VITE_TMDB_API_TOKEN || '').trim()
  )
  const apiKey = (process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '').trim()

  if (!token && !apiKey) {
    return json(res, 500, {
      code: 'TMDB_MISSING_CONFIG',
      error: 'TMDB server credentials are missing',
    })
  }

  let request
  try {
    request = buildTmdbRequest(requestUrl.searchParams)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json(res, 400, {
      code: 'TMDB_BAD_REQUEST',
      error: message,
    })
  }

  try {
    const payload = await fetchTmdbWithFallback({
      ...request,
      token,
      apiKey,
    })
    return json(res, 200, payload)
  } catch (error) {
    if (error instanceof TmdbHttpError) {
      const status = error.status
      const code = status === 401 || status === 403 ? 'TMDB_AUTH_FAILED' : 'TMDB_HTTP_ERROR'
      return json(res, status, {
        code,
        error: error.message,
      })
    }

    return json(res, 502, {
      code: 'TMDB_NETWORK_ERROR',
      error: 'TMDB request failed',
    })
  }
}
