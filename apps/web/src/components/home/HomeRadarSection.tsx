import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import {
  easeOutBack,
  easeOutCubic,
  getBeamRevealProgress,
  getRadarNodeAngle,
  getSignalShellShift,
  getTrailingBeamImpact,
  HOME_RADAR_CENTER_Y,
  HOME_RADAR_RING_DURATION,
  HOME_RADAR_RING_START,
  HOME_RADAR_RING_STAGGER,
  mix,
  segmentProgress,
  useHomeRadarScene,
} from './useHomeRadarScene'
import eventuallymakingFavicon from '../../assets/home/radar/eventuallymaking.png'
import joshwcomeauFavicon from '../../assets/home/radar/joshwcomeau.png'
import messengerFavicon from '../../assets/home/radar/messenger.png'
import pathosFavicon from '../../assets/home/radar/pathos.png'
import radiogardenFavicon from '../../assets/home/radar/radiogarden.png'
import ruanyifengFavicon from '../../assets/home/radar/ruanyifeng.png'
import tongliaoFavicon from '../../assets/home/radar/tongliao.png'

interface HomeRadarSectionProps {
  avatarSrc: string
}

interface RadarNode {
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
  glow: string
}

const RADAR_NODES: RadarNode[] = [
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
    color: '#f97316',
    glow: 'rgba(249,115,22,0.42)',
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
    color: '#7c9cff',
    glow: 'rgba(124,156,255,0.4)',
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
      en: '"It\'s a small planet, but someone\'s gotta make the deliveries." A tiny space-delivery web game with attitude.',
    },
    cardAlignX: 'left',
    cardAlignY: 'top',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.38)',
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
    color: '#14b8a6',
    glow: 'rgba(20,184,166,0.38)',
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
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.36)',
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
    color: '#fb7185',
    glow: 'rgba(251,113,133,0.36)',
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
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.36)',
  },
]

const RING_INSETS = ['8%', '18%', '30%', '42%', '54%']
const NODE_REVEAL_ANGLE_WINDOW = 18
const NODE_PULSE_ANGLE_WINDOW = 24
const SIGNAL_DOT_SIZE_PX = 44
const SIGNAL_CARD_SIZE_PX = 212
const SIGNAL_CARD_RADIUS_PX = 32
const SIGNAL_ICON_INSET_PX = 16

function HomeRadarAvatarKeyframe({ avatarSrc }: { avatarSrc: string }) {
  return (
    <div
      aria-hidden="true"
      data-home-avatar-keyframe="radar"
      className={cn(
        styles.avatarKeyframeWrap,
        styles.avatarKeyframeHidden
      )}
    >
      <div
        data-home-avatar-keyframe-core="radar"
        className={styles.avatarKeyframeCore}
      >
        <img
          src={avatarSrc}
          alt=""
          loading="lazy"
          decoding="async"
          data-home-avatar-keyframe-image="radar"
          className={styles.avatarKeyframeImage}
        />
      </div>
    </div>
  )
}

