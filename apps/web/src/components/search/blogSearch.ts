import type { BlogPost } from '../../types'

export type BlogSearchDoc = {
  post: BlogPost
  contentText: string
  haystack: string
}

export type BlogSearchHit = {
  post: BlogPost
  matchIndex: number
  snippetHtml: string
}

export function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function htmlToText(html: string) {
  if (!html) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

export function buildBlogSearchDocs(posts: BlogPost[]): BlogSearchDoc[] {
  return posts.map((post) => {
    const contentText = htmlToText(post.content)
    const tags = post.tags?.join(' ') || ''
    const category = post.category || ''
    const haystack = `${post.title} ${post.summary} ${tags} ${category} ${contentText}`
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    return { post, contentText, haystack }
  })
}

export function findAllOccurrences(text: string, query: string, limit = 50) {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const indices: number[] = []
  if (!q) return indices

  let from = 0
  while (indices.length < limit) {
    const idx = t.indexOf(q, from)
    if (idx === -1) break
    indices.push(idx)
    from = idx + Math.max(1, q.length)
  }

  return indices
}

export function buildSnippetHtml(
  text: string,
  matchStart: number,
  query: string,
  context = 48
) {
  const q = query
  const start = Math.max(0, matchStart - context)
  const end = Math.min(text.length, matchStart + q.length + context)
  const prefix = text.slice(start, matchStart)
  const match = text.slice(matchStart, matchStart + q.length)
  const suffix = text.slice(matchStart + q.length, end)

  const leftEllipsis = start > 0 ? '…' : ''
  const rightEllipsis = end < text.length ? '…' : ''

  return (
    `${leftEllipsis}${escapeHtml(prefix)}` +
    `<mark class="rounded bg-yellow-200/80 px-0.5 text-slate-900 dark:bg-yellow-300/70">${escapeHtml(
      match
    )}</mark>` +
    `${escapeHtml(suffix)}${rightEllipsis}`
  )
}

export function searchBlogDocs(
  docs: BlogSearchDoc[],
  query: string,
  maxHits = 20,
  maxHitsPerPost = 3
): BlogSearchHit[] {
  const q = normalizeQuery(query)
  if (!q) return []

  const hits: BlogSearchHit[] = []

  for (const doc of docs) {
    if (!doc.haystack.includes(q)) continue

    const occurrences = findAllOccurrences(doc.contentText, q, maxHitsPerPost)
    if (occurrences.length === 0) {
      const inTitle = doc.post.title.toLowerCase().includes(q)
      const inSummary = doc.post.summary?.toLowerCase().includes(q)
      if (!inTitle && !inSummary) continue

      const baseText = inSummary ? doc.post.summary : doc.post.title
      const baseLower = baseText.toLowerCase()
      const idx = baseLower.indexOf(q)
      if (idx < 0) continue
      hits.push({
        post: doc.post,
        matchIndex: 0,
        snippetHtml: buildSnippetHtml(baseText, idx, q, 36),
      })
      if (hits.length >= maxHits) break
      continue
    }

    for (let i = 0; i < occurrences.length; i++) {
      hits.push({
        post: doc.post,
        matchIndex: i,
        snippetHtml: buildSnippetHtml(doc.contentText, occurrences[i]!, q),
      })
      if (hits.length >= maxHits) break
    }

    if (hits.length >= maxHits) break
  }

  return hits
}

