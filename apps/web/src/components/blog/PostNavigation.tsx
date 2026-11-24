import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BlogPostSummary } from '@/lib/content/posts'

interface PostNavigationProps {
  prev?: BlogPostSummary
  next?: BlogPostSummary
}

type Direction = 'prev' | 'next'

function NavigationLink({
  post,
  direction,
}: {
  post?: BlogPostSummary
  direction: Direction
}) {
  const { t } = useTranslation()
  const isPrev = direction === 'prev'
  const ArrowIcon = isPrev ? ChevronLeft : ChevronRight
  const label = isPrev ? t('blog.nav.noPrev') : t('blog.nav.noNext')
  const inner = (
    <>
      {post && (
        <ArrowIcon
          size={32}
          aria-hidden="true"
          className={[
            'shrink-0 opacity-50 transition-all delay-100 duration-200 group-hover:delay-0',
            'group-hover:scale-[2] group-hover:opacity-20',
            isPrev ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1',
          ].join(' ')}
        />
      )}
      <span className="min-w-0">
        <strong
          className={[
            'text-base leading-5 font-semibold',
            'text-[var(--text-primary)]',
            'transition-[font-size,line-height,color] delay-100 duration-200 group-hover:delay-0',
            'group-hover:text-lg group-hover:leading-6',
            'group-hover:text-[color-mix(in_srgb,var(--brand-600)_82%,var(--text-primary)_18%)]',
            'dark:group-hover:text-[color-mix(in_srgb,var(--brand-400)_82%,var(--text-primary)_18%)]',
          ].join(' ')}
        >
          {post?.title || label}
        </strong>
        {post?.date && (
          <time className="mt-0.5 block text-xs text-[var(--text-disabled)]">
            {post.date}
          </time>
        )}
      </span>
    </>
  )

  return post ? (
    <Link
      to={`/blog/${post.slug}`}
      data-link-preview="off"
      className={[
        'group flex min-w-0 items-center gap-2.5 py-1.5',
        'focus:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--brand-400)] focus-visible:ring-inset',
        isPrev ? 'flex-row text-left' : 'ml-auto flex-row-reverse text-right',
      ].join(' ')}
    >
      {inner}
    </Link>
  ) : (
    <span
      className={[
        'flex min-w-0 items-center gap-2.5 py-1.5 opacity-40 select-none',
        isPrev ? 'flex-row text-left' : 'ml-auto flex-row-reverse text-right',
      ].join(' ')}
    >
      {inner}
    </span>
  )
}

export function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null

  return (
    <nav aria-label="Post navigation" className="font-round mt-8">
      <div className="flex flex-col gap-y-4">
        <NavigationLink post={prev} direction="prev" />
        <NavigationLink post={next} direction="next" />
      </div>
    </nav>
  )
}
