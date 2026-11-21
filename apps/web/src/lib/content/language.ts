export type PostLanguage = 'zh' | 'en'

export function resolveLanguage(language?: string): PostLanguage {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}