export function HomeRadarSection({ avatarSrc }: HomeRadarSectionProps) {
  const { i18n } = useTranslation()
  const isZh = i18n.language?.startsWith('zh')
  const {
    activateSignalNode,
    activeNodeId,
    ambienceReveal,
    beamFocusAngle,
    beamFocusSweepAngle,
    beamLoopActive,
    beamOpacity,
    beamRotate,
    beamSweepStartAngle,
    explorationProgress,
    horizontalLineReveal,
    introReveal,
    progress,
    scheduleSignalNodeDeactivate,
    sectionRef,
    verticalLineReveal,
  } = useHomeRadarScene()

  return (
    <section
      ref={sectionRef}
      aria-label={isZh ? '主页雷达区' : 'Homepage radar'}
      className="relative isolate z-[30] h-[100svh] overflow-hidden"
      style={{ backgroundColor: 'var(--page-background)' }}
    >
      <div
        aria-hidden="true"
        className={styles.softGlowRight}
        style={{ opacity: ambienceReveal * 0.9 }}
      />
      <div
        aria-hidden="true"
        className={styles.gridBackdrop}
        style={{ opacity: ambienceReveal * 0.4 }}
      />
      <div
        aria-hidden="true"
        className={styles.crosshairVertical}
        style={{
          opacity: verticalLineReveal * 0.9,
          transform: `translateX(-50%) scaleY(${Math.max(0.001, verticalLineReveal)})`,
        }}
      />
      <div
        aria-hidden="true"
        className={styles.crosshairHorizontal}
        style={{
          top: HOME_RADAR_CENTER_Y,
          opacity: horizontalLineReveal,
          transform: `translateY(-50%) scaleX(${Math.max(0.001, horizontalLineReveal)})`,
        }}
      />

      <div
        aria-hidden="true"
        className={styles.radarSweepClip}
        style={{ opacity: beamOpacity }}
      >
        <div className={styles.radarSweepStage}>
          <div
            className={styles.scanBeam}
            style={{
              top: HOME_RADAR_CENTER_Y,
              rotate: `${beamRotate}deg`,
              background:
                'conic-gradient(from 0deg, rgba(6,182,212,0) 0deg, rgba(6,182,212,0) 324deg, rgba(6,182,212,0.05) 338deg, rgba(6,182,212,0.12) 348deg, rgba(6,182,212,0.34) 356deg, rgba(6,182,212,0.08) 360deg)',
            }}
          />
        </div>
      </div>

      <div className="relative z-10 h-full w-full">
        <div
          className={styles.introPanel}
          style={{
            opacity: introReveal,
            transform: `translateY(${(1 - introReveal) * 18}px)`,
          }}
        >
          <h2 className={cn('heading-display', styles.introTitle)}>
            {isZh ? '发现的博客和网站' : 'Blogs and Sites I Discovered'}
          </h2>
        </div>

        <div className={styles.radarStage}>
          <div style={{ top: HOME_RADAR_CENTER_Y }} className={styles.radarField}>
            {RING_INSETS.map((inset, index) => {
              const ringRaw = segmentProgress(
                progress,
                HOME_RADAR_RING_START + index * HOME_RADAR_RING_STAGGER,
                HOME_RADAR_RING_START +
                  index * HOME_RADAR_RING_STAGGER +
                  HOME_RADAR_RING_DURATION
              )
              const ringOpacity = easeOutCubic(ringRaw)
              const ringScale = mix(0.34, 1, easeOutBack(ringRaw))

              return (
                <div
                  key={inset}
                  aria-hidden="true"
                  className={cn(
                    styles.ring,
                    index === RING_INSETS.length - 1 && styles.outerRing
                  )}
                  style={{
                    inset,
                    opacity: ringOpacity,
                    scale: ringScale,
                  }}
                />
              )
            })}

            <HomeRadarAvatarKeyframe avatarSrc={avatarSrc} />

            {RADAR_NODES.map((node) => {
              const nodeAngle = getRadarNodeAngle(node)
              const isNodeActive = activeNodeId === node.id
              const nodeLabel = isZh ? node.label.zh : node.label.en
              const nodeEyebrow = isZh ? node.eyebrow.zh : node.eyebrow.en
              const nodeDescription = isZh
                ? node.description.zh
                : node.description.en
              const nodeRevealRaw =
                explorationProgress <= 0
                  ? 0
                  : beamLoopActive
                    ? 1
                    : getBeamRevealProgress(
                        beamFocusSweepAngle,
                        nodeAngle,
                        NODE_REVEAL_ANGLE_WINDOW,
                        beamSweepStartAngle
                      )
              const nodeOpacity = easeOutCubic(nodeRevealRaw)
              const nodeScale = mix(0.36, 1, easeOutBack(nodeRevealRaw))
              const nodeImpact =
                explorationProgress <= 0
                  ? 0
                  : getTrailingBeamImpact(
                      beamFocusAngle,
                      nodeAngle,
                      NODE_PULSE_ANGLE_WINDOW
                    )
              const signalPulseScale = mix(0.72, 2.08, nodeImpact)
              const signalPulseOpacity = nodeImpact * 0.56 * nodeOpacity
              const restShellShadow = `0 0 0 1px rgba(255,255,255,0.44), 0 18px 34px -22px rgba(15,23,42,0.82), 0 0 ${mix(10, 22, nodeImpact)}px ${node.glow}`
              const hoverShellShadow = `0 34px 92px -48px rgba(15,23,42,0.82), 0 0 ${mix(18, 38, nodeImpact)}px ${node.glow}`
              const { shiftX, shiftY } = getSignalShellShift(node)
              const shellOffset = (SIGNAL_DOT_SIZE_PX - SIGNAL_CARD_SIZE_PX) / 2
              const hoverPadLeft = shellOffset + shiftX
              const hoverPadTop = shellOffset + shiftY

              return (
                <a
                  key={node.id}
                  href={node.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={nodeLabel}
                  title={nodeLabel}
                  className={cn(
                    styles.signalLink,
                    isNodeActive && styles.signalLinkActive
                  )}
                  onPointerEnter={() => activateSignalNode(node.id)}
                  onPointerLeave={() => scheduleSignalNodeDeactivate(node.id)}
                  onFocus={() => activateSignalNode(node.id)}
                  onBlur={() => scheduleSignalNodeDeactivate(node.id)}
                  style={{
                    left: node.left,
                    top: node.top,
                    opacity: nodeOpacity,
                    scale: nodeScale,
                    pointerEvents: nodeOpacity < 0.98 ? 'none' : 'auto',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={styles.signalHoverPad}
                    style={{
                      left: hoverPadLeft,
                      top: hoverPadTop,
                      width: SIGNAL_CARD_SIZE_PX,
                      height: SIGNAL_CARD_SIZE_PX,
                      pointerEvents: isNodeActive ? 'auto' : 'none',
                    }}
                  />

                  <span
                    aria-hidden="true"
                    className={styles.signalPulse}
                    style={{
                      background: node.glow,
                      opacity: signalPulseOpacity,
                      scale: signalPulseScale,
                    }}
                  />

                  <span
                    aria-hidden="true"
                    className={styles.signalShell}
                    style={{
                      width: isNodeActive
                        ? SIGNAL_CARD_SIZE_PX
                        : SIGNAL_DOT_SIZE_PX,
                      height: isNodeActive
                        ? SIGNAL_CARD_SIZE_PX
                        : SIGNAL_DOT_SIZE_PX,
                      opacity: nodeOpacity,
                      borderRadius: isNodeActive
                        ? SIGNAL_CARD_RADIUS_PX
                        : SIGNAL_DOT_SIZE_PX,
                      boxShadow: isNodeActive
                        ? hoverShellShadow
                        : restShellShadow,
                      ['--signal-shell-translate' as string]: isNodeActive
                        ? `${shiftX}px ${shiftY}px`
                        : '0 0',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={styles.signalShellTint}
                      style={{
                        background: `radial-gradient(circle at 28% 24%, rgba(255,255,255,0.92) 0%, ${node.glow} 54%, rgba(255,255,255,0) 100%)`,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className={styles.signalIconFrame}
                      style={{
                        left: isNodeActive ? SIGNAL_ICON_INSET_PX : 0,
                        top: isNodeActive ? SIGNAL_ICON_INSET_PX : 0,
                        borderRadius: isNodeActive
                          ? 18
                          : SIGNAL_DOT_SIZE_PX,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={styles.signalIconFrameTint}
                        style={{
                          background: `radial-gradient(circle at 20% 18%, ${node.glow} 0%, rgba(255,255,255,0) 72%)`,
                        }}
                      />
                      <span className={styles.signalIconFrameInner}>
                        <img
                          src={node.faviconSrc}
                          alt=""
                          className={styles.signalIconImage}
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        styles.signalCopy,
                        isNodeActive
                          ? styles.signalCopyActive
                          : styles.signalCopyInactive
                      )}
                    >
                      <span className={styles.signalCopyHeader}>
                        <span className={styles.signalCopySpacer} />
                        <span className={styles.signalCopyTitleBlock}>
                          <span className={styles.signalCardEyebrow}>
                            {nodeEyebrow}
                          </span>
                          <span className={styles.signalCardTitle}>
                            {nodeLabel}
                          </span>
                        </span>
                      </span>
                      <span className={styles.signalCardDescription}>
                        {nodeDescription}
                      </span>
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  softGlowRight:
    'pointer-events-none absolute bottom-[3rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,rgba(249,115,22,0.04)_34%,rgba(249,115,22,0)_74%)] blur-3xl',
  gridBackdrop:
    'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.07)_0px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_0px,transparent_1px)] [background-size:24px_24px]',
  introPanel:
    'pointer-events-none absolute left-4 top-[14svh] z-20 max-w-[min(32rem,calc(100vw-2rem))] sm:left-6 sm:top-[15svh] lg:top-[16svh]',
  introTitle:
    'text-[1.45rem] leading-tight text-balance text-slate-950 [text-shadow:0_10px_28px_rgba(255,255,255,0.82)] sm:text-[1.85rem] dark:text-white dark:[text-shadow:0_14px_32px_rgba(2,6,23,0.68)]',
  crosshairVertical:
    'pointer-events-none absolute left-1/2 top-0 h-full w-px origin-center bg-[linear-gradient(180deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.22)_18%,rgba(148,163,184,0.22)_82%,rgba(148,163,184,0)_100%)]',
  crosshairHorizontal:
    'pointer-events-none absolute left-0 h-px w-full origin-center bg-[linear-gradient(90deg,rgba(148,163,184,0)_0%,rgba(148,163,184,0.26)_18%,rgba(148,163,184,0.26)_82%,rgba(148,163,184,0)_100%)]',
  radarStage: 'absolute inset-0',
  radarSweepClip: 'pointer-events-none absolute inset-0 overflow-hidden',
  radarSweepStage: 'pointer-events-none absolute inset-0',
  radarField:
    'absolute left-1/2 h-[min(94vw,94vh)] w-[min(94vw,94vh)] max-h-[72rem] max-w-[72rem] -translate-x-1/2 -translate-y-1/2',
  ring: 'pointer-events-none absolute rounded-full border border-slate-300/62',
  outerRing:
    'border-dashed border-slate-300/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.58)]',
  scanBeam:
    'pointer-events-none absolute left-1/2 top-1/2 h-[170vmax] w-[170vmax] -translate-x-1/2 -translate-y-1/2',
  avatarKeyframeWrap:
    'absolute left-1/2 top-1/2 z-20 flex h-[20%] w-[20%] min-h-[6.5rem] min-w-[6.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-transparent backdrop-blur-2xl',
  avatarKeyframeHidden: 'pointer-events-none invisible select-none',
  avatarKeyframeCore:
    'relative h-[72%] w-[72%] overflow-hidden rounded-full border border-white/60 bg-transparent shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)]',
  avatarKeyframeImage: 'h-full w-full object-cover',
  signalLink:
    'absolute z-30 flex h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-visible focus-visible:z-50 focus-visible:outline-none',
  signalLinkActive: 'z-50',
  signalHoverPad: 'absolute rounded-[32px] opacity-0',
  signalPulse:
    'pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[14px]',
  signalShell:
    'relative z-10 block shrink-0 overflow-hidden border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.9)_100%)] text-left text-slate-900 backdrop-blur-xl [translate:var(--signal-shell-translate)] transition-[width,height,translate,border-radius,box-shadow] duration-[380ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalShellTint:
    'pointer-events-none absolute inset-0 rounded-[inherit] opacity-90 mix-blend-screen',
  signalIconFrame:
    'absolute h-[44px] w-[44px] overflow-hidden border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.94)_100%)] shadow-[0_18px_32px_-22px_rgba(15,23,42,0.82)] transition-[top,left,border-radius] duration-[340ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalIconFrameTint:
    'pointer-events-none absolute inset-0 rounded-[inherit] opacity-90',
  signalIconFrameInner:
    'relative z-10 grid h-full w-full place-items-center p-[21%]',
  signalIconImage: 'h-full w-full object-contain object-center',
  signalCopy:
    'pointer-events-none absolute inset-0 flex flex-col justify-between p-4 transition-[opacity,translate,filter] duration-[260ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
  signalCopyInactive: 'translate-y-2.5 opacity-0 blur-[8px]',
  signalCopyActive: 'translate-y-0 opacity-100 blur-none',
  signalCopyHeader: 'flex items-start gap-3',
  signalCopySpacer: 'h-11 w-11 shrink-0',
  signalCopyTitleBlock: 'flex min-w-0 flex-1 flex-col gap-1 pt-0.5',
  signalCardEyebrow:
    'text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500',
  signalCardTitle:
    'text-[1rem] font-semibold leading-5 text-slate-900',
  signalCardDescription:
    'relative z-10 text-[0.86rem] leading-6 text-slate-700',
}
