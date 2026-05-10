import eventuallymakingFavicon from '../../assets/home/radar/eventuallymaking.png'
import joshwcomeauFavicon from '../../assets/home/radar/joshwcomeau.png'
import messengerFavicon from '../../assets/home/radar/messenger.png'
import pathosFavicon from '../../assets/home/radar/pathos.png'
import radiogardenFavicon from '../../assets/home/radar/radiogarden.png'
import ruanyifengFavicon from '../../assets/home/radar/ruanyifeng.png'
import tongliaoFavicon from '../../assets/home/radar/tongliao.png'

export interface RadarNode {
  id: string
  href: string
  left: string
  top: string
  faviconSrc: string
  label: {
    zh: string
    en: string
  }
  eyebrow: {
    zh: string
    en: string
  }
  description: {
    zh: string
    en: string
  }
  cardAlignX: 'left' | 'center' | 'right'
  cardAlignY: 'top' | 'bottom'
  color: string
  dotScaleSteps?: number
}

export interface SignalPortalState {
  node: RadarNode
  originTop: number
  originLeft: number
  originSize: number
  targetTop: number
  targetLeft: number
  expanded: boolean
}

const RADAR_SIGNAL_GREEN = '#10A64B'
const RADAR_SIGNAL_ORANGE = '#FF6F43'
const RADAR_SIGNAL_VIOLET = '#7670E8'
const RADAR_SIGNAL_YELLOW = '#F4C433'

