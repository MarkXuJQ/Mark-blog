import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  Popup as MapLibrePopup,
} from 'maplibre-gl'
import {
  getPhotoRoute,
  type PhotoRoutePoint,
  type PhotoRouteStop,
} from '@/lib/content/photoRoutes'
import { formatPhotoRouteCaption } from '@/lib/content/photoRouteSummaries'

const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

function lineData(points: PhotoRoutePoint[], progress = 1) {
  if (points.length < 2 || progress <= 0) {
    return { type: 'FeatureCollection' as const, features: [] }
  }

  if (progress >= 1) {
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: points.map((point) => [point.longitude, point.latitude]),
        },
      }],
    }
  }

  const position = progress * (points.length - 1)
  const completedIndex = Math.floor(position)
  const segmentProgress = position - completedIndex
  const coordinates = points
    .slice(0, completedIndex + 1)
    .map((point) => [point.longitude, point.latitude])
  const current = points[completedIndex]
  const next = points[Math.min(completedIndex + 1, points.length - 1)]
  coordinates.push([
    current.longitude + (next.longitude - current.longitude) * segmentProgress,
    current.latitude + (next.latitude - current.latitude) * segmentProgress,
  ])

  return {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates },
    }],
  }
}

function stopData(stops: PhotoRouteStop[]) {
  return {
    type: 'FeatureCollection' as const,
    features: stops.map((stop, index) => ({
      type: 'Feature' as const,
      properties: { id: stop.id, index },
      geometry: {
        type: 'Point' as const,
        coordinates: [stop.longitude, stop.latitude],
      },
    })),
  }
}

function formatDuration(
  stop: PhotoRouteStop,
  isZh: boolean
): string | null {
  if (!stop.startsAt || !stop.endsAt) {
    return isZh ? '未记录停留时间' : 'No recorded duration'
  }
  const minutes = Math.max(
    0,
    Math.round((Date.parse(stop.endsAt) - Date.parse(stop.startsAt)) / 60_000)
  )
  if (minutes === 0) return null
  if (isZh) {
    if (minutes < 60) return `停留 ${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return remainder ? `停留 ${hours} 小时 ${remainder} 分钟` : `停留 ${hours} 小时`
  }
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`
}

function formatStart(stop: PhotoRouteStop, locale: string, isZh: boolean) {
  if (!stop.startsAt) return isZh ? '未记录开始时间' : 'No start time'
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(stop.startsAt))
}

type ActionIconName = 'copy' | 'apple' | 'google'

function appendPath(svg: SVGSVGElement, attributes: Record<string, string>) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  Object.entries(attributes).forEach(([name, value]) => path.setAttribute(name, value))
  svg.append(path)
}

function createActionIcon(name: ActionIconName) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')

  if (name === 'copy') {
    appendPath(svg, {
      d: 'M8 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
    })
    appendPath(svg, {
      d: 'M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
    })
    return svg
  }

  if (name === 'apple') {
    appendPath(svg, {
      d: 'M14.7 2.1c.1 1.5-1 2.8-2.5 3-.1-1.4 1.1-2.7 2.5-3Z',
      fill: 'currentColor',
    })
    appendPath(svg, {
      d: 'M17.4 12.4c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.1 1-3.9 1-.8 0-2-1-3.3-1-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.5 1.2 0 1.7-.8 3.2-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.5 1.5-3 1.5-3.1-.1 0-2.6-1-2.6-3.8Z',
      fill: 'currentColor',
    })
    return svg
  }

  appendPath(svg, {
    d: 'M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z',
    fill: '#4285f4',
  })
  appendPath(svg, {
    d: 'M12 22c2.7 0 4.96-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z',
    fill: '#34a853',
  })
  appendPath(svg, {
    d: 'M6.4 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.32-1.93V7.45H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.55l3.35-2.62Z',
    fill: '#fbbc05',
  })
  appendPath(svg, {
    d: 'M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.45l3.35 2.62C7.19 7.7 9.4 5.94 12 5.94Z',
    fill: '#ea4335',
  })
  return svg
}

function createAction(
  label: string,
  icon: ActionIconName,
  href?: string
): HTMLButtonElement | HTMLAnchorElement {
  const element = href ? document.createElement('a') : document.createElement('button')
  element.className = 'article-photo-route-popup__action'
  if (element instanceof HTMLAnchorElement) {
    element.href = href ?? '#'
    element.target = '_blank'
    element.rel = 'noopener noreferrer'
  } else {
    element.type = 'button'
  }
  const text = document.createElement('span')
  text.textContent = label
  element.append(createActionIcon(icon), text)
  return element
}

