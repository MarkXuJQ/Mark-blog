const HAN_CHARACTER_PATTERN = /\p{Script=Han}/gu
const ENGLISH_WORD_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g

export function countWords(input) {
  const text = normalizeCountableText(input)
  const hanCount = (text.match(HAN_CHARACTER_PATTERN) || []).length
  const englishCount = (text.match(ENGLISH_WORD_PATTERN) || []).length

  return hanCount + englishCount
}

export function estimateReadingTime(input) {
  const words = countWords(input)
  return estimateReadingTimeFromWordCount(words)
}

export function estimateReadingTimeFromWordCount(wordCount) {
  const words = Number.isFinite(wordCount) ? wordCount : 0
  const wordsPerMinute = 300
  const minutes = Math.round(words / wordsPerMinute)
  return Math.max(minutes, 1)
}

export function normalizeCountableText(input) {
  return stripMarkdownSyntax(stripHtmlSyntax(String(input || '')))
    .replace(/https?:\/\/[^\s)]+/gi, ' ')
    .replace(/mailto:[^\s)]+/gi, ' ')
    .replace(/\b[\w.-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtmlSyntax(input) {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

function stripMarkdownSyntax(input) {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/^\s{0,3}([-*+]|\d+[.)])\s+/gm, ' ')
    .replace(/^\s{0,3}[-*_]{3,}\s*$/gm, ' ')
    .replace(/[*_~#>|[\]()]|&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ')
}
