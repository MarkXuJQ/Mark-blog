import rawPhotoRouteSummaries from '@/data/photo-route-summaries.json'

export interface PhotoRouteSummary {
  title: string
  stats: {
    distanceKilometres: number
    pointCount: number
    stopCount: number
    startAt: string
    endAt: string
  }
}

const photoRouteSummaries = rawPhotoRouteSummaries as Record<
  string,
  PhotoRouteSummary
>

export function getPhotoRouteSummary(routeKey: string) {
  return photoRouteSummaries[routeKey]
}

export function formatPhotoRouteCaption(
  route: PhotoRouteSummary,
  language?: string
) {
  const isZh = language?.toLowerCase().startsWith('zh')
  const date = new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(route.stats.startAt))

  return [
    date,
    `${route.stats.distanceKilometres.toFixed(1)} km`,
    `${route.stats.pointCount} pts`,
    `${route.stats.stopCount} stops`,
  ].join(' · ')
}