function createPopupContent(
  stop: PhotoRouteStop,
  index: number,
  locale: string,
  isZh: boolean
) {
  const container = document.createElement('div')
  container.className = 'article-photo-route-popup'
  const title = document.createElement('span')
  title.className = 'article-photo-route-popup__title'
  title.textContent = stop.label?.trim() || `${isZh ? '停留点' : 'Stop'} ${String(index + 1).padStart(2, '0')}`
  const meta = document.createElement('div')
  meta.className = 'article-photo-route-popup__meta'
  const appendMetaLine = (text: string | null) => {
    if (!text) return
    const line = document.createElement('span')
    line.className = 'article-photo-route-popup__meta-line'
    line.textContent = text
    meta.append(line)
  }
  if (stop.startsAt) {
    const startsAt = formatStart(stop, locale, isZh)
    const duration = formatDuration(stop, isZh)
    const startLabel = isZh
      ? `${startsAt} 开始记录`
      : `Starts at ${startsAt}`
    appendMetaLine(duration)
    appendMetaLine(startLabel)
  } else {
    appendMetaLine(formatDuration(stop, isZh))
    appendMetaLine(formatStart(stop, locale, isZh))
  }
  const coordinateText = `${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}`
  const coordinates = document.createElement('span')
  coordinates.className = 'article-photo-route-popup__coordinates'
  coordinates.textContent = coordinateText

  const actions = document.createElement('div')
  actions.className = 'article-photo-route-popup__actions'
  const copy = createAction(isZh ? '复制' : 'Copy', 'copy')
  copy.addEventListener('click', () => {
    void navigator.clipboard?.writeText(coordinateText)
  })
  const query = encodeURIComponent(stop.label?.trim() || coordinateText)
  actions.append(
    copy,
    createAction(
      'Apple Maps',
      'apple',
      `https://maps.apple.com/?ll=${stop.latitude},${stop.longitude}&q=${query}`
    ),
    createAction(
      'Google Maps',
      'google',
      `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`
    )
  )
  container.append(title, meta, coordinates, actions)
  return container
}

function setError(figure: HTMLElement, message: string) {
  figure.dataset.photoRouteStatus = 'error'
  const map = figure.querySelector<HTMLElement>('[data-photo-route-map]')
  if (map) {
    map.replaceChildren()
    const error = document.createElement('span')
    error.className = 'article-photo-route__loading'
    error.textContent = message
    map.append(error)
  }
}

