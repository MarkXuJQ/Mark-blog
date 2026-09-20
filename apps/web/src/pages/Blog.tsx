import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { flushSync } from 'react-dom'
import { RiRssFill } from 'react-icons/ri'
import { BlogFilter } from '@/components/blog/BlogFilter'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { SearchStatus } from '@/components/search/SearchStatus'
import { SearchTriggerInput } from '@/components/search/SearchTriggerInput'
import { Seo } from '@/app/seo/Seo'
import {
  buildBreadcrumbSchema,
  getSiteUrl,
  toAbsoluteUrl,
  type JsonLd,
} from '@/lib/seo'
import { Pagination } from '@/components/ui/Pagination'
import { StaggeredList } from '@/components/ui/StaggeredList'
import { useBlogPosts } from '@/hooks/useBlogPosts'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/classNames'
import { getOptimizedImageUrl } from '@/lib/image'
import { SharedTransitionFrame } from '@/components/transitions/SharedTransitionFrame'
import {
  POST_SHARED_TRANSITION_SETTLE_MS,
  getPostSharedTransitionIds,
} from '@/lib/transitions/postSharedTransition'
import {
  type BlogViewState,
  getBlogNavigationState,
  isBlogViewState,
  readBlogViewState,
  writeBlogViewState,
} from '@/lib/blog/blogNavigation'
import type { BlogListOutletContext } from '@/layouts/BlogListLayout'
import { getPostDetailPath, type BlogPostSummary } from '@/lib/content/posts'

const ITEMS_PER_PAGE = 10
type BlogLayout = 'mobile' | 'desktop'

