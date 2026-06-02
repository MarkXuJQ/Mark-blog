import { memo, useEffect, useMemo } from 'react'
import {
  useParams,
  Link,
  useSearchParams,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LuHammer, LuPencilLine, LuWholeWord } from 'react-icons/lu'
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
import { usePhotoScroll } from '@/hooks/usePhotoScroll'
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
import {
  extractOptimizedImageUrlsFromHtml,
  getImageUrl,
  getOptimizedImageUrl,
  rewriteHtmlImageSrc,
} from '@/utils/image'
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
  usePhotoScroll(contentRef, `${contentHtml}:${simpleMode ? 'simple' : 'rich'}`)
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

  useEffect(() => {
    if (!post) return

    const urls = extractOptimizedImageUrlsFromHtml(post.content)
    const links = urls.map((url) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      link.fetchPriority = 'low'
      link.referrerPolicy = 'no-referrer'
      document.head.appendChild(link)
      return link
    })

    return () => {
      links.forEach((link) => link.remove())
    }
  }, [post])

  if (!post) {
    return (
      <div className="mx-auto max-w-4xl">
        <Seo title="Post Not Found" noindex />
        <Card className="border border-slate-200/70 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:shadow-none">
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

  const words = post.wordCount ?? countWords(post.content)
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
    originalCoverImage ||
    extractFirstImageFromHtml(post.content) ||
    DEFAULT_IMAGE
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
  const metaItemClass = 'inline-flex items-center gap-1.5 leading-none'

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
          <div className={styles.simpleReadingMeta}>
            {post.category ? (
              <CategoryLabel category={post.category} />
            ) : null}
            <time dateTime={post.date} className={metaItemClass}>
              <LuPencilLine className="h-4 w-4" aria-hidden="true" />
              <span>{post.date}</span>
            </time>

            {post.updated && post.updated !== post.date ? (
              <time dateTime={post.updated} className={metaItemClass}>
                <LuHammer className="h-4 w-4" aria-hidden="true" />
                <span>{post.updated}</span>
              </time>
            ) : null}

            <span className={metaItemClass}>
              <LuWholeWord className="h-4 w-4" aria-hidden="true" />
              <span>{t('blog.wordCount', { count: words })}</span>
            </span>
          </div>

          <h1 className={styles.simpleReadingTitle} data-article-heading="true">
            {post.title}
          </h1>
        </header>

        <MarkdownContent
          key={`simple-${post.slug}`}
          ref={contentRef}
          html={contentHtml}
        />

        <DeferredComments
          key={`simple-comments-${commentPath}`}
          containerId="twikoo-container"
          path={commentPath}
          eager
          showTitle={false}
          className={styles.simpleReadingComments}
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
              <div className="absolute inset-0">
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
              </div>

              <div className="absolute top-5 right-5 left-5 z-10 flex items-center justify-between gap-4 sm:top-8 sm:right-8 sm:left-8">
                <Link
                  to="/blog"
                  className="inline-flex w-fit shrink-0 items-center rounded-full border border-white/18 bg-black/18 px-3 py-1.5 text-sm font-medium text-white/95 shadow-sm backdrop-blur transition-colors hover:bg-black/28"
                >
                  {'< '}
                  {t('blog.back')}
                </Link>

                {post.tags && post.tags.length > 0 ? (
                  <div className="flex max-w-[48%] shrink-0 flex-wrap justify-end gap-2">
                    {post.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative flex min-h-[22rem] flex-col justify-end px-5 py-5 pt-24 sm:min-h-[26rem] sm:px-8 sm:py-8 sm:pt-28">
                <div className="max-w-3xl translate-y-2 sm:translate-y-3">
                  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/90 drop-shadow-[0_2px_12px_rgba(15,23,42,0.58)]">
                    {post.category ? (
                      <CategoryLabel
                        category={post.category}
                        className="drop-shadow-[0_2px_10px_rgba(15,23,42,0.68)]"
                      />
                    ) : null}
                    <time dateTime={post.date} className={metaItemClass}>
                      <LuPencilLine className="h-4 w-4" aria-hidden="true" />
                      <span>{post.date}</span>
                    </time>

                    {post.updated && post.updated !== post.date ? (
                      <time dateTime={post.updated} className={metaItemClass}>
                        <LuHammer className="h-4 w-4" aria-hidden="true" />
                        <span>{post.updated}</span>
                      </time>
                    ) : null}

                    <span className={metaItemClass}>
                      <LuWholeWord className="h-4 w-4" aria-hidden="true" />
                      <span>{t('blog.wordCount', { count: words })}</span>
                    </span>
                  </div>

                  <h1
                    className="max-w-3xl text-3xl font-medium tracking-tight text-white drop-shadow-[0_2px_18px_rgba(15,23,42,0.45)] sm:text-4xl md:text-5xl"
                    data-article-heading="true"
                  >
                    {post.title}
                  </h1>
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
            <article className={styles.article}>
              <header className={styles.plainPostHeader}>
                <div className={styles.plainPostTopRow}>
                  <Link
                    to="/blog"
                    className={styles.backLink}
                    data-link-preview="off"
                  >
                    {'< '}
                    {t('blog.back')}
                  </Link>
                  {post.tags && post.tags.length > 0 ? (
                    <div className={styles.plainPostTags}>
                      {post.tags.map((tag) => (
                        <span key={tag} className={styles.plainPostTag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={styles.plainPostMeta}>
                  {post.category ? (
                    <CategoryLabel category={post.category} />
                  ) : null}
                  <time dateTime={post.date} className={metaItemClass}>
                    <LuPencilLine className="h-4 w-4" aria-hidden="true" />
                    <span>{post.date}</span>
                  </time>

                  {post.updated && post.updated !== post.date ? (
                    <time dateTime={post.updated} className={metaItemClass}>
                      <LuHammer className="h-4 w-4" aria-hidden="true" />
                      <span>{post.updated}</span>
                    </time>
                  ) : null}

                  <span className={metaItemClass}>
                    <LuWholeWord className="h-4 w-4" aria-hidden="true" />
                    <span>{t('blog.wordCount', { count: words })}</span>
                  </span>
                </div>

                <h1 className={styles.plainPostTitle} data-article-heading="true">
                  {post.title}
                </h1>
              </header>

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

      <Card className="border border-slate-200/70 p-6 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] dark:border-0 dark:shadow-none">
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
      data-article-content="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

const styles = {
  postCard:
    'block w-full border border-slate-200/70 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.34)] transition-transform dark:border-0 dark:shadow-none',
  notFoundContainer: 'flex flex-col items-center justify-center py-12',
  notFoundTitle: 'mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100',
  notFoundLink: 'text-blue-600 hover:underline dark:text-blue-400',
  backLink: cn(
    'inline-flex h-5 items-center text-sm font-medium leading-none transition-colors',
    'text-slate-500 hover:text-slate-800',
    'dark:text-slate-400 dark:hover:text-slate-200'
  ),
  article: cn(
    'article-rich prose prose-slate dark:prose-invert max-w-none',
    'prose-a:text-blue-600 hover:prose-a:text-blue-500',
    'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
    'prose-a:no-underline'
  ),
  plainPostHeader:
    'not-prose mb-10 border-b border-slate-200/70 pb-8 dark:border-slate-800/80',
  plainPostTopRow:
    'mb-8 flex items-start justify-between gap-4 sm:mb-9',
  plainPostMeta:
    'mb-4 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400',
  plainPostTags:
    'flex flex-wrap items-center gap-x-3 gap-y-1 sm:max-w-[42%] sm:shrink-0 sm:justify-end',
  plainPostTag:
    'inline-flex h-5 items-center text-sm font-medium leading-none text-slate-500 transition-colors dark:text-slate-400',
  plainPostTitle:
    'm-0 max-w-3xl text-3xl font-medium tracking-tight text-[var(--article-heading)] md:text-4xl',
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
  simpleReadingHeader:
    'mb-10 border-b border-slate-200/70 pb-8 dark:border-slate-800/80',
  simpleReadingMeta:
    'not-prose mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--article-muted)]',
  simpleReadingTitle:
    'mb-4 text-4xl font-bold tracking-tight text-[var(--article-heading)] md:text-5xl',
  simpleReadingComments: 'not-prose mt-16 mb-4',
}
