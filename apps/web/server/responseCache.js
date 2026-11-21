/**
 * TTL cache with in-flight deduplication. Used by API routes that fan out to
 * slow third-party endpoints, so concurrent requests share one upstream call.
 */
export function createResponseCache() {
  const values = new Map()
  const inflight = new Map()

  function get(key) {
    const entry = values.get(key)
    if (!entry) return { hit: false }

    if (entry.expiresAt > Date.now()) {
      return { hit: true, value: entry.value }
    }

    values.delete(key)
    return { hit: false }
  }

  async function getOrCreate({ key, ttlMs, fetcher }) {
    const cached = get(key)
    if (cached.hit) return cached.value

    const pending = inflight.get(key)
    if (pending) return pending

    const request = Promise.resolve()
      .then(fetcher)
      .then((value) => {
        values.set(key, { value, expiresAt: Date.now() + ttlMs })
        inflight.delete(key)
        return value
      })
      .catch((error) => {
        inflight.delete(key)
        throw error
      })

    inflight.set(key, request)
    return request
  }

  return { get, getOrCreate }
}
