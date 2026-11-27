import {
  getTwikooCommentsByPath,
  renderCommentHtml,
} from '@/lib/comments/twikooLoader'

/**
 * Inline "dashed underline" comments.
 *
 * The anchor is deliberately tiny: a block index plus offsets into the block's
 * text, with a short quote/prefix/suffix as a fallback when the article has
 * been edited since the comment was written. The whole anchor is encoded into
 * a link attached to a normal Twikoo comment, so no database or login is
 * needed — `getRecentComments` is the only read API we use.
 */

const ANCHOR_PARAM = 'annotation'
const MAX_QUOTE_LENGTH = 320
const MAX_MULTI_QUOTE_LENGTH = 600
const CONTEXT_LENGTH = 40
const LOCAL_LINES_KEY = 'blog-annotation-lines'

export interface TextAnchor {
  /** Random short id, shared by every comment written on the same selection. */
  id: string
  /** Index into `getBlocks()` for the selection's start. */
  b: number
  /** Optional end block index; omitted for older single-block anchors. */
  b2?: number
  /** Start offset in block `b`, end offset in block `b2` (or `b`). */
  s: number
  e: number
  /** Selected text, used as a fallback when offsets no longer match. */
  q: string
  /** Text before/after the selection, also for the fallback lookup. */
  p: string
  x: string
}

export interface AnnotationComment {
  id: string
  nick: string
  avatar?: string
  mailMd5?: string
  text: string
  created: number
  relativeTime?: string
  /** Label of the injected backlink, stripped from the displayed text. */
  linkText?: string
  /** Sanitized comment body, used when the comment contains OwO images. */
  html?: string
  /** Twikoo says whether this visitor may delete the comment. */
  isOwner?: boolean
}

export interface AnnotationGroup {
  anchor: TextAnchor
  comments: AnnotationComment[]
}

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li'
const SKIP_SELECTOR =
  'script, style, pre, code, .md-code-frame, .md-table-block, .katex, .annotation-inline-chip'

export function getBlocks(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
}

function collectTextNodes(block: HTMLElement): Text[] {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    const parent = text.parentElement
    if (
      parent &&
      !parent.closest(SKIP_SELECTOR) &&
      (text.textContent?.length ?? 0) > 0
    ) {
      nodes.push(text)
    }
    node = walker.nextNode()
  }
  return nodes
}

function flatText(nodes: Text[]): string {
  return nodes.map((node) => node.textContent ?? '').join('')
}

function offsetInBlock(
  block: HTMLElement,
  container: Node,
  offset: number
): number | null {
  const nodes = collectTextNodes(block)
  if (container.nodeType === Node.TEXT_NODE) {
    const index = nodes.indexOf(container as Text)
    if (index < 0) return null
    let total = 0
    for (let i = 0; i < index; i += 1) {
      total += nodes[i].textContent?.length ?? 0
    }
    return total + offset
  }
  // Element containers are rare for a mouse selection, but keep a safe
  // fallback that counts everything up to the caret.
  const range = document.createRange()
  range.selectNodeContents(block)
  try {
    range.setEnd(container, offset)
  } catch {
    return null
  }
  return range.toString().length
}

export function createShortId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  }
  return Math.random().toString(36).slice(2, 12)
}

/** Build an anchor from the current selection, including multi-paragraph ones. */
export function anchorFromSelection(
  root: HTMLElement,
  selection: Selection
): TextAnchor | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  const blockFor = (node: Node): HTMLElement | null =>
    ((node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as Element))?.closest?.(BLOCK_SELECTOR) as HTMLElement | null) ??
    null
  const startBlock = blockFor(range.startContainer)
  const endBlock = blockFor(range.endContainer)
  if (!startBlock || !endBlock || !root.contains(startBlock) || !root.contains(endBlock)) {
    return null
  }

  const start = offsetInBlock(startBlock, range.startContainer, range.startOffset)
  const end = offsetInBlock(endBlock, range.endContainer, range.endOffset)
  if (start === null || end === null) return null

  const blocks = getBlocks(root)
  const b = blocks.indexOf(startBlock)
  const b2 = blocks.indexOf(endBlock)
  if (b < 0 || b2 < 0 || b2 < b) return null

  const sameBlock = b === b2
  const quote = sameBlock
    ? flatText(collectTextNodes(startBlock)).slice(start, end)
    : selection.toString()
  if (!quote.trim()) return null
  if (sameBlock ? end <= start : false) return null
  if (quote.length > (sameBlock ? MAX_QUOTE_LENGTH : MAX_MULTI_QUOTE_LENGTH)) {
    return null
  }

  const startText = flatText(collectTextNodes(startBlock))
  const endText = flatText(collectTextNodes(endBlock))
  return {
    id: createShortId(),
    b,
    ...(sameBlock ? {} : { b2 }),
    s: start,
    e: end,
    q: quote,
    p: startText.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    x: endText.slice(end, end + CONTEXT_LENGTH),
  }
}

