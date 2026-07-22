export interface WebsiteCardInput {
  url: string
  title?: string
  description?: string
}

export interface WebsiteCardModel {
  url: string
  hostname: string
  title: string
  description?: string
}

export function resolveWebsiteCard(
  input: WebsiteCardInput
): WebsiteCardModel | null {
  try {
    const target = new URL(input.url)
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return null
    }

    const hostname = target.hostname.replace(/^www\./, '')
    return {
      url: target.href,
      hostname,
      title: input.title?.trim() || hostname,
      description: input.description?.trim() || undefined,
    }
  } catch {
    return null
  }
}

export function getWebsiteScreenshotUrl(url: string, width: number) {
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${width}`
}
