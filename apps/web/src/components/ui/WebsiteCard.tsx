import { ExternalLink, Globe } from 'lucide-react'
import { cn } from '../../utils/cn'

interface WebsiteCardProps {
  url: string
  title?: string
  description?: string
  className?: string
  showScreenshot?: boolean
  variant?: 'vertical' | 'horizontal' | 'compact'
}

export function WebsiteCard({
  url,
  title,
  description,
  className,
  showScreenshot = true,
  variant = 'vertical',
}: WebsiteCardProps) {
  // Extract hostname for display
  const hostname = new URL(url).hostname

  if (variant === 'compact') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700',
          className
        )}
      >
        {showScreenshot && (
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
            <img
              src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=200`}
              alt={`Screenshot of ${title || hostname}`}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            <span className="truncate">{title || hostname}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Globe className="h-3 w-3" />
            <span className="truncate">{hostname}</span>
          </div>
        </div>
      </a>
    )
  }

  if (variant === 'horizontal') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group flex h-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700',
          className
        )}
      >
        {showScreenshot && (
          <div className="relative w-48 flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=400`}
              alt={`Screenshot of ${title || hostname}`}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Globe className="h-3 w-3" />
            <span>{hostname}</span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            <span className="truncate">{title || hostname}</span>
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 -translate-y-0.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700',
        className
      )}
    >
      {showScreenshot && (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=800`}
            alt={`Screenshot of ${title || hostname}`}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Globe className="h-3.5 w-3.5" />
          <span>{hostname}</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
          {title || hostname}
          <ExternalLink className="h-3.5 w-3.5 -translate-y-0.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </a>
  )
}