function pointAt(nodes: Text[], offset: number): { node: Text; offset: number } {
  let remaining = offset
  for (const node of nodes) {
    const length = node.textContent?.length ?? 0
    if (remaining <= length) return { node, offset: remaining }
    remaining -= length
  }
  const last = nodes[nodes.length - 1]
  return { node: last, offset: last.textContent?.length ?? 0 }
}

/** Locate the text again on a freshly rendered article. */
export function locateAnchor(root: HTMLElement, anchor: TextAnchor): Range | null {
  const blocks = getBlocks(root)
  const b2 = anchor.b2 ?? anchor.b
  const startBlock = blocks[anchor.b]
  const endBlock = blocks[b2]
  if (!startBlock || !endBlock) return null

  const nodes: Text[] = []
  const blockOffsets = new Map<number, number>()
  for (let i = anchor.b; i <= b2; i += 1) {
    const blockNodes = collectTextNodes(blocks[i])
    blockOffsets.set(i, flatText(nodes).length)
    nodes.push(...blockNodes)
  }
  if (!nodes.length) return null

  const text = flatText(nodes)
  const normalize = (value: string) => value.replace(/\s+/g, '')
  const normalizedQuote = normalize(anchor.q)
  if (!normalizedQuote) return null

  let start = (blockOffsets.get(anchor.b) ?? 0) + anchor.s
  let end = (blockOffsets.get(b2) ?? 0) + anchor.e
  if (normalize(text.slice(start, end)) !== normalizedQuote) {
    // Offsets drifted (the article was edited). Fall back to the first chunk
    // of the quote, keeping the original selection length.
    const probe = normalizedQuote.slice(0, 60)
    const normalizedIndex = normalize(text).indexOf(probe)
    if (normalizedIndex < 0) return null
    const length = Math.max(1, end - start)
    let raw = 0
    let count = 0
    while (raw < text.length && count < normalizedIndex) {
      if (/\s/.test(text[raw])) raw += 1
      else {
        raw += 1
        count += 1
      }
    }
    start = raw
    end = raw + length
  }
  if (end <= start || end > text.length) return null

  const from = pointAt(nodes, start)
  const to = pointAt(nodes, end)
  const range = document.createRange()
  try {
    range.setStart(from.node, from.offset)
    range.setEnd(to.node, to.offset)
  } catch {
    return null
  }
  return range
}

function markIds(mark: HTMLElement): string[] {
  return (mark.dataset.annotationIds ?? mark.dataset.annotationId ?? '')
    .split(',')
    .filter(Boolean)
}

function unwrapMark(mark: HTMLElement): void {
  const parent = mark.parentNode
  if (!parent) return
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
  mark.remove()
}

export function unwrapAnnotationMarks(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.annotation-mark').forEach(unwrapMark)
  root.querySelectorAll<HTMLElement>('.annotation-inline-chip').forEach((chip) => {
    chip.remove()
  })
}

/** Drop marks that no longer have an annotation, leaving live marks untouched. */
function pruneAnnotationMarks(root: HTMLElement, keepIds: Set<string>): void {
  root.querySelectorAll<HTMLElement>('.annotation-mark').forEach((mark) => {
    const ids = markIds(mark)
    const next = ids.filter((id) => keepIds.has(id))
    if (next.length === ids.length) return
    if (next.length === 0) {
      unwrapMark(mark)
      return
    }
    mark.dataset.annotationIds = next.join(',')
    mark.dataset.annotationId = next[0]
  })
}

