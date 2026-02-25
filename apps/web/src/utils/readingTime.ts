export function countWords(text: string): number {
  // Strip HTML tags
  const plainText = text.replace(/<[^>]*>?/gm, '')
  return plainText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function estimateReadingTime(text: string, wordsPerMinute = 200): number {
  const words = countWords(text)
  const minutes = Math.round(words / wordsPerMinute)
  return Math.max(minutes, 1)
}