export async function mountArticlePhotoRoute(figure: HTMLElement) {
  const routeKey = figure.dataset.articlePhotoRoute ?? ''
  const route = await getPhotoRoute(routeKey)
  const routeLanguage = figure.dataset.photoRouteLanguage
  const isZh = routeLanguage
    ? routeLanguage === 'zh'
    : document.documentElement.lang.toLowerCase().startsWith('zh')
  const locale = isZh ? 'zh-CN' : 'en-US'
  if (!route) {
    setError(figure, isZh ? '路线数据不存在或格式无效' : 'Route data is missing or invalid')
    return () => undefined
  }

  const mapContainer = figure.querySelector<HTMLElement>('[data-photo-route-map]')
  const title = figure.querySelector<HTMLElement>('.article-photo-route__title')
  const meta = figure.querySelector<HTMLElement>('.article-photo-route__meta')
  const playButton = figure.querySelector<HTMLButtonElement>('.article-photo-route__play')
  if (!mapContainer || !title || !meta || !playButton) return () => undefined

  if (figure.dataset.photoRouteTitleOverride !== 'true') {
    title.textContent = route.title
    figure.setAttribute('aria-label', route.title)
  }
  if (route.stats) {
    meta.textContent = formatPhotoRouteCaption(
      { title: route.title, stats: route.stats },
      routeLanguage
    )
  } else {
    meta.textContent = `${route.path.length} pts · ${route.stops.length} stops`
  }
  figure.dataset.photoRouteStatus = 'prepared'

  const loading = mapContainer.querySelector<HTMLElement>(
    '.article-photo-route__loading'
  )
  if (loading) {
    loading.textContent = isZh ? '正在加载路线地图' : 'Loading route map'
  }

  const [{ default: maplibregl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl.css'),
    import('@/assets/styles/article-photo-route.css'),
  ])
  mapContainer.replaceChildren()
  figure.dataset.photoRouteStatus = 'loading'

  const firstPoint = route.path[0]
  let popup: MapLibrePopup | null = null
  let animationFrame = 0
  let autoPlayObserver: IntersectionObserver | null = null
  let hasPlayed = false
  let disposed = false
  const map: MapLibreMap = new maplibregl.Map({
    container: mapContainer,
    style: OPEN_FREE_MAP_STYLE,
    center: [firstPoint.longitude, firstPoint.latitude],
    zoom: 13,
    cooperativeGestures: true,
    attributionControl: { compact: true },
  })

  const setProgress = (progress: number) => {
    const source = map.getSource('article-route-progress') as GeoJSONSource | undefined
    source?.setData(lineData(route.path, progress))
  }

  const handlePlay = () => {
    hasPlayed = true
    window.cancelAnimationFrame(animationFrame)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      playButton.disabled = false
      playButton.textContent = isZh ? '重新播放' : 'Replay route'
      return
    }
    const startedAt = performance.now()
    playButton.disabled = true
    playButton.textContent = isZh ? '播放中' : 'Playing'
    setProgress(0)
    const render = (now: number) => {
      if (disposed) return
      const progress = Math.min(
        1,
        (now - startedAt) / (route.animationDurationSeconds * 1000)
      )
      setProgress(progress)
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(render)
      } else {
        playButton.disabled = false
        playButton.textContent = isZh ? '重新播放' : 'Replay route'
      }
    }
    animationFrame = window.requestAnimationFrame(render)
  }

  map.once('load', () => {
    if (disposed) return
    map.addSource('article-route-track', {
      type: 'geojson',
      data: lineData(route.path),
    })
    map.addSource('article-route-progress', {
      type: 'geojson',
      data: lineData(route.path, 0),
    })
    map.addSource('article-route-stops', {
      type: 'geojson',
      data: stopData(route.stops),
    })
    map.addLayer({
      id: 'article-route-track-shadow',
      type: 'line',
      source: 'article-route-track',
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.9,
        'line-width': 9,
        'line-blur': 1,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    map.addLayer({
      id: 'article-route-track-line',
      type: 'line',
      source: 'article-route-track',
      paint: {
        'line-color': '#c85b73',
        'line-opacity': 0.24,
        'line-width': 5,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    map.addLayer({
      id: 'article-route-progress-line',
      type: 'line',
      source: 'article-route-progress',
      paint: {
        'line-color': '#c84f6c',
        'line-opacity': 0.96,
        'line-width': 5,
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
    map.addLayer({
      id: 'article-route-stops',
      type: 'circle',
      source: 'article-route-stops',
      paint: {
        'circle-color': '#c84f6c',
        'circle-radius': 6,
        'circle-opacity': 1,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.5,
      },
    })

    const bounds = new maplibregl.LngLatBounds()
    route.path.forEach((point) => bounds.extend([point.longitude, point.latitude]))
    map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 })

    const updateProjectedStops = () => {
      figure.dataset.photoRouteStopPoints = JSON.stringify(
        route.stops.map((stop) => {
          const point = map.project([stop.longitude, stop.latitude])
          return [point.x, point.y]
        })
      )
    }
    updateProjectedStops()
    map.once('idle', updateProjectedStops)
    map.on('moveend', updateProjectedStops)

    map.on('click', 'article-route-stops', (event: MapLayerMouseEvent) => {
      const index = Number(event.features?.[0]?.properties?.index)
      const stop = route.stops[index]
      if (!stop) return
      popup?.remove()
      popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 15,
        maxWidth: '280px',
        className: 'article-photo-route-map-popup',
      })
        .setLngLat([stop.longitude, stop.latitude])
        .setDOMContent(createPopupContent(stop, index, locale, isZh))
        .addTo(map)
    })
    map.on('mouseenter', 'article-route-stops', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'article-route-stops', () => {
      map.getCanvas().style.cursor = ''
    })
    playButton.disabled = false
    playButton.addEventListener('click', handlePlay)
    figure.dataset.photoRouteStatus = 'ready'

    const autoPlay = () => {
      if (hasPlayed || disposed) return
      figure.dataset.photoRouteAutoPlayed = 'true'
      handlePlay()
    }
    if ('IntersectionObserver' in window) {
      autoPlayObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          autoPlayObserver?.disconnect()
          autoPlayObserver = null
          autoPlay()
        },
        { threshold: 0.2 }
      )
      autoPlayObserver.observe(figure)
    } else {
      autoPlay()
    }
  })

  map.on('error', () => {
    if (!disposed && !map.loaded()) {
      figure.dataset.photoRouteStatus = 'error'
    }
  })

  return () => {
    disposed = true
    window.cancelAnimationFrame(animationFrame)
    autoPlayObserver?.disconnect()
    playButton.removeEventListener('click', handlePlay)
    popup?.remove()
    map.remove()
  }
}