export function Blog() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { simpleMode = false } = useOutletContext<BlogListOutletContext>()
  const isDesktopLayout = useMediaQuery('(min-width: 640px)')
  const prefersReducedMotion = useReducedMotion()
  const navigationState = getBlogNavigationState(location.state)
  const shouldRestoreViewState = Boolean(navigationState?.preserveScroll)
  const returnTransitionPostSlug = shouldRestoreViewState
    ? navigationState?.transitionPostSlug
    : undefined
  const [transitionPostSlug, setTransitionPostSlug] = useState(
    () => navigationState?.transitionPostSlug
  )
  const sharedTransitionEnabled = prefersReducedMotion !== true
  const layout: BlogLayout = isDesktopLayout ? 'desktop' : 'mobile'
  const routeSearchQuery = useMemo(
    () => new URLSearchParams(location.search).get('q') || '',
    [location.search]
  )
  const initialViewState = useMemo(
    () =>
      shouldRestoreViewState
        ? isBlogViewState(navigationState?.viewState) &&
          navigationState.viewState.searchQuery === routeSearchQuery
          ? navigationState.viewState
          : readBlogViewState(i18n.language, routeSearchQuery)
        : null,
    [
      i18n.language,
      navigationState?.viewState,
      routeSearchQuery,
      shouldRestoreViewState,
    ]
  )
  const siteUrl = getSiteUrl()
  const blogUrl = toAbsoluteUrl('/blog', siteUrl)
  const pageTitle = t('blog.title')
  const collectionPageSchema: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${pageTitle} | ${t('siteTitle')}`,
    url: blogUrl,
    description: t('blog.description'),
    isPartOf: {
      '@type': 'WebSite',
      name: t('siteTitle'),
      url: siteUrl,
    },
  }
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: t('nav.homepage'), url: siteUrl },
    { name: pageTitle, url: blogUrl },
  ])
  const {
    posts,
    allCategories,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    toggleSort,
    searchQuery,
    clearSearch,
    categoryCounts,
    totalPostsCount,
  } = useBlogPosts({
    selectedCategory: initialViewState?.selectedCategory,
    sortBy: initialViewState?.sortBy,
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(
    initialViewState?.currentPage ?? 1
  )
  const latestViewStateRef = useRef<BlogViewState>({
    currentPage,
    scrollY: initialViewState?.scrollY ?? 0,
    searchQuery,
    selectedCategory,
    sortBy,
  })
  const previousFiltersRef = useRef({
    selectedCategory,
    searchQuery,
    sortBy,
  })
  const paginationContentRef = useRef<HTMLDivElement>(null)

  // Reset to page 1 when filters change
  useEffect(() => {
    const previousFilters = previousFiltersRef.current
    const filtersChanged =
      previousFilters.selectedCategory !== selectedCategory ||
      previousFilters.searchQuery !== searchQuery ||
      previousFilters.sortBy !== sortBy

    if (filtersChanged) setCurrentPage(1)
    previousFiltersRef.current = { selectedCategory, searchQuery, sortBy }
  }, [selectedCategory, searchQuery, sortBy])

  // Calculate pagination
  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE)
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1)
  const currentPosts = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return posts.slice(start, start + ITEMS_PER_PAGE)
  }, [posts, safeCurrentPage])

  useEffect(() => {
    if (safeCurrentPage !== currentPage) {
      setCurrentPage(safeCurrentPage)
    }
  }, [currentPage, safeCurrentPage])

  latestViewStateRef.current = {
    currentPage: safeCurrentPage,
    scrollY: latestViewStateRef.current.scrollY,
    searchQuery,
    selectedCategory,
    sortBy,
  }

  const saveViewState = useCallback((): BlogViewState => {
    const nextState = {
      ...latestViewStateRef.current,
      scrollY: window.scrollY,
    }
    latestViewStateRef.current = nextState
    writeBlogViewState(i18n.language, nextState)
    return nextState
  }, [i18n.language])

  const handleOpenPost = useCallback(
    (post: BlogPostSummary, event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      event.preventDefault()
      const viewState = saveViewState()
      flushSync(() => {
        setTransitionPostSlug(post.slug)
      })

      // Give the source frames one paint to mount and measure at the card's
      // current scroll position before the route replaces the list.
      window.requestAnimationFrame(() => {
        navigate(getPostDetailPath(post), {
          state: {
            fromBlogList: true,
            returnTo: `${location.pathname}${location.search}`,
            transitionPostSlug: post.slug,
            viewState,
          },
        })
      })
    },
    [location.pathname, location.search, navigate, saveViewState]
  )

  useEffect(() => {
    if (!navigationState?.transitionPostSlug) return

    const timerId = window.setTimeout(() => {
      setTransitionPostSlug(undefined)
    }, POST_SHARED_TRANSITION_SETTLE_MS)

    return () => window.clearTimeout(timerId)
  }, [navigationState?.transitionPostSlug])

  useEffect(() => {
    let frameId = 0
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(saveViewState)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [saveViewState])

  useEffect(() => {
    writeBlogViewState(i18n.language, latestViewStateRef.current)
  }, [currentPage, i18n.language, searchQuery, selectedCategory, sortBy])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Seo
        title={pageTitle}
        noindex={Boolean(searchQuery)}
        feedUrl={
          i18n.language?.startsWith('zh')
            ? '/feeds/zh/atom.xml'
            : '/feeds/en/atom.xml'
        }
        jsonLd={[collectionPageSchema, breadcrumbSchema]}
      />
      <div
        className={cn(
          'mb-8 flex',
          simpleMode
            ? 'flex-col gap-5'
            : layout === 'desktop'
              ? 'flex-row items-center justify-between gap-4'
              : 'flex-col gap-4'
        )}
      >
        {simpleMode ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <BlogHeaderTitle layout={layout} title={pageTitle} />
                <div className="mt-2">
                  <SearchStatus
                    query={searchQuery}
                    count={posts.length}
                    onClear={clearSearch}
                  />
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center pt-0.5">
                {layout === 'mobile' ? (
                  <BlogFilter
                    allCategories={allCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    sortBy={sortBy}
                    onToggleSort={toggleSort}
                    categoryCounts={categoryCounts}
                    totalPostsCount={totalPostsCount}
                    hideSort
                  />
                ) : (
                  <SimpleBlogHeaderLinks />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <SearchTriggerInput
                placeholder={t('blog.sidebar.search.placeholder')}
                query={searchQuery}
                iconClassName="left-0 text-[var(--text-secondary)]"
                className="rounded-none border-0 border-b border-[var(--border-color)] bg-transparent px-0 py-2 pl-7 text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-secondary)] focus:border-[color-mix(in_srgb,var(--brand-400)_72%,transparent)] focus:ring-0 dark:border-[var(--border-color)] dark:bg-transparent dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)] dark:focus:border-[color-mix(in_srgb,var(--brand-400)_72%,transparent)]"
              />
              {layout === 'desktop' ? (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <BlogFilter
                    allCategories={allCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    sortBy={sortBy}
                    onToggleSort={toggleSort}
                    categoryCounts={categoryCounts}
                    totalPostsCount={totalPostsCount}
                    simple
                    hideSort
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <BlogHeaderTitle layout={layout} title={pageTitle} />
                <div className="mt-2">
                  <SearchStatus
                    query={searchQuery}
                    count={posts.length}
                    onClear={clearSearch}
                  />
                </div>
              </div>
              {layout === 'mobile' ? (
                <div className="ml-auto flex shrink-0 items-center pt-0.5">
                  <BlogFilter
                    allCategories={allCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    sortBy={sortBy}
                    onToggleSort={toggleSort}
                    categoryCounts={categoryCounts}
                    totalPostsCount={totalPostsCount}
                    hideSort
                  />
                </div>
              ) : null}
            </div>

            {layout === 'desktop' ? (
              <div className="flex justify-end">
                <BlogFilter
                  allCategories={allCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  sortBy={sortBy}
                  onToggleSort={toggleSort}
                  categoryCounts={categoryCounts}
                  totalPostsCount={totalPostsCount}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <div ref={paginationContentRef}>
        {currentPosts.length > 0 ? (
          <>
            <StaggeredList className={simpleMode ? 'space-y-0' : 'space-y-6'}>
              {currentPosts.map((post) => {
                const isSharedTransitionPost =
                  sharedTransitionEnabled && transitionPostSlug === post.slug
                const shouldSuppressListEnter =
                  isSharedTransitionPost ||
                  returnTransitionPostSlug === post.slug

                return simpleMode ? (
                  <SimpleBlogPostItem
                    key={post.id}
                    post={post}
                    className={
                      shouldSuppressListEnter
                        ? 'blog-post-shared-transition-source'
                        : undefined
                    }
                    onOpenPost={(event) => handleOpenPost(post, event)}
                    sharedTransitionEnabled={isSharedTransitionPost}
                  />
                ) : (
                  <BlogPostCard
                    key={post.id}
                    post={post}
                    sortBy={sortBy}
                    className={
                      shouldSuppressListEnter
                        ? 'blog-post-shared-transition-source'
                        : undefined
                    }
                    onOpenPost={(event) => handleOpenPost(post, event)}
                    sharedTransitionEnabled={isSharedTransitionPost}
                    isDesktopLayout={isDesktopLayout}
                  />
                )
              })}
            </StaggeredList>

            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              contentRef={paginationContentRef}
            />
          </>
        ) : (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {t('blog.search.noResults')}
          </div>
        )}
      </div>
    </>
  )
}

function BlogHeaderTitle({
  layout,
  title,
}: {
  layout: BlogLayout
  title: string
}) {
  const { t, i18n } = useTranslation()
  const feedPath = i18n.language?.startsWith('zh') ? '/feeds/zh/' : '/feeds/en/'
  const rssLabel = t('blog.rss.subscribe')

  return (
    <h1 className="flex items-center gap-2 text-3xl leading-tight font-bold text-slate-900 dark:text-slate-100">
      <span>{title}</span>
      {layout === 'desktop' ? (
        <a
          href={feedPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f26522] text-white shadow-sm transition-colors transition-transform hover:scale-105 hover:bg-[#dd571c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f26522] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-background)]"
          aria-label={rssLabel}
          title={rssLabel}
        >
          <RiRssFill className="h-5 w-5" aria-hidden="true" />
        </a>
      ) : null}
    </h1>
  )
}

function SimpleBlogHeaderLinks() {
  const { t, i18n } = useTranslation()
  const linksLabel = i18n.language?.startsWith('zh') ? '朋友们' : 'Friends'

  return (
    <nav
      aria-label={i18n.language?.startsWith('zh') ? '博客入口' : 'Blog links'}
      className="flex shrink-0 items-center gap-4 text-sm"
    >
      <Link
        to="/archive"
        className="font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {t('blog.sidebar.archive.title')}
      </Link>
      <Link
        to="/links"
        className="font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        {linksLabel}
      </Link>
    </nav>
  )
}

function SimpleBlogPostItem({
  post,
  className,
  style,
  onOpenPost,
  sharedTransitionEnabled,
}: {
  post: BlogPostSummary
  className?: string
  style?: CSSProperties
  onOpenPost?: (event: MouseEvent<HTMLAnchorElement>) => void
  sharedTransitionEnabled: boolean
}) {
  const detailPath = getPostDetailPath(post)
  const { coverLayoutId, titleLayoutId } = getPostSharedTransitionIds(
    post.slug,
    sharedTransitionEnabled
  )

  return (
    <article className={cn('py-6 first:pt-0', className)} style={style}>
      <Link
        to={detailPath}
        onClick={onOpenPost}
        className="group flex min-w-0 gap-4"
      >
        {post.image ? (
          <SharedTransitionFrame
            layoutId={coverLayoutId}
            className="mt-1 aspect-[4/3] w-28 shrink-0 overflow-hidden bg-slate-100 sm:w-36 dark:bg-slate-800"
          >
            <img
              src={getOptimizedImageUrl(post.image, 'card')}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </SharedTransitionFrame>
        ) : null}
        <div className="min-w-0">
          <SharedTransitionFrame
            layoutId={titleLayoutId}
            className="overflow-hidden rounded-xl"
          >
            <h2 className="text-2xl leading-snug font-bold text-[var(--text-primary)] transition-colors group-hover:text-[color-mix(in_srgb,var(--brand-400)_72%,var(--text-primary)_28%)]">
              {post.title}
            </h2>
          </SharedTransitionFrame>
          {post.summary ? (
            <p className="mt-3 text-[0.98rem] leading-7 text-[var(--text-secondary)]">
              {post.summary}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
