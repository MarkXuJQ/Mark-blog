export const ROWS_PER_PAGE = 5
export const LIST_ITEMS_PER_PAGE = 16
export const BASE_COLUMNS = 4
export const MIN_CARD_WIDTH_MD = 190
export const MIN_CARD_WIDTH_LG = 210
export const GAP_MD = 12
export const GAP_LG = 16

export function toTimestamp(input: string) {
  if (!input) return 0
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

export function formatMovieDate(input: string, locale: string) {
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export function toDateKey(input: string) {
  if (!input) return ''
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calculateMovieColumns(
  containerWidth: number,
  viewportWidth: number
) {
  if (viewportWidth < 540) return 2
  if (viewportWidth < 780) return 3
  if (viewportWidth < 868) return BASE_COLUMNS

  const minCardWidth =
    viewportWidth >= 1024 ? MIN_CARD_WIDTH_LG : MIN_CARD_WIDTH_MD
  const gap = viewportWidth >= 1024 ? GAP_LG : GAP_MD
  const columns = Math.floor((containerWidth + gap) / (minCardWidth + gap))
  return Math.max(BASE_COLUMNS, columns || BASE_COLUMNS)
}

export function shuffleItems<T>(items: T[]) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = current
  }

  return shuffled
}
