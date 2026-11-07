/**
 * Avatar / favicon URLs keyed by the site key used in
 * `links.json`, `sites.json` and the Radar config.
 *
 * Prefers each site's own real avatar image when one is available;
 * otherwise falls back to Google's public favicon service, which returns
 * the site's favicon at the requested size. Keeping these as URLs
 * (instead of bundling PNGs) keeps the repo and the client bundle smaller.
 *
 * Waterfall (水拍石 / leitao) keeps a locally bundled favicon because its
 * logo cannot be fetched from Google's service / the site's own URL.
 */
import leitaoFavicon from '@/assets/home/radar/leitao.png'

const G = (domain: string, size = 64) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`

export const REMOTE_AVATARS: Record<string, string> = {
  // Real avatar URLs where we found them.
  leitao: leitaoFavicon,
  lmb: 'https://files.blog.lmb.blue/assets/img/logo/pink-black.png',

  // Google favicon service fallback, keyed by canonical domain.
  blurredcode: G('www.blurredcode.com'),
  dbushell: G('dbushell.com'),
  distill: G('distill.pub'),
  eventuallymaking: G('eventuallymaking.io'),
  geokash: G('geokash.com'),
  innei: G('innei.in'),
  joshwcomeau: G('www.joshwcomeau.com'),
  lucumr: G('lucumr.pocoo.org'),
  messenger: G('messenger.abeto.co'),
  'nineteen-hundred': G('1900.live'),
  pathos: G('pathos.page'),
  'peter-oravec': G('peteroravec.com'),
  radiogarden: G('radio.garden'),
  ragnote: G('ragnote.top'),
  rleonardi: G('rleonardi.com'),
  ruanyifeng: G('www.ruanyifeng.com'),
  spaces: G('spaces.ac.cn'),
  tongliao: G('tongliaouniverse.cn'),
  ttquk: G('ttquk.github.io'),
  uselessweb: G('theuselessweb.com'),
  victorzhou: G('victorzhou.com'),
  yunyitang: G('www.yunyitang.me'),
  zhheo: G('blog.zhheo.com'),
  zhilu: G('blog.zhilu.site'),
}