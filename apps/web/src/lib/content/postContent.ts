import type { BlogPost } from './posts'
import type { MarkdownPost } from './markdown'
import { getPostSummaryMatch } from './postSummaries'

type PostLoader = () => Promise<MarkdownPost>

const markdownLoaders = import.meta.glob<MarkdownPost>(
  ['@content/posts/*/chinese/*.md', '@content/posts/*/english/*.md'],
  { eager: false }
) as Record<string, PostLoader>

const postPromises = new Map<string, Promise<BlogPost | undefined>>()

function resolveFolder(path: string) {
  const folder = path.match(/\/posts\/[^/]+\/(chinese|english)\//)?.[1]
  return folder === 'chinese' || folder === 'english' ? folder : null
}

function findLoader(
  sourceSlug: string | undefined,
  language: 'zh' | 'en'
): [string, PostLoader] | undefined {
  if (!sourceSlug) return undefined
  const folder = language === 'zh' ? 'chinese' : 'english'
  const suffix = '/' + sourceSlug + '.md'
  return Object.entries(markdownLoaders).find(
    ([filePath]) => resolveFolder(filePath) === folder && filePath.endsWith(suffix)
  )
}

function getPromiseKey(slug: string, language?: string) {
  return (language?.toLowerCase().startsWith('zh') ? 'zh' : 'en') + ':' + slug
}

export function getPostContent(
  slug: string,
  language?: string
): Promise<BlogPost | undefined> {
  const match = getPostSummaryMatch(slug, language)
  if (!match || match.summary.movieSubjectId) {
    return Promise.resolve(undefined)
  }

  const key = getPromiseKey(match.summary.slug, match.language)
  const existing = postPromises.get(key)
  if (existing) return existing

  const promise = (async () => {
    const loaderEntry = findLoader(match.summary.sourceSlug, match.language)
    if (!loaderEntry) return undefined

    const [, loader] = loaderEntry
    const module = await loader()
    return {
      ...match.summary,
      content: module.html,
    }
  })()

  postPromises.set(key, promise)
  void promise.catch(() => {
    if (postPromises.get(key) === promise) postPromises.delete(key)
  })
  return promise
}

export async function preloadPostContent(
  slug: string,
  language?: string
): Promise<void> {
  await getPostContent(slug, language)
}