export const RADAR_NODES: RadarNode[] = [
  {
    id: 'ruanyifeng',
    href: 'https://www.ruanyifeng.com/blog/',
    left: '79%',
    top: '29%',
    faviconSrc: ruanyifengFavicon,
    label: { zh: '阮一峰的网络日志', en: "Ruanyifeng's Blog" },
    eyebrow: {
      zh: '科技写作 / 编程观察',
      en: 'Tech essays / Programming notes',
    },
    description: {
      zh: '长期更新的中文技术博客，围绕编程方法、工具趋势与科技周刊展开。',
      en: 'A long-running Chinese tech blog about programming practice, tools, and weekly observations on the web.',
    },
    cardAlignX: 'right',
    cardAlignY: 'bottom',
    color: RADAR_SIGNAL_ORANGE,
  },
  {
    id: 'eventuallymaking',
    href: 'https://eventuallymaking.io/',
    left: '23%',
    top: '33%',
    faviconSrc: eventuallymakingFavicon,
    label: { zh: 'Eventuallymaking', en: 'Eventuallymaking' },
    eyebrow: {
      zh: '软件工程 / 创业笔记',
      en: 'Software engineering / Startups',
    },
    description: {
      zh: '一位拥有二十多年经验的软件工程师，持续分享技术、产品和创业实践。',
      en: 'A veteran software engineer sharing notes on technology, product building, and startups.',
    },
    cardAlignX: 'left',
    cardAlignY: 'bottom',
    color: RADAR_SIGNAL_VIOLET,
  },
  {
    id: 'messenger',
    href: 'https://messenger.abeto.co/',
    left: '17%',
    top: '66%',
    faviconSrc: messengerFavicon,
    label: { zh: 'Messenger', en: 'Messenger' },
    eyebrow: {
      zh: '独立网页游戏',
      en: 'Indie web game',
    },
    description: {
      zh: '“星球虽小，总得有人送货。”一款气质很强的太空投递小游戏。',
      en: `"It's a small planet, but someone's gotta make the deliveries." A tiny space-delivery web game with attitude.`,
    },
    cardAlignX: 'left',
    cardAlignY: 'top',
    color: RADAR_SIGNAL_GREEN,
  },
  {
    id: 'radiogarden',
    href: 'https://radio.garden/visit/washington-dc/DIlWBUQt',
    left: '34%',
    top: '78%',
    faviconSrc: radiogardenFavicon,
    label: { zh: 'Radio Garden', en: 'Radio Garden' },
    eyebrow: {
      zh: 'Washington DC / Live radio',
      en: 'Washington DC / Live radio',
    },
    description: {
      zh: '直接落到 Washington DC 的收听页，像在地球仪上旋钮式漫游全球电台。',
      en: 'Drops straight into the Washington DC listening view, a globe-like way to wander through live radio stations.',
    },
    cardAlignX: 'center',
    cardAlignY: 'top',
    color: RADAR_SIGNAL_GREEN,
  },
  {
    id: 'joshwcomeau',
    href: 'https://www.joshwcomeau.com/',
    left: '50%',
    top: '12%',
    faviconSrc: joshwcomeauFavicon,
    label: { zh: 'Josh W. Comeau', en: 'Josh W. Comeau' },
    eyebrow: {
      zh: 'React / CSS / Animation',
      en: 'React / CSS / Animation',
    },
    description: {
      zh: '面向开发者的友好教程站点，内容聚焦 React、CSS、动画与前端体验。',
      en: 'Friendly tutorials for developers, focused on React, CSS, animation, and front-end craft.',
    },
    cardAlignX: 'center',
    cardAlignY: 'bottom',
    color: RADAR_SIGNAL_VIOLET,
  },
  {
    id: 'pathos',
    href: 'https://pathos.page/',
    left: '67%',
    top: '74%',
    faviconSrc: pathosFavicon,
    label: { zh: 'Pathos.page', en: 'Pathos.page' },
    eyebrow: {
      zh: '2750 words / 法哲学',
      en: '2750 words / Legal philosophy',
    },
    description: {
      zh: '一个法哲学研究者的博客，记录学术写作、问题意识与社会观察。',
      en: 'A blog by a legal philosophy researcher, documenting scholarship, writing, and social observation.',
    },
    cardAlignX: 'right',
    cardAlignY: 'top',
    color: RADAR_SIGNAL_YELLOW,
  },
  {
    id: 'tongliao',
    href: 'https://www.tongliaouniverse.cn/',
    left: '85%',
    top: '57%',
    faviconSrc: tongliaoFavicon,
    label: { zh: '通辽宇宙知识库', en: 'Tongliao Universe' },
    eyebrow: {
      zh: '小国梗 / 历史狠人',
      en: 'Microstates / History lore',
    },
    description: {
      zh: '围绕奇葩小国、硬核历史人物与通辽宇宙梗文化展开的互动知识站。',
      en: 'An interactive knowledge base about eccentric microstates, hard-core historical figures, and Tongliao Universe lore.',
    },
    cardAlignX: 'right',
    cardAlignY: 'top',
    color: RADAR_SIGNAL_VIOLET,
  },
]

export const RING_INSETS = ['8%', '18%', '30%', '42%', '54%']
export const NODE_REVEAL_ANGLE_WINDOW = 18
export const NODE_SCAN_GLOW_ANGLE_WINDOW = 26
export const SIGNAL_DOT_SIZE_PX = 44
export const SIGNAL_CARD_SIZE_PX = 212
export const SIGNAL_DOT_SIZE_STEP_PX = 8
export const RADAR_AXIS_MARKERS = [
  {
    label: '000',
    left: '50%',
    top: '3.5%',
    className: '-translate-x-1/2 -translate-y-full',
  },
  {
    label: '090',
    left: '96.4%',
    top: '50%',
    className: 'translate-x-full -translate-y-1/2',
  },
  {
    label: '180',
    left: '50%',
    top: '96.4%',
    className: '-translate-x-1/2 translate-y-full',
  },
  {
    label: '270',
    left: '3.6%',
    top: '50%',
    className: '-translate-x-full -translate-y-1/2',
  },
] as const

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const value = Number.parseInt(safeHex, 16)

  if (!Number.isFinite(value)) {
    return { r: 255, g: 255, b: 255 }
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`
}

export function isLightHexColor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.6
}

export function getNodeDotSize(node: RadarNode) {
  return (
    SIGNAL_DOT_SIZE_PX + (node.dotScaleSteps ?? 0) * SIGNAL_DOT_SIZE_STEP_PX
  )
}
