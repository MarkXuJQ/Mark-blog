export type SocialLinkId =
  | 'github'
  | 'bilibili'
  | 'twitter'
  | 'zhihu'
  | 'xiaohongshu'
  | 'travellings'

export type SocialLink = {
  id: SocialLinkId
  href: string
  label: string
}

export const TRAVELLINGS_URL = 'https://www.travellings.cn/go.html'

export const CC_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'github', href: 'https://github.com/MarkXuJQ', label: 'GitHub' },
  {
    id: 'bilibili',
    href: 'https://space.bilibili.com/351772037',
    label: 'Bilibili',
  },
  {
    id: 'twitter',
    href: 'https://x.com/MXu269/articles',
    label: 'X (Twitter)',
  },
  {
    id: 'zhihu',
    href: 'https://www.zhihu.com/people/mark-81-75',
    label: 'Zhihu',
  },
  {
    id: 'xiaohongshu',
    href: 'https://www.xiaohongshu.com/user/profile/62f4f889000000001e01e89e',
    label: '小红书',
  },
  { id: 'travellings', href: TRAVELLINGS_URL, label: 'Travellings' },
]

export function getFeedBasePath(language?: string): string {
  return language?.startsWith('zh') ? '/feeds/zh/' : '/feeds/en/'
}

export function getAtomFeedUrl(language?: string): string {
  return `${getFeedBasePath(language)}atom.xml`
}
