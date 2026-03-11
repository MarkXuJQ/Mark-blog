import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Seo } from '../components/seo/Seo'
import { SearchInput } from '../components/search/SearchInput'
import { getAllPosts } from '../utils/posts'
import { buildBlogSearchDocs, normalizeQuery, searchBlogDocs } from '../components/search/blogSearch'

export function Search() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = normalizeQuery(searchParams.get('q') || '')

  const posts = useMemo(() => getAllPosts(), [])
  const docs = useMemo(() => buildBlogSearchDocs(posts), [posts])

  const hits = useMemo(() => searchBlogDocs(docs, query, 50, 3), [docs, query])
  const totalCount = hits.length

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <Seo title={t('search.title')} noindex={Boolean(query)} />

      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('search.title')}
        </h1>
        <SearchInput
          placeholder={t('search.placeholder')}
          defaultValue={searchParams.get('q') || ''}
          onSearch={handleSearch}
        />

        {query ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('search.resultsCount', { count: totalCount })}
          </div>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('search.hint')}
          </div>
        )}
      </div>

      {query && totalCount === 0 && (
        <div className="py-10 text-center text-slate-500 dark:text-slate-400">
          {t('search.noResults')}
        </div>
      )}

      {hits.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('search.sections.posts')}
            </h2>
            <span className="text-xs text-slate-400">({hits.length})</span>
          </div>
          <div className="space-y-3">
            {hits.map((hit, idx) => (
              <Link
                key={`${hit.post.id}-${hit.matchIndex}-${idx}`}
                to={`/blog/${encodeURIComponent(hit.post.slug)}?q=${encodeURIComponent(
                  query
                )}&i=${hit.matchIndex}`}
                className="block rounded-xl border border-slate-200/70 bg-white/70 p-4 transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {hit.post.title}
                    </div>
                    <div
                      className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400"
                      dangerouslySetInnerHTML={{ __html: hit.snippetHtml }}
                    />
                  </div>
                  <div className="shrink-0 text-xs text-slate-400">
                    {hit.post.date}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
