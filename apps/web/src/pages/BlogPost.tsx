import { memo, useEffect, useMemo } from 'react'
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, FileText } from 'lucide-react'
import { CategoryLabel } from '@/components/blog/CategoryLabel'
import { Copyright } from '@/components/blog/Copyright'
import { PostNavigation } from '@/components/blog/PostNavigation'
import { DeferredComments } from '@/components/comments/DeferredComments'
import {
  applySearchHighlights,
  clearSearchHighlights,
} from '@/components/search/domHighlight'
import { Seo } from '@/components/seo/Seo'
import {
  DEFAULT_IMAGE,
  buildBreadcrumbSchema,
  extractFirstImageFromHtml,
  getSiteUrl,
  toAbsoluteUrl,
  toIsoDateTime,
  type JsonLd,
} from '@/components/seo/shared'
import { Card } from '@/components/ui/Card'
import { useCodeBlockEnhancements } from '@/hooks/useCodeBlockEnhancements'
import { useImageLightbox } from '@/hooks/useImageLightbox'
import {
  decorateArticleLinkPreviews,
  decorateArticleReferences,
} from '@/lib/article'
import {
  getAdjacentPosts,
  getPostBySlug,
  getSharedPostCommentPath,
} from '@/lib/content'
import { countWords } from '@/utils/readingTime'
import { cn } from '@/lib/utils'
import { getImageUrl, getOptimizedImageUrl, rewriteHtmlImageSrc } from '@/utils/image'
import type { BlogPostOutletContext } from '@/layouts/BlogPostLayout'