/** Wrap every resolvable annotation with a clickable dashed underline. */
export function renderAnnotationMarks(
  root: HTMLElement,
  groups: AnnotationGroup[]
): void {
  pruneAnnotationMarks(
    root,
    new Set(groups.map((group) => group.anchor.id))
  )

  for (const group of groups) {
    const marked = Array.from(
      root.querySelectorAll<HTMLElement>('.annotation-mark')
    ).some((mark) => markIds(mark).includes(group.anchor.id))
    if (marked) continue

    const range = locateAnchor(root, group.anchor)
    if (!range) continue

    const collision = Array.from(
      root.querySelectorAll<HTMLElement>('.annotation-mark')
    ).find((mark) => range.intersectsNode(mark))
    if (collision) {
      const ids = markIds(collision)
      if (!ids.includes(group.anchor.id)) {
        collision.dataset.annotationIds = [...ids, group.anchor.id].join(',')
      }
      continue
    }

    const wrap = (target: Range) => {
      const mark = document.createElement('span')
      mark.className = 'annotation-mark'
      mark.dataset.annotationId = group.anchor.id
      mark.dataset.annotationIds = group.anchor.id
      mark.setAttribute('role', 'button')
      mark.setAttribute('tabindex', '0')
      mark.setAttribute('aria-label', '查看划线评论')
      try {
        mark.appendChild(target.extractContents())
        target.insertNode(mark)
      } catch {
        // A structurally odd range is simply left unmarked.
      }
    }

    const b2 = group.anchor.b2 ?? group.anchor.b
    if (b2 === group.anchor.b) {
      wrap(range)
      continue
    }

    // A Range spanning paragraphs cannot be wrapped by a single span without
    // breaking the block structure, so mark each paragraph segment separately
    // with the same id.
    const blocks = getBlocks(root)
    for (let i = group.anchor.b; i <= b2; i += 1) {
      const block = blocks[i]
      if (!block || !range.intersectsNode(block)) continue
      const segment = range.cloneRange()
      if (i !== group.anchor.b) segment.setStart(block, 0)
      if (i !== b2) segment.setEnd(block, block.childNodes.length)
      wrap(segment)
    }
  }
}

/** Add the small chip at the end of the paragraph being commented on. */
export function addInlineChip(root: HTMLElement, anchor: TextAnchor): void {
  if (
    root.querySelector(
      `.annotation-inline-chip[data-annotation-id="${CSS.escape(anchor.id)}"]`
    )
  ) {
    return
  }
  const block = getBlocks(root)[anchor.b]
  if (!block) return
  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = 'annotation-inline-chip'
  chip.dataset.annotationId = anchor.id
  chip.setAttribute('aria-label', '查看划线评论')

  // A quiet outline icon instead of an emoji chip: no fill, no border of its
  // own, just the same message glyph Twikoo-style comments use elsewhere.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.8')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute(
    'd',
    'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z'
  )
  svg.appendChild(path)
  chip.appendChild(svg)
  block.appendChild(chip)
}

/** Reconcile chips with the anchors that currently need one. */
export function syncInlineChips(root: HTMLElement, anchors: TextAnchor[]): void {
  const keepIds = new Set(anchors.map((anchor) => anchor.id))
  root.querySelectorAll<HTMLElement>('.annotation-inline-chip').forEach((chip) => {
    if (!keepIds.has(chip.dataset.annotationId ?? '')) chip.remove()
  })
  anchors.forEach((anchor) => addInlineChip(root, anchor))
}

