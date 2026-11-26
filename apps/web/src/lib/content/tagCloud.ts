import type { BlogPostSummary } from '@/lib/content/posts'

export interface TagCloudItem {
  key: string
  label: string
  count: number
  /** 1 (rarest) … MAX_LEVELS (most frequent). */
  level: number
}

export const MAX_TAG_CLOUD_LEVELS = 5
export const MAX_TAG_CLOUD_TAGS = 30

/**
 * Distinct counts whose gap is at most this fraction of the higher count are
 * considered "roughly the same" and share a level (e.g. 9 and 10, but not 6
 * and 10). Forced merging still happens when there are more than five bands.
 */
const CLOSE_COUNT_RATIO = 0.18

function getTagKey(tag: string) {
  return tag.trim().toLowerCase()
}

function relativeGap(higher: number[], lower: number[]) {
  const high = higher[0]
  const low = lower[lower.length - 1]
  return high <= 0 ? 0 : (high - low) / high
}

function groupCounts(counts: number[]): Map<number, number> {
  const groups = Array.from(new Set(counts))
    .sort((a, b) => b - a)
    .map((count) => [count])

  // Cap the number of bands first by repeatedly merging the closest pair.
  while (groups.length > MAX_TAG_CLOUD_LEVELS) {
    let bestIndex = 0
    let bestGap = Number.POSITIVE_INFINITY
    for (let index = 0; index < groups.length - 1; index += 1) {
      const gap = relativeGap(groups[index], groups[index + 1])
      if (gap < bestGap) {
        bestGap = gap
        bestIndex = index
      }
    }
    groups.splice(bestIndex, 2, [...groups[bestIndex], ...groups[bestIndex + 1]])
  }

  // Then merge neighbouring bands whose counts are close enough.
  let merged = true
  while (merged && groups.length > 1) {
    merged = false
    for (let index = 0; index < groups.length - 1; index += 1) {
      if (relativeGap(groups[index], groups[index + 1]) <= CLOSE_COUNT_RATIO) {
        groups.splice(
          index,
          2,
          [...groups[index], ...groups[index + 1]]
        )
        merged = true
        break
      }
    }
  }

  const levelByCount = new Map<number, number>()
  groups.forEach((group, index) => {
    const level = groups.length - index
    group.forEach((count) => levelByCount.set(count, level))
  })
  return levelByCount
}

export function buildTagCloud(posts: BlogPostSummary[]): TagCloudItem[] {
  const tags = new Map<
    string,
    { key: string; label: string; count: number }
  >()

  for (const post of posts) {
    for (const rawTag of post.tags ?? []) {
      const label = rawTag.trim()
      if (!label) continue
      const key = getTagKey(label)
      const existing = tags.get(key)
      if (existing) {
        existing.count += 1
      } else {
        tags.set(key, { key, label, count: 1 })
      }
    }
  }

  if (tags.size === 0) return []

  const levelByCount = groupCounts(
    Array.from(tags.values(), (tag) => tag.count)
  )

  return Array.from(tags.values())
    .map((tag) => ({
      ...tag,
      level: levelByCount.get(tag.count) ?? 1,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.label.localeCompare(b.label, undefined, {
          sensitivity: 'base',
        })
    )
}
