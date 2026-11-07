import linkSites from '@content/Links/sites.json'
import { REMOTE_AVATARS } from '../links/remoteAvatars'

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
  faviconKey: keyof typeof REMOTE_AVATARS
  eyebrow: {
    zh: string
    en: string
  }
  description: {
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

/**
 * Palette and layout auto-assigned to radar signals, indexed by their
 * position in `sites.json`. Colors repeat in a loop so sites added later
 * automatically pick up the next color and card alignment without needing
 * a separate hand-maintained radar config file.
 */
const RADAR_PALETTE = ['#FF6F43', '#10A64B', '#7670E8', '#F4C433']
const RADAR_CARD_ALIGNMENTS: {
  cardAlignX: RadarNode['cardAlignX']
  cardAlignY: RadarNode['cardAlignY']
}[] = [
  { cardAlignX: 'left', cardAlignY: 'top' },
  { cardAlignX: 'right', cardAlignY: 'bottom' },
  { cardAlignX: 'center', cardAlignY: 'top' },
  { cardAlignX: 'right', cardAlignY: 'top' },
  { cardAlignX: 'left', cardAlignY: 'bottom' },
  { cardAlignX: 'center', cardAlignY: 'bottom' },
]

export const RADAR_NODES: RadarNode[] = (
  linkSites as LinkSiteContentItem[]
).map((site, index): RadarNode => {
  const paletteColor = RADAR_PALETTE[index % RADAR_PALETTE.length]
  const alignment = RADAR_CARD_ALIGNMENTS[index % RADAR_CARD_ALIGNMENTS.length]

  return {
    id: site.id,
    category: site.radarCategory,
    href: site.href,
    faviconSrc: REMOTE_AVATARS[site.faviconKey] ?? REMOTE_AVATARS.ruanyifeng,
    label: {
      zh: site.name,
      en: site.name,
    },
    eyebrow: site.eyebrow,
    description: site.description,
    cardAlignX: alignment.cardAlignX,
    cardAlignY: alignment.cardAlignY,
    color: paletteColor,
  }
})

export const RING_INSETS = ['8%', '18%', '30%', '42%', '54%']
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
