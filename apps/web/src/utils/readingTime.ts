export function countWords(text: string): number {
  // Strip HTML tags
  const plainText = text.replace(/<[^>]*>?/gm, '')
  
  // Count CJK characters
  const cjkMatches = plainText.match(/[\u4e00-\u9fa5]/g) || []
  const cjkCount = cjkMatches.length
  
  // Count non-CJK words (English, numbers, etc.)
  // Replace CJK chars with spaces to avoid counting them as part of non-CJK words if they are adjacent
  const nonCjkText = plainText.replace(/[\u4e00-\u9fa5]/g, ' ')
  const nonCjkCount = nonCjkText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
    
  return cjkCount + nonCjkCount
}

export function estimateReadingTime(text: string): number {
  const words = countWords(text)
  // Average reading speed: 
  // English: ~200-250 wpm
  // Chinese: ~300-500 cpm
  // We use a blended average of 300 for mixed content or just keep it simple
  const wordsPerMinute = 300
  const minutes = Math.round(words / wordsPerMinute)
  return Math.max(minutes, 1)
}
