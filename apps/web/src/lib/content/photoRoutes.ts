export interface PhotoRoutePoint {
  latitude: number
  longitude: number
}

export interface PhotoRouteStop extends PhotoRoutePoint {
  id: string
  label?: string
  source: 'photo' | 'manual'
  startsAt?: string
  endsAt?: string
  photoCount?: number
}

export interface PhotoRouteDocument {
  $schema: string
  version: 1
  title: string
  animationDurationSeconds: number
  path: PhotoRoutePoint[]
  stops: PhotoRouteStop[]
  stats: {
    distanceKilometres: number
    pointCount: number
    stopCount: number
    startAt: string
    endAt: string
  } | null
  attribution: {
    map: string
    tiles: string
    data: string
  }
}

const routeFiles = import.meta.glob<unknown>(
  '@content/travel/routes/*.json',
  { import: 'default' }
)

function isCoordinate(value: unknown): value is PhotoRoutePoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Record<string, unknown>
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180
  )
}

function isPhotoRouteDocument(value: unknown): value is PhotoRouteDocument {
  if (!value || typeof value !== 'object') return false
  const route = value as Record<string, unknown>
  if (
    route.version !== 1 ||
    typeof route.title !== 'string' ||
    typeof route.animationDurationSeconds !== 'number' ||
    route.animationDurationSeconds < 0.8 ||
    route.animationDurationSeconds > 3.5 ||
    !Array.isArray(route.path) ||
    route.path.length < 2 ||
    !route.path.every(isCoordinate) ||
    !Array.isArray(route.stops)
  ) {
    return false
  }

  return route.stops.every((value) => {
    if (!isCoordinate(value)) return false
    const stop = value as unknown as Record<string, unknown>
    return (
      typeof stop.id === 'string' &&
      (stop.source === 'photo' || stop.source === 'manual')
    )
  })
}

function routeKeyFromPath(path: string) {
  return path.split('/').pop()?.replace(/\.json$/i, '') ?? ''
}

export async function getPhotoRoute(
  routeKey: string
): Promise<PhotoRouteDocument | null> {
  const entry = Object.entries(routeFiles).find(
    ([path]) => routeKeyFromPath(path) === routeKey
  )
  if (!entry) return null

  const route = await entry[1]()
  return isPhotoRouteDocument(route) ? route : null
}
