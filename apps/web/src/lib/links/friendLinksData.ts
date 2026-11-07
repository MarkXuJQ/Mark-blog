import friendLinksConfig from '@content/Links/links.json'
import lostFriendsData from '@/data/lost-friends.json'

export type FriendLinkCategory = 'recommended' | 'neighbors'

export interface FriendLink {
  id: string
  category: FriendLinkCategory
  name: string
  href: string
  description: string
  faviconSrc: string
  comment?: string
}

interface FriendLinkContentItem {
  name: string
  url: string
  avatar: string
  description: string
  comment?: string
}

interface FriendLinksConfig {
  recommended: FriendLinkContentItem[]
  neighbors: FriendLinkContentItem[]
}

function zh(value: string) {
  return value
}

export function getFriendLinkLabels(isZh: boolean) {
  return {
    title: isZh ? zh('朋友们') : 'Friends',
    subtitle: isZh
      ? zh('去朋友们的网络小屋串串门')
      : "A little tour through my friends' corners of the web",
    openLabel: isZh ? zh('打开站点') : 'Open site',
    pageDescription: isZh
      ? zh(
          '下面是我自己常去拜访的、给我以启发的、我喜欢的还有网络上友好的小伙伴们的网站，可以多去拜访拜访。'
        )
      : 'These are sites I often visit, enjoy, learn from, or discovered through friendly people online. Drop by their corners of the web sometime.',
    backToBlog: isZh ? zh('返回博客') : 'Back to Blog',
    applyTitle: isZh ? zh('交个朋友吧！🤝') : "Let's Be Friends! 🤝",
    applyDescription: isZh
      ? zh(
          '如果你也有一间自己的网络小屋，欢迎在下面留句话、打个招呼，让我们认识一下。'
        )
      : 'If you have a little corner of your own on the web, leave a note below and say hello.',
    rulesTitle: isZh ? zh('认识彼此的小期待') : 'A Few Friendly Hopes',
    categories: {
      recommended: isZh ? zh('我常看的') : 'Sites I Revisit',
      neighbors: isZh ? zh('优秀的朋友萌') : 'Wonderful Friends',
    } satisfies Record<FriendLinkCategory, string>,
    emptyNeighbors: isZh
      ? zh('这里还在等新朋友，欢迎在下面打个招呼。')
      : 'This corner is waiting for new friends. Say hello below.',
    archivedTitle: isZh ? zh('失联的朋友们') : 'Friends Who Went Quiet',
    archivedDescription: isZh
      ? zh(
          '下面这些朋友的网站暂时打不开了，可能是迁移、换地址或者暂时失联。如果再次拜访时恢复了，我会把它们移回来。'
        )
      : "These friends' sites can't be reached right now — they might have moved, changed addresses, or drifted offline. If they come back, I'll move them back to the active list.",
    archivedEmpty: isZh
      ? zh('暂时没有失联的朋友，大家都在线。')
      : 'Everyone is reachable right now — no archived friends.',
    checkedAtNote: isZh
      ? zh('该状态在站点构建时自动检查。')
      : 'Availability is checked automatically at build time.',
    archivedCount: (count: number) =>
      isZh ? `${count} 位` : `${count} archived`,
    rules: isZh
      ? [
          zh('希望你的小站里已经住进了一些文章，平时也还会回来打理。'),
          zh('更想读到你自己写下的生活、想法或作品，而不是只有搬运或聚合。'),
          zh('拜访时能够正常打开，基本的阅读体验舒服完整就好。'),
          zh('公开内容遵守基本的法律和版权边界，也适合大家一起阅读。'),
        ]
      : [
          'I hope your site already has a few posts and still feels cared for.',
          'I would love to read your own stories, thoughts, or work rather than only reposts or aggregation.',
          'It should open normally and feel comfortable enough to read.',
          'Public content should respect basic legal and copyright boundaries and be suitable to share.',
        ],
  }
}

function resolveFriendLinks(
  items: FriendLinkContentItem[],
  category: FriendLinkCategory
): FriendLink[] {
  return items.map((site) => {
    return {
      id: site.url,
      category,
      name: site.name,
      href: site.url,
      description: site.description,
      faviconSrc: site.avatar,
      comment: site.comment,
    }
  })
}

const FRIEND_LINK_CONFIG = friendLinksConfig as FriendLinksConfig

export const ARCHIVED_LINK_URLS: ReadonlySet<string> = new Set(
  lostFriendsData.archived.map((site) => site.url)
)

const ALL_FRIEND_LINKS: FriendLink[] = [
  ...resolveFriendLinks(FRIEND_LINK_CONFIG.recommended, 'recommended'),
  ...resolveFriendLinks(FRIEND_LINK_CONFIG.neighbors, 'neighbors'),
]

/** Every friend link (including archived), keyed by href, for resolving details. */
const LINK_BY_HREF = new Map(ALL_FRIEND_LINKS.map((link) => [link.href, link]))

/** Links currently shown in the active groups (archived friends removed). */
export const FRIEND_LINKS: FriendLink[] = ALL_FRIEND_LINKS.filter(
  (link) => !ARCHIVED_LINK_URLS.has(link.href)
)

export function getFriendLinkByHref(href: string): FriendLink | undefined {
  return LINK_BY_HREF.get(href)
}

export const FRIEND_LINK_CATEGORY_ORDER = [
  'recommended',
  'neighbors',
] as const satisfies FriendLinkCategory[]
