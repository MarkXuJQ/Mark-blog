import friendLinksConfig from '@content/Links/links.json'
import blurredcodeFavicon from '@/assets/home/radar/blurredcode.ico'
import dbushellFavicon from '@/assets/home/radar/dbushell.png'
import eventuallymakingFavicon from '@/assets/home/radar/eventuallymaking.png'
import inneiFavicon from '@/assets/home/radar/innei.png'
import joshwcomeauFavicon from '@/assets/home/radar/joshwcomeau.png'
import leitaoFavicon from '@/assets/home/radar/leitao.png'
import lmbFavicon from '@/assets/home/radar/lmb.png'
import lucumrFavicon from '@/assets/home/radar/lucumr.png'
import nineteenHundredFavicon from '@/assets/home/radar/nineteen-hundred.png'
import ooowlFavicon from '@/assets/home/radar/ooowl.png'
import pathosFavicon from '@/assets/home/radar/pathos.png'
import ruanyifengFavicon from '@/assets/home/radar/ruanyifeng.png'
import spacesFavicon from '@/assets/home/radar/spaces.svg'
import ttqukFavicon from '@/assets/home/radar/ttquk.png'
import victorzhouFavicon from '@/assets/home/radar/victorzhou.png'
import yunyitangFavicon from '@/assets/home/radar/yunyitang.ico'
import zhheoFavicon from '@/assets/home/radar/zhheo.png'
import zhiluFavicon from '@/assets/home/radar/zhilu.png'

const LINK_FAVICONS = {
  blurredcode: blurredcodeFavicon,
  dbushell: dbushellFavicon,
  eventuallymaking: eventuallymakingFavicon,
  innei: inneiFavicon,
  joshwcomeau: joshwcomeauFavicon,
  leitao: leitaoFavicon,
  lmb: lmbFavicon,
  lucumr: lucumrFavicon,
  'nineteen-hundred': nineteenHundredFavicon,
  ooowl: ooowlFavicon,
  pathos: pathosFavicon,
  ruanyifeng: ruanyifengFavicon,
  spaces: spacesFavicon,
  ttquk: ttqukFavicon,
  victorzhou: victorzhouFavicon,
  yunyitang: yunyitangFavicon,
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