export function BlogPost() {
  const { slug } = useParams()
  const { simpleMode = false } = useOutletContext<BlogPostOutletContext>()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const post = slug ? getPostBySlug(slug, i18n.language) : undefined
  const adjacentPosts = slug
    ? getAdjacentPosts(slug, i18n.language)
    : { prev: undefined, next: undefined }

  const contentHtml = useMemo(() => {
    if (!post) {
      return ''
    }

    return decorateArticleLinkPreviews(
      decorateArticleReferences(
        rewriteHtmlImageSrc(post.content),
        i18n.language
      ),
      i18n.language
    )
  }, [i18n.language, post])
  const contentRef = useImageLightbox([contentHtml, simpleMode])
  useCodeBlockEnhancements(
    contentRef,
    {
      copy: t('codeBlock.copy'),
      copied: t('codeBlock.copied'),
      collapse: t('codeBlock.collapse'),
      expand: t('codeBlock.expand'),
      plainText: t('codeBlock.plainText'),
      scroll: t('codeBlock.scroll'),
      wrap: t('codeBlock.wrap'),
    },
    `${contentHtml}:${simpleMode ? 'simple' : 'rich'}`
  )
  const highlightQuery = searchParams.get('q') || ''
  const highlightIndexRaw = searchParams.get('i') || '0'

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const q = highlightQuery.trim()
    if (!q) {
      clearSearchHighlights(container)
      return
    }

    const highlights = applySearchHighlights(container, q)
    if (highlights.length === 0) return

    const parsed = Number.parseInt(highlightIndexRaw, 10)
    const idx = Number.isFinite(parsed) ? parsed : 0
    const target = highlights[Math.min(Math.max(0, idx), highlights.length - 1)]
    if (!target) return

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [contentHtml, contentRef, highlightIndexRaw, highlightQuery])

  useEffect(() => {
    if (slug && !post) {
      navigate('/blog', { replace: true })
    }
  }, [navigate, post, slug])

  useEffect(() => {
    if (!slug) return
    // Ensure navigation lands at the top of the next/prev post.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [slug])

  if (!post) {
    return (
      <div className="mx-auto max-w-4xl">
        <Seo title="Post Not Found" noindex />
        <Card>
          <div className={styles.notFoundContainer}>
            <h1 className={styles.notFoundTitle}>Post not found</h1>
            <Link to="/blog" className={styles.notFoundLink}>
              {t('blog.back')}
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const words = countWords(post.content)
  const originalCoverImage = post.image ? getImageUrl(post.image) : ''
  const coverImage = originalCoverImage
    ? getOptimizedImageUrl(originalCoverImage, 'cover')
    : ''
  const hasCoverImage = Boolean(coverImage)
  const siteUrl = getSiteUrl()
  const blogUrl = toAbsoluteUrl('/blog', siteUrl)
  const encodedSlug = encodeURIComponent(post.slug)
  const postPath = `/blog/${encodedSlug}`
  const postUrl = toAbsoluteUrl(postPath, siteUrl)
  const commentPath = getSharedPostCommentPath(post)
  const imageSource =
    originalCoverImage || extractFirstImageFromHtml(post.content) || DEFAULT_IMAGE
  const postImageUrl = toAbsoluteUrl(imageSource, siteUrl)
  const publishedAt = toIsoDateTime(post.date)
  const modifiedAt = toIsoDateTime(post.updated || post.date)
  const schemaLanguage = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en-US'
  const blogPostingSchema: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    inLanguage: schemaLanguage,
    url: postUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    image: [postImageUrl],
    datePublished: publishedAt,
    dateModified: modifiedAt,
    articleSection: post.category,
    keywords: post.tags,
    author: {
      '@type': 'Person',
      name: 'Mark Xu',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: t('siteTitle'),
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteUrl('/images/logo.png', siteUrl),
      },
    },
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t('nav.homepage'), url: siteUrl },
    { name: t('nav.blog'), url: blogUrl },
    { name: post.title, url: postUrl },
  ])

  if (simpleMode) {
    return (
      <article className={styles.simpleReadingArticle}>
        <Seo
          title={post.title}
          description={post.summary}
          keywords={post.tags?.join(', ')}
          image={imageSource}
          url={postPath}
          type="article"
          publishedTime={publishedAt}
          modifiedTime={modifiedAt}
          jsonLd={[blogPostingSchema, breadcrumbSchema]}
        />

        <Link to="/blog" className={styles.simpleReadingBackLink}>
          {'< '}
          {t('blog.back')}
        </Link>

        <header className={styles.simpleReadingHeader}>
          <h1 className={styles.simpleReadingTitle}>{post.title}</h1>
          {post.summary ? (
            <p className={styles.simpleReadingSummary}>{post.summary}</p>
          ) : null}
        </header>

        <MarkdownContent
          key={`simple-${post.slug}`}
          ref={contentRef}
          html={contentHtml}
        />
      </article>
    )
  }

  return (
    <div className="mx-auto w-full space-y-8">
      <Seo
        title={post.title}
        description={post.summary}
        keywords={post.tags?.join(', ')}
        image={imageSource}
        url={postPath}
        type="article"
        publishedTime={publishedAt}
        modifiedTime={modifiedAt}
        jsonLd={[blogPostingSchema, breadcrumbSchema]}
      />

      <Card
        className={cn(
          styles.postCard,
          hasCoverImage ? 'overflow-hidden p-0 sm:p-0' : ''
        )}
      >
        {hasCoverImage ? (
          <>
            <section className="relative isolate min-h-[22rem] sm:min-h-[26rem]">
              <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_0%,black_60%,black_76%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,black_76%,transparent_100%)]">
                <img
                  src={coverImage}
                  alt={post.title}
                  data-original-src={originalCoverImage}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/12 to-slate-950/55 dark:from-black/45 dark:via-slate-950/18 dark:to-black/65" />
              </div>

              <div className="relative flex min-h-[22rem] flex-col gap-6 px-5 py-5 sm:min-h-[26rem] sm:justify-between sm:gap-0 sm:px-8 sm:py-8">
                <Link
                  to="/blog"
                  className="inline-flex w-fit items-center rounded-full border border-white/18 bg-black/18 px-3 py-1.5 text-sm font-medium text-white/95 shadow-sm backdrop-blur transition-colors hover:bg-black/28"
                >
                  {'< '}
                  {t('blog.back')}
                </Link>

                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {post.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <h1 className="mt-4 max-w-3xl text-3xl font-medium tracking-tight text-white drop-shadow-[0_2px_18px_rgba(15,23,42,0.45)] sm:text-4xl md:text-5xl">
                    {post.title}
                  </h1>

                  {post.summary ? (
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90 drop-shadow-[0_2px_12px_rgba(15,23,42,0.4)] sm:text-base">
                      {post.summary}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85 drop-shadow-[0_2px_12px_rgba(15,23,42,0.38)]">
                    {post.category ? (
                      <CategoryLabel
                        category={post.category}
                        className="drop-shadow-[0_2px_10px_rgba(15,23,42,0.5)]"
                      />
                    ) : null}
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <time dateTime={post.date}>
                        {t('blog.publishedOn')} {post.date}
                      </time>
                    </div>

                    {post.updated && post.updated !== post.date ? (
                      <div className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {t('blog.updatedOn')}: {post.updated}
                        </span>
                      </div>
                    ) : null}

                    <div className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{t('blog.wordCount', { count: words })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <article
              className={cn(
                styles.article,
                'px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6'
              )}
            >
              <MarkdownContent
                key={`rich-cover-${post.slug}`}
                ref={contentRef}
                html={contentHtml}
              />

              <Copyright />
              <PostNavigation
                prev={adjacentPosts.prev}
                next={adjacentPosts.next}
              />
            </article>
          </>
        ) : (
          <>
            <Link to="/blog" className={styles.backLink}>
              {'< '}
              {t('blog.back')}
            </Link>

            <article className={styles.article}>
              <h1 className={styles.title}>{post.title}</h1>

              <div className={styles.metaContainer}>
                {post.tags && post.tags.length > 0 ? (
                  <div className={styles.tagsContainer}>
                    {post.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={styles.statsContainer}>
                {post.category ? (
                  <CategoryLabel category={post.category} />
                ) : null}
                <div className={styles.iconText}>
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.date}>
                    {t('blog.publishedOn')} {post.date}
                  </time>
                </div>

                {post.updated && post.updated !== post.date ? (
                  <div className={styles.updatedText}>
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden text-[0.7rem] sm:inline">
                      {t('blog.updatedOn')}
                    </span>
                    <span className="text-[0.7rem]">: {post.updated}</span>
                  </div>
                ) : null}

                <div className={styles.iconText}>
                  <FileText className="h-4 w-4" />
                  <span>{t('blog.wordCount', { count: words })}</span>
                </div>
              </div>

              <MarkdownContent
                key={`rich-${post.slug}`}
                ref={contentRef}
                html={contentHtml}
              />

              <Copyright />
              <PostNavigation
                prev={adjacentPosts.prev}
                next={adjacentPosts.next}
              />
            </article>
          </>
        )}
      </Card>

      <Card className="p-6">
        <DeferredComments
          key={commentPath}
          containerId="twikoo-container"
          path={commentPath}
          eager
        />
      </Card>
    </div>
  )
}

const MarkdownContent = memo(function MarkdownContent({
  html,
  ref,
}: {
  html: string
  ref: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

const styles = {
  postCard: 'block w-full transition-transform',
  notFoundContainer: 'flex flex-col items-center justify-center py-12',
  notFoundTitle: 'mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100',
  notFoundLink: 'text-blue-600 hover:underline dark:text-blue-400',
  backLink: cn(
    'mb-6 inline-flex items-center text-sm font-medium transition-colors',
    'text-slate-500 hover:text-slate-800',
    'dark:text-slate-400 dark:hover:text-slate-200'
  ),
  article: cn(
    'article-rich prose prose-slate dark:prose-invert max-w-none',
    'prose-a:text-blue-600 hover:prose-a:text-blue-500',
    'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
    'prose-a:no-underline'
  ),
  title:
    'mb-4 text-3xl font-medium tracking-tight text-slate-900 md:text-4xl dark:text-slate-100',
  metaContainer:
    'mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400',
  statsContainer:
    'mb-8 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400',
  iconText: 'flex items-center gap-1',
  updatedText: 'flex items-center gap-1 text-slate-400',
  tagsContainer: 'flex gap-2',
  tag: cn(
    'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium',
    'text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  ),
  simpleReadingArticle: cn(
    'simple-reading mx-auto w-full max-w-none px-0 py-2',
    'prose prose-slate dark:prose-invert',
    'prose-a:text-blue-600 hover:prose-a:text-blue-500',
    'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
    'prose-a:no-underline'
  ),
  simpleReadingBackLink: cn(
    'mb-8 inline-flex items-center text-sm font-medium transition-colors',
    'text-slate-500 hover:text-slate-800',
    'dark:text-slate-400 dark:hover:text-slate-200'
  ),
  simpleReadingHeader: 'mb-10 border-b border-slate-200/70 pb-8 dark:border-slate-800/80',
  simpleReadingTitle:
    'mb-4 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl dark:text-slate-50',
  simpleReadingSummary:
    'max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400',
}