/** Attach a Twikoo comment to an anchor without adding a backend. */
export function buildAnnotationPayload(
  anchor: TextAnchor,
  text: string,
  linkLabel: string
): { markdown: string; comment: string } {
  const encoded = encodeURIComponent(JSON.stringify(anchor)).replace(
    /[()]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  const url = `${window.location.origin}${window.location.pathname}?${ANCHOR_PARAM}=${encoded}`
  return {
    markdown: `${text}\n\n[${linkLabel}](${url})`,
    comment: `${renderCommentHtml(text)}<p><a href="${url}" data-annotation-link="${anchor.id}">${linkLabel}</a></p>`,
  }
}

function readAnchor(html: string): TextAnchor | null {
  const match = html.match(/annotation=([^"'<>\s]+)/)
  if (!match) return null
  try {
    const raw = JSON.parse(decodeURIComponent(match[1])) as Partial<TextAnchor>
    if (
      typeof raw.id !== 'string' ||
      typeof raw.b !== 'number' ||
      typeof raw.s !== 'number' ||
      typeof raw.e !== 'number' ||
      typeof raw.q !== 'string'
    ) {
      return null
    }
    return {
      id: raw.id,
      b: raw.b,
      ...(typeof raw.b2 === 'number' ? { b2: raw.b2 } : {}),
      s: raw.s,
      e: raw.e,
      q: raw.q,
      p: typeof raw.p === 'string' ? raw.p : '',
      x: typeof raw.x === 'string' ? raw.x : '',
    }
  } catch {
    return null
  }
}

function localStoreKey(path: string): string {
  return `${LOCAL_LINES_KEY}:${path}`
}

/** Lines drawn with the 画线 action, kept locally until someone comments. */
export function loadLocalLines(path: string): TextAnchor[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(localStoreKey(path))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TextAnchor[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.b === 'number' &&
        typeof item.q === 'string'
    )
  } catch {
    return []
  }
}

export function saveLocalLine(path: string, anchor: TextAnchor): void {
  if (typeof window === 'undefined') return
  const lines = loadLocalLines(path).filter((line) => line.id !== anchor.id)
  lines.push(anchor)
  try {
    window.localStorage.setItem(localStoreKey(path), JSON.stringify(lines))
  } catch {
    // Storage may be blocked; the line still shows for this page view.
  }
}

export function deleteLocalLine(path: string, id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      localStoreKey(path),
      JSON.stringify(loadLocalLines(path).filter((line) => line.id !== id))
    )
  } catch {
    // Nothing to do when storage is unavailable.
  }
}

/**
 * Keep only the safe, simple markup our side composer needs: paragraphs,
 * line breaks and http(s) OwO images. The injected 回到原文 link is removed
 * from the displayed body but its label is still available as `linkText`.
 */
function sanitizeCommentBody(doc: Document): string {
  const host = document.createElement('div')

  const inline = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? '')
    }
    if (!(node instanceof HTMLElement)) return null
    if (
      node instanceof HTMLAnchorElement &&
      node.hasAttribute('data-annotation-link')
    ) {
      return null
    }
    if (node instanceof HTMLImageElement) {
      const src = node.getAttribute('src') ?? ''
      if (!/^https?:\/\//i.test(src)) return null
      const image = document.createElement('img')
      image.src = src
      image.alt = node.getAttribute('alt') ?? ''
      image.className = 'annotation-emotion-img'
      return image
    }
    if (node instanceof HTMLBRElement) return document.createElement('br')
    if (node.tagName === 'P') {
      const paragraph = document.createElement('p')
      node.childNodes.forEach((child) => {
        const kept = inline(child)
        if (kept) paragraph.appendChild(kept)
      })
      return paragraph
    }

    const fragment = document.createDocumentFragment()
    node.childNodes.forEach((child) => {
      const kept = inline(child)
      if (kept) fragment.appendChild(kept)
    })
    return fragment
  }

  doc.body.childNodes.forEach((node) => {
    const kept = inline(node)
    if (kept) host.appendChild(kept)
  })
  return host.innerHTML
}

/** Fetch annotation comments for one article from Twikoo. */
export async function loadAnnotationGroups(
  path: string
): Promise<AnnotationGroup[]> {
  if (typeof window === 'undefined' || window.__PRERENDER__) return []
  try {
    const comments = await getTwikooCommentsByPath(path)
    const groups = new Map<string, AnnotationGroup>()
    for (const comment of comments) {
      const html = comment.comment ?? ''
      const anchor = readAnchor(html)
      if (!anchor) continue
      const group = groups.get(anchor.id) ?? { anchor, comments: [] }
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const linkText =
        doc.querySelector('a[data-annotation-link]')?.textContent ?? undefined
      // Twikoo's COMMENT_GET returns rendered HTML only; derive the plain text
      // the same way its own UI does when there is no markdown field.
      const text = doc.body.textContent ?? ''
      group.comments.push({
        id: comment.id,
        nick: comment.nick || '匿名',
        avatar: comment.avatar,
        mailMd5: comment.mailMd5,
        text,
        created: comment.created,
        linkText,
        html: sanitizeCommentBody(doc),
        isOwner: comment.isOwner === true,
      })
      groups.set(anchor.id, group)
    }
    for (const anchor of loadLocalLines(path)) {
      if (!groups.has(anchor.id)) groups.set(anchor.id, { anchor, comments: [] })
    }
    return Array.from(groups.values())
  } catch {
    return loadLocalLines(path).map((anchor) => ({ anchor, comments: [] }))
  }
}
