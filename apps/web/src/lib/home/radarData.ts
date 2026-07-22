import radarConfig from '@content/Links/radar.json'
import linkSites from '@content/Links/sites.json'
import blurredcodeFavicon from '../../assets/home/radar/blurredcode.ico'
import dbushellFavicon from '../../assets/home/radar/dbushell.png'
import distillFavicon from '../../assets/home/radar/distill.png'
import eventuallymakingFavicon from '../../assets/home/radar/eventuallymaking.png'
import geokashFavicon from '../../assets/home/radar/geokash.png'
import inneiFavicon from '../../assets/home/radar/innei.png'
import joshwcomeauFavicon from '../../assets/home/radar/joshwcomeau.png'
import leitaoFavicon from '../../assets/home/radar/leitao.png'
import lucumrFavicon from '../../assets/home/radar/lucumr.png'
import messengerFavicon from '../../assets/home/radar/messenger.png'
import nineteenHundredFavicon from '../../assets/home/radar/nineteen-hundred.png'
import ooowlFavicon from '../../assets/home/radar/ooowl.png'
import pathosFavicon from '../../assets/home/radar/pathos.png'
import peterOravecFavicon from '../../assets/home/radar/peter-oravec.png'
import radiogardenFavicon from '../../assets/home/radar/radiogarden.png'
import rleonardiFavicon from '../../assets/home/radar/rleonardi.png'
import ruanyifengFavicon from '../../assets/home/radar/ruanyifeng.png'
import spacesFavicon from '../../assets/home/radar/spaces.svg'
import tongliaoFavicon from '../../assets/home/radar/tongliao.png'
import ttqukFavicon from '../../assets/home/radar/ttquk.png'
import uselesswebFavicon from '../../assets/home/radar/uselessweb.png'
import victorzhouFavicon from '../../assets/home/radar/victorzhou.png'
import zhheoFavicon from '../../assets/home/radar/zhheo.png'
import zhiluFavicon from '../../assets/home/radar/zhilu.png'

const RADAR_FAVICONS = {
  blurredcode: blurredcodeFavicon,
  dbushell: dbushellFavicon,
  distill: distillFavicon,
  eventuallymaking: eventuallymakingFavicon,
  geokash: geokashFavicon,
  innei: inneiFavicon,
  joshwcomeau: joshwcomeauFavicon,
  leitao: leitaoFavicon,
  lucumr: lucumrFavicon,
  messenger: messengerFavicon,
  'nineteen-hundred': nineteenHundredFavicon,
  ooowl: ooowlFavicon,
  pathos: pathosFavicon,
  'peter-oravec': peterOravecFavicon,
  radiogarden: radiogardenFavicon,
  rleonardi: rleonardiFavicon,
  ruanyifeng: ruanyifengFavicon,
  spaces: spacesFavicon,
  tongliao: tongliaoFavicon,
  ttquk: ttqukFavicon,
  uselessweb: uselesswebFavicon,
  victorzhou: victorzhouFavicon,
  zhheo: zhheoFavicon,
  zhilu: zhiluFavicon,
} as const

export type RadarNodeCategory = 'personal-blog' | 'interesting-site'

export interface RadarNode {
  id: string
  category: RadarNodeCategory
  href: string
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

interface LinkSiteContentItem {
  id: string
  radarCategory: RadarNodeCategory
  name: string
  href: string
  faviconKey: keyof typeof RADAR_FAVICONS
  eyebrow: {
    zh: string
    en: string
  }
  description: {
    zh: string
    en: string
  }
}

interface RadarNodeConfigItem {
  id: string
  cardAlignX: RadarNode['cardAlignX']
  cardAlignY: RadarNode['cardAlignY']
  color: string
  dotScaleSteps?: number
}

interface RadarConfig {
  nodes: RadarNodeConfigItem[]
}

interface RadarSiteContentItem extends Omit<
  RadarNode,
  'faviconSrc' | 'label' | 'category'
> {
  faviconKey: keyof typeof RADAR_FAVICONS
  category: RadarNodeCategory
  label: {
    zh: string
    en: string
  }
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

export const RADAR_CATEGORY_ORDER = [
  'personal-blog',
  'interesting-site',
] as const satisfies RadarNodeCategory[]

export const RADAR_CATEGORY_LABELS: Record<
  RadarNodeCategory,
  { zh: string; en: string }
> = {
  'personal-blog': { zh: '个人博客', en: 'Personal blogs' },
  'interesting-site': { zh: '有意思的网站', en: 'Interesting sites' },
}

const LINK_SITE_BY_ID = new Map(
  (linkSites as LinkSiteContentItem[]).map((site) => [site.id, site])
)

export const RADAR_NODES: RadarNode[] = (radarConfig as RadarConfig).nodes
  .map((nodeConfig): RadarSiteContentItem | null => {
    const site = LINK_SITE_BY_ID.get(nodeConfig.id)
    if (!site) return null

    return {
      id: site.id,
      category: site.radarCategory,
      href: site.href,
      faviconKey: site.faviconKey,
      label: {
        zh: site.name,
        en: site.name,
      },
      eyebrow: site.eyebrow,
      description: site.description,
      cardAlignX: nodeConfig.cardAlignX,
      cardAlignY: nodeConfig.cardAlignY,
      color: nodeConfig.color,
      dotScaleSteps: nodeConfig.dotScaleSteps,
    }
  })
  .filter((site): site is RadarSiteContentItem => site != null)
  .map(({ faviconKey, ...site }) => ({
    ...site,
    faviconSrc: RADAR_FAVICONS[faviconKey] ?? RADAR_FAVICONS.ruanyifeng,
  }))

export const RING_INSETS = ['8%', '18%', '30%', '42%', '54%']
export const NODE_REVEAL_ANGLE_WINDOW = 18
export const NODE_SCAN_GLOW_ANGLE_WINDOW = 26
export const SIGNAL_DOT_SIZE_PX = 44
export const SIGNAL_CARD_SIZE_PX = 212
export const SIGNAL_DOT_SIZE_STEP_PX = 8
const RADAR_AXIS_EDGE_INSET = '3.5%'
const RADAR_AXIS_EDGE_OPPOSITE = `calc(100% - ${RADAR_AXIS_EDGE_INSET})`
export const RADAR_AXIS_MARKERS = [
  {
    side: 'top',
    label: '000',
    left: '50%',
    top: RADAR_AXIS_EDGE_INSET,
    className: '-translate-x-1/2 -translate-y-full',
  },
  {
    side: 'right',
    label: '090',
    left: RADAR_AXIS_EDGE_OPPOSITE,
    top: '50%',
    className: '-translate-y-1/2',
  },
  {
    side: 'bottom',
    label: '180',
    left: '50%',
    top: RADAR_AXIS_EDGE_OPPOSITE,
    className: '-translate-x-1/2',
  },
  {
    side: 'left',
    label: '270',
    left: RADAR_AXIS_EDGE_INSET,
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
