/**
 * Small shared responder for the API routes. Extra CDN headers are optional so
 * routes with different cache policies can reuse the same implementation.
 */
export function createJsonResponder(defaults = {}) {
  return function json(res, status, body, cacheControl = defaults.cacheControl ?? 'no-store') {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', cacheControl)
    if (defaults.cdnCacheControl) {
      res.setHeader('CDN-Cache-Control', defaults.cdnCacheControl)
    }
    if (defaults.vercelCacheControl) {
      res.setHeader('Vercel-CDN-Cache-Control', defaults.vercelCacheControl)
    }
    res.end(JSON.stringify(body))
  }
}
