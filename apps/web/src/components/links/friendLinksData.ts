import friendLinksConfig from '@content/Links/links.json'
import dbushellFavicon from '@/assets/home/radar/dbushell.png'
import eventuallymakingFavicon from '@/assets/home/radar/eventuallymaking.png'
import inneiFavicon from '@/assets/home/radar/innei.png'
import joshwcomeauFavicon from '@/assets/home/radar/joshwcomeau.png'
import lucumrFavicon from '@/assets/home/radar/lucumr.png'
import nineteenHundredFavicon from '@/assets/home/radar/nineteen-hundred.png'
import ooowlFavicon from '@/assets/home/radar/ooowl.png'
import pathosFavicon from '@/assets/home/radar/pathos.png'
import ruanyifengFavicon from '@/assets/home/radar/ruanyifeng.png'
import spacesFavicon from '@/assets/home/radar/spaces.svg'
import victorzhouFavicon from '@/assets/home/radar/victorzhou.png'
import zhheoFavicon from '@/assets/home/radar/zhheo.png'
import zhiluFavicon from '@/assets/home/radar/zhilu.png'

const LINK_FAVICONS = {
  dbushell: dbushellFavicon,
  eventuallymaking: eventuallymakingFavicon,
  innei: inneiFavicon,
  joshwcomeau: joshwcomeauFavicon,
  lucumr: lucumrFavicon,
  'nineteen-hundred': nineteenHundredFavicon,
  ooowl: ooowlFavicon,
  pathos: pathosFavicon,
  ruanyifeng: ruanyifengFavicon,
  spaces: spacesFavicon,
  victorzhou: victorzhouFavicon,
  zhheo: zhheoFavicon,
  zhilu: zhiluFavicon,
} as const

export type FriendLinkCategory = 'recommended' | 'neighbors'

export interface FriendLink {
  id: string
  category: FriendLinkCategory
  name: string
  href: string
  description: string
  faviconSrc: string
}

interface FriendLinkContentItem {
  name: string
  url: string
  avatar: keyof typeof LINK_FAVICONS | string
  description: string
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
    title: isZh ? zh('友链') : 'Friends',
    subtitle: isZh
      ? zh('一些常去拜访的个人站点')
      : 'Personal sites worth visiting',
    openLabel: isZh ? zh('打开站点') : 'Open site',
    pageDescription: isZh
      ? zh('把一些常去拜访，曾给我一定启发的、和友好的网上邻居放在这里。')
      : 'A small collection of personal sites I like, revisit, or learned from while building this place.',
    backToBlog: isZh ? zh('返回博客') : 'Back to Blog',
    applyTitle: isZh ? zh('申请友链') : 'Apply For A Link',
    applyDescription: isZh
      ? zh(
          '如果你也有自己的个人站，可以在下方评论区留下站点名称、链接和一句简介。'
        )
      : 'If you also have a personal site, leave its name, URL, and a short description in the comments below.',
    rulesTitle: isZh ? zh('小小要求') : 'A Few Requirements',
    categories: {
      recommended: isZh ? zh('个人推荐') : 'Personal Picks',
      neighbors: isZh ? zh('网上邻居') : 'Web Neighbors',
    } satisfies Record<FriendLinkCategory, string>,
    emptyNeighbors: isZh
      ? zh('暂时还没有网上邻居，等有人在下方申请后就会添加到这里。')
      : 'No web neighbors yet. When someone applies below, I will add them here.',
    rules: isZh
      ? [
          zh('文章数量不要过少，希望站点有持续更新的痕迹。'),
          zh('需要有一定的原创内容，不只是搬运或纯聚合。'),
          zh('站点能够正常访问，基本的阅读体验是完整的。'),
          zh('内容不涉及非法、侵权或明显不适宜公开展示的东西。'),
        ]
      : [
          'The site should have more than just a handful of posts and show signs of ongoing care.',
          'It should include original writing or work, not only reposts or pure aggregation.',
          'The site should be publicly reachable with a reasonably complete reading experience.',
          'It should not contain illegal, infringing, or clearly unsuitable public content.',
        ],
  }
}

function resolveFriendLinks(
  items: FriendLinkContentItem[],
  category: FriendLinkCategory
): FriendLink[] {
  return items.map((site) => {
    const faviconSrc =
      site.avatar in LINK_FAVICONS
        ? LINK_FAVICONS[site.avatar as keyof typeof LINK_FAVICONS]
        : site.avatar

    return {
      id: site.url,
      category,
      name: site.name,
      href: site.url,
      description: site.description,
      faviconSrc,
    }
  })
}

const FRIEND_LINK_CONFIG = friendLinksConfig as FriendLinksConfig

export const FRIEND_LINKS: FriendLink[] = [
  ...resolveFriendLinks(FRIEND_LINK_CONFIG.recommended, 'recommended'),
  ...resolveFriendLinks(FRIEND_LINK_CONFIG.neighbors, 'neighbors'),
]

export const FRIEND_LINK_CATEGORY_ORDER = [
  'recommended',
  'neighbors',
] as const satisfies FriendLinkCategory[]
