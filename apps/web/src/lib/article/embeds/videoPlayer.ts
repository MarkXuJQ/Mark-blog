import type { ArticleEmbedDefinition } from './types'

type VideoSource = {
  provider: 'bilibili' | 'youtube'
  id: string
  page?: number
  start?: number
  url: string
}

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{6,32}$/

function parseVideoUrl(rawUrl: string): VideoSource | null {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host === 'bilibili.com' || host === 'm.bilibili.com') {
    const match = url.pathname.match(/^\/video\/(BV[a-zA-Z0-9]+|av\d+)\/?$/)
    if (!match) return null

    const id = match[1]
    const pageValue = Number.parseInt(url.searchParams.get('p') ?? '1', 10)
    return {
      provider: 'bilibili',
      id,
      page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
      url: `https://www.bilibili.com/video/${id}/`,
    }
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtu.be'
  ) {
    let id = ''
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    } else if (url.pathname === '/watch') {
      id = url.searchParams.get('v') ?? ''
    } else {
      id = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? ''
    }

    if (!VIDEO_ID_PATTERN.test(id)) return null
    const startValue = Number.parseInt(
      url.searchParams.get('start') ?? url.searchParams.get('t') ?? '0',
      10
    )

    return {
      provider: 'youtube',
      id,
      start: Number.isFinite(startValue) && startValue > 0 ? startValue : 0,
      url: `https://www.youtube.com/watch?v=${id}`,
    }
  }

  return null
}

function textElement(
  document: Document,
  tagName: string,
  className: string,
  text: string
) {
  const element = document.createElement(tagName)
  element.className = className
  element.textContent = text
  return element
}

export const videoPlayerEmbed: ArticleEmbedDefinition = {
  name: 'VideoEmbed',
  selector: 'videoembed, video-embed',
  render({ document, source, context }) {
    const video = parseVideoUrl(source.getAttribute('url')?.trim() ?? '')
    if (!video) return null

    const isZh = context.language?.toLowerCase().startsWith('zh')
    const providerName = video.provider === 'bilibili' ? 'Bilibili' : 'YouTube'
    const title =
      source.getAttribute('title')?.trim() ||
      (isZh ? `${providerName} 视频` : `${providerName} video`)

    const figure = document.createElement('figure')
    figure.className = 'article-video-player not-prose'
    figure.dataset.articleEmbed = 'video-player'
    figure.dataset.linkPreview = 'off'

    const frame = document.createElement('iframe')
    frame.className = 'article-video-player__frame'
    frame.loading = 'lazy'
    frame.title = title
    frame.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    frame.allowFullscreen = true
    frame.referrerPolicy = 'strict-origin-when-cross-origin'
    if (video.provider === 'bilibili') {
      const params = new URLSearchParams({
        bvid: video.id,
        page: String(video.page),
      })
      frame.src = `https://player.bilibili.com/player.html?${params.toString()}&danmaku=0`
    } else {
      const params = new URLSearchParams({
        autoplay: '0',
        start: String(video.start),
        rel: '0',
      })
      frame.src = `https://www.youtube-nocookie.com/embed/${video.id}?${params.toString()}`
    }

    const caption = document.createElement('figcaption')
    caption.className = 'article-video-player__caption'
    caption.append(
      textElement(document, 'span', 'article-video-player__title', title)
    )

    const link = document.createElement('a')
    link.className = 'article-video-player__link'
    link.href = video.url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = isZh
      ? `在 ${providerName} 打开`
      : `Open on ${providerName}`
    link.setAttribute('aria-label', `${link.textContent}: ${title}`)
    caption.append(link)
    figure.append(frame, caption)
    return figure
  },
}
