import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, FileText } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { getPostBySlug, getAdjacentPosts } from '../utils/posts'
import { estimateReadingTime, countWords } from '../utils/readingTime'
import { cn } from '../utils/cn'
import { rewriteHtmlImageSrc } from '../utils/image'
import { Seo } from '../components/seo/Seo'
import { Copyright } from '../components/blog/Copyright'
import { PostNavigation } from '../components/blog/PostNavigation'
import { useImageLightbox } from '../hooks/useImageLightbox'
import { DeferredComments } from '../components/comments/DeferredComments'
import {
  DEFAULT_IMAGE,
  buildBreadcrumbSchema,
  extractFirstImageFromHtml,
  getSiteUrl,
  toAbsoluteUrl,
  toIsoDateTime,
  type JsonLd,
} from '../components/seo/shared'

export function BlogPost() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const post = slug ? getPostBySlug(slug) : undefined
  const adjacentPosts = slug
    ? getAdjacentPosts(slug)
    : { prev: undefined, next: undefined }

  // We use a callback ref to handle the DOM node changes robustly
  // We don't need useRef anymore for the content container
  // But we need to make sure contentHtml is calculated before calling useImageLightbox

  const contentHtml = post ? rewriteHtmlImageSrc(post.content) : ''
  const contentRef = useImageLightbox([contentHtml])

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

  const minutes = estimateReadingTime(post.content)
  const words = countWords(post.content)
  const siteUrl = getSiteUrl()
  const blogUrl = toAbsoluteUrl('/blog', siteUrl)
  const encodedSlug = encodeURIComponent(post.slug)
  const postPath = `/blog/${encodedSlug}`
  const postUrl = toAbsoluteUrl(postPath, siteUrl)
  const imageSource = extractFirstImageFromHtml(post.content) || DEFAULT_IMAGE
  const postImageUrl = toAbsoluteUrl(imageSource, siteUrl)
  const publishedAt = toIsoDateTime(post.date)
  const modifiedAt = toIsoDateTime(post.updated || post.date)
  const blogPostingSchema: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    inLanguage: post.title.match(/[\u4e00-\u9fff]/) ? 'zh-CN' : 'en-US',
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

  return (
    <div className="mx-auto w-full space-y-8">
      <Seo
        title={post.title}
        description={post.summary}
        keywords={post.tags?.join(', ')}
        url={postPath}
        type="article"
        publishedTime={publishedAt}
        modifiedTime={modifiedAt}
        jsonLd={[blogPostingSchema, breadcrumbSchema]}
      />
      <Card className={styles.postCard}>
        <Link to="/blog" className={styles.backLink}>
          ← {t('blog.back')}
        </Link>

        <article className={styles.article}>
          <h1 className={styles.title}>{post.title}</h1>

          <div className={styles.metaContainer}>
            <div className={styles.iconText}>
              <Calendar className="h-4 w-4" />
              <time dateTime={post.date}>
                {t('blog.publishedOn')} {post.date}
              </time>
            </div>

            {post.updated && post.updated !== post.date && (
              <div className={styles.updatedText}>
                <span>
                  ({t('blog.updatedOn')}: {post.updated})
                </span>
              </div>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className={styles.tagsContainer}>
                {post.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.statsContainer}>
            <div className={styles.iconText}>
              <Clock className="h-4 w-4" />
              <span>{t('blog.readingTime', { minutes })}</span>
            </div>

            <span className={styles.separator}>·</span>

            <div className={styles.iconText}>
              <FileText className="h-4 w-4" />
              <span>{t('blog.wordCount', { count: words })}</span>
            </div>
          </div>

          <div
            ref={contentRef}
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          <Copyright url={postUrl} />
          <PostNavigation prev={adjacentPosts.prev} next={adjacentPosts.next} />
        </article>
      </Card>

      {/* <Card className="p-6"> */}
      <Card className="p-6">
        <DeferredComments key={slug} />
      </Card>
      {/* </Card> */}
    </div>
  )
}

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
    'prose prose-slate dark:prose-invert max-w-none',
    'prose-a:text-blue-600 hover:prose-a:text-blue-500',
    'dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300',
    'prose-a:no-underline hover:prose-a:underline'
  ),
  title:
    'mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100',
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
  separator: 'hidden sm:inline',
}
