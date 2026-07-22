import { useTranslation } from 'react-i18next'
import {
  getBlogCategoryMeta,
  getBlogCategoryTranslationKey,
} from './blogCategoryMeta'
import { cn } from '@/lib/classNames'

interface CategoryLabelProps {
  category?: string | null
  className?: string
  iconClassName?: string
  textClassName?: string
}

export function CategoryLabel({
  category,
  className,
  iconClassName,
  textClassName,
}: CategoryLabelProps) {
  const { t } = useTranslation()

  if (!category) return null

  const meta = getBlogCategoryMeta(category)
  const Icon = meta.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-semibold',
        meta.textClassName,
        className,
        'leading-none'
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('h-4 w-4 shrink-0', iconClassName)}
      />
      <span className={textClassName}>
        {t(getBlogCategoryTranslationKey(category), category)}
      </span>
    </span>
  )
}
