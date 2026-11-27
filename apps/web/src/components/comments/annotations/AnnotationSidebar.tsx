import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import Avatar from 'boring-avatars'
import { FiSmile, FiTrash2, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAnnotations } from './AnnotationProvider'
import { buildAnnotationPayload } from '@/lib/comments/textAnnotations'
import {
  AVATAR_COLORS,
  AVATAR_VARIANT,
  resolveTwikooAvatarUrl,
} from '@/lib/comments/commentAvatar'
import {
  getTwikooUserMeta,
  loadEmotionPack,
  saveTwikooUserMeta,
  submitCommentToPath,
  type EmotionPack,
} from '@/lib/comments/twikooLoader'

const EMOTION_CDN =
  import.meta.env.VITE_TWIKOO_EMOTION_CDN ||
  (typeof window === 'undefined'
    ? '/emotions/owo.json'
    : new URL('/emotions/owo.json', window.location.origin).toString())

const EMOTION_HEIGHT_KEY = 'blog-annotation-emotion-height'
const MIN_EMOTION_HEIGHT = 160
const MAX_EMOTION_HEIGHT = 480
const DEFAULT_EMOTION_HEIGHT = 260

const clampEmotionHeight = (value: number) =>
  Math.min(MAX_EMOTION_HEIGHT, Math.max(MIN_EMOTION_HEIGHT, value))

/** OwO packs store image emotions as an <img> string inside `icon`. */
function emotionValue(
  item: Record<string, string>,
  type: string,
  fallbackLabel: string
): string {
  const icon = item.icon ?? ''
  if (type !== 'image') return icon
  const url = icon.match(/<img[^>]+src=(['"])(.*?)\1/i)?.[2]
  if (!url || !/^https?:\/\//i.test(url)) return ''
  // Markdown links break on unescaped parentheses (our own anchors have the
  // same issue), so encode them while leaving the rest of the CDN URL intact.
  const safeUrl = url.replace(/[()\s]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  return `![${item.text || fallbackLabel}](${safeUrl})`
}

function emotionImageUrl(icon: string): string | null {
  const url = icon.match(/<img[^>]+src=(['"])(.*?)\1/i)?.[2]
  return url && /^https?:\/\//i.test(url) ? url : null
}

const MAIL_HASH = /^(?:[a-f0-9]{32}|[a-f0-9]{64})$/i

/**
 * Show the very same picture the bottom Twikoo list uses. Self-hosted
 * `COMMENT_GET` returns `avatar: null` but does supply `mailMd5`, so resolve
 * Twikoo's CDN image with the same probe the bottom widget applies before it
 * decides to fall back to a locally generated avatar.
 */
function CommentAvatar({
  avatar,
  mailMd5,
  nick,
}: {
  avatar?: string
  mailMd5?: string
  nick: string
}) {
  const directUrl = avatar && /^https?:\/\//i.test(avatar) ? avatar : null
  const hash = mailMd5 && MAIL_HASH.test(mailMd5) ? mailMd5 : null
  const [url, setUrl] = useState<string | null>(directUrl)
  const [ready, setReady] = useState(Boolean(directUrl) || !hash)

  useEffect(() => {
    setUrl(directUrl)
    setReady(Boolean(directUrl) || !hash)
    if (directUrl || !hash) return
    let alive = true
    void resolveTwikooAvatarUrl(hash, nick).then((resolved) => {
      if (!alive) return
      setUrl(resolved)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [directUrl, hash, nick])

  return (
    <div
      className="annotation-viewer-avatar"
      data-avatar-state={ready ? undefined : 'pending'}
    >
      {!ready ? null : url ? (
        <img src={url} alt="" referrerPolicy="no-referrer" />
      ) : (
        <Avatar
          size="100%"
          name={hash || nick}
          variant={AVATAR_VARIANT}
          colors={AVATAR_COLORS}
          square
        />
      )}
    </div>
  )
}

/**
 * A small composer that writes into the SAME Twikoo comment stream as the
 * bottom section. Twikoo 2 only supports one mounted widget at a time, so this
 * panel posts directly instead of calling `init()` a second time — that way
 * the bottom comment area stays visible and untouched.
 */
export function AnnotationSidebar({
  commentPath,
  fallback,
}: {
  commentPath: string
  fallback: ReactNode
}) {
  const { t } = useTranslation()
  const {
    draft,
    closing,
    composerMode,
    composerPosition,
    openComposer,
    closeComposer,
    finishClose,
    onSaved,
    groups,
    deleteComment,
  } = useAnnotations()
  const [isMobile, setIsMobile] = useState(false)
  const [hasIdentity, setHasIdentity] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [pack, setPack] = useState<EmotionPack | null>(null)
  const [activeGroup, setActiveGroup] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [emotionHeight, setEmotionHeight] = useState(DEFAULT_EMOTION_HEIGHT)
  const [emotionPosition, setEmotionPosition] = useState({
    left: 0,
    top: 0,
    placement: 'bottom' as 'bottom' | 'top',
  })
  const [resizingEmotion, setResizingEmotion] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composeCardRef = useRef<HTMLElement>(null)
  const quickRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const emotionPanelRef = useRef<HTMLDivElement>(null)
  const emotionHeightRef = useRef(emotionHeight)
  const resizeStartRef = useRef<{ y: number; height: number } | null>(null)
  emotionHeightRef.current = emotionHeight

  const showQuick = isMobile && composerMode === 'quick'

  // Only the animated root should end the closing state; child animations
  // finishing earlier must not unmount the panel mid-exit.
  const handleExitEnd = (event: ReactAnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || !closing) return
    finishClose()
  }

  // The right sidebar is `hidden lg:block`; on phones both the composer and
  // the emotion picker become centered dialogs instead of bottom sheets.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EMOTION_HEIGHT_KEY)
      if (saved) setEmotionHeight(clampEmotionHeight(Number(saved) || DEFAULT_EMOTION_HEIGHT))
    } catch {
      // Storage may be blocked; the default height still works.
    }
  }, [])

  useEffect(() => {
    let alive = true
    void loadEmotionPack(EMOTION_CDN).then((loaded) => {
      if (!alive || !loaded) return
      setPack(loaded)
      setActiveGroup((current) =>
        current && loaded[current] ? current : Object.keys(loaded)[0] ?? ''
      )
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    setHasIdentity(Boolean(getTwikooUserMeta().nick.trim()))
    setText('')
    setError('')
    setEmojiOpen(false)
    setComposerExpanded(false)
  }, [draft?.id])

  // Grow with what the visitor has typed; the native bottom-right resize grip
  // is deliberately gone from both editors.
  useLayoutEffect(() => {
    const field = textareaRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, 360)}px`
  }, [text, composerExpanded, showQuick])

  // Clicking away below the editor cancels this draft, just like Twikoo's
  // default composer. The emotion portal is part of the editor, so it stays.
  useEffect(() => {
    if (!composerExpanded) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        composeCardRef.current?.contains(target) ||
        pickerRef.current?.contains(target) ||
        emotionPanelRef.current?.contains(target)
      ) {
        return
      }
      setComposerExpanded(false)
      setText('')
      setError('')
      setEmojiOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [composerExpanded])

  // The picker lives in a body portal so the sticky aside cannot clip it.
  // Anchor it to the trigger, open downwards by default, and flip upwards only
  // when there is not enough room below.
  const updateEmotionPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(300, window.innerWidth - 24)
    const height = Math.min(emotionHeight, window.innerHeight - 24)
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12)
    const roomBelow = window.innerHeight - rect.bottom - 8
    const roomAbove = rect.top - 8
    const placement =
      roomBelow >= Math.min(height, 180) || roomBelow >= roomAbove
        ? 'bottom'
        : 'top'
    const top =
      placement === 'bottom'
        ? rect.bottom + 8
        : Math.max(12, rect.top - height - 8)
    setEmotionPosition({ left, top, placement })
  }, [emotionHeight])

  useEffect(() => {
    if (!emojiOpen || isMobile) return
    updateEmotionPosition()
    window.addEventListener('resize', updateEmotionPosition)
    window.addEventListener('scroll', updateEmotionPosition, true)
    return () => {
      window.removeEventListener('resize', updateEmotionPosition)
      window.removeEventListener('scroll', updateEmotionPosition, true)
    }
  }, [emojiOpen, isMobile, updateEmotionPosition])

  useEffect(() => {
    if (!emojiOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        pickerRef.current?.contains(target) ||
        emotionPanelRef.current?.contains(target)
      ) {
        return
      }
      setEmojiOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [emojiOpen])

  useEffect(() => {
    if (!showQuick) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        quickRef.current?.contains(target) ||
        emotionPanelRef.current?.contains(target)
      ) {
        return
      }
      closeComposer()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [closeComposer, showQuick])

  useEffect(() => {
    if (!emojiOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setEmojiOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [emojiOpen])

  useEffect(() => {
    if (!isMobile || !draft || emojiOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeComposer()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMobile, draft, emojiOpen, closeComposer])

  const startEmotionResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    resizeStartRef.current = { y: event.clientY, height: emotionHeight }
    setResizingEmotion(true)
    const onMove = (move: PointerEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      const next = clampEmotionHeight(start.height + start.y - move.clientY)
      emotionHeightRef.current = next
      setEmotionHeight(next)
    }
    const onUp = () => {
      resizeStartRef.current = null
      setResizingEmotion(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      try {
        window.localStorage.setItem(
          EMOTION_HEIGHT_KEY,
          String(emotionHeightRef.current)
        )
      } catch {
        // Resizing still works for this session when storage is blocked.
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const emotionGroups = useMemo(
    () => (pack ? Object.entries(pack) : []),
    [pack]
  )
  const currentEmotions = activeGroup ? pack?.[activeGroup] : undefined

  if (!draft) return <>{fallback}</>

  const lineComments =
    groups.find((group) => group.anchor.id === draft.id)?.comments ?? []

  // Like the bottom Twikoo composer, the side input starts as a quiet gray
  // strip and only grows into an editor once it is clicked.
  const expandComposer = () => {
    setComposerExpanded(true)
    setHasIdentity(Boolean(getTwikooUserMeta().nick.trim()))
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const insertEmotion = (item: Record<string, string>, type: string) => {
    const value = emotionValue(
      item,
      type,
      t('annotation.emotionFallback', '表情')
    )
    if (!value) return
    const field = textareaRef.current
    const start = field?.selectionStart ?? text.length
    const end = field?.selectionEnd ?? text.length
    setText(`${text.slice(0, start)}${value}${text.slice(end)}`)
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(start + value.length, start + value.length)
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sending) return
    if (!text.trim()) return

    const meta = getTwikooUserMeta()
    if (!meta.nick.trim()) {
      setHasIdentity(false)
      setError(t('annotation.identityRequired', '请先在下方评论区填写昵称后再评论。'))
      return
    }

    setSending(true)
    setError('')
    try {
      const payload = buildAnnotationPayload(
        draft,
        text.trim(),
        t('annotation.backlink', '回到原文')
      )
      await submitCommentToPath(commentPath, { ...meta, ...payload })
      saveTwikooUserMeta(meta)
      setText('')
      setHasIdentity(true)
      setEmojiOpen(false)
      setComposerExpanded(true)
      onSaved()
      if (showQuick) openComposer(draft, 'detail')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSending(false)
    }
  }

  const emotionPanelHeight =
    typeof window === 'undefined'
      ? emotionHeight
      : Math.min(
          emotionHeight,
          window.innerHeight - (isMobile ? 96 : 24)
        )

  const emotionPanelBody = (
    <>
      {isMobile ? (
        <div className="annotation-emotion-modal-header">
          <span>{t('annotation.emotion', '插入表情')}</span>
          <button
            type="button"
            aria-label={t('annotation.close', '关闭')}
            onClick={() => setEmojiOpen(false)}
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div className="annotation-emotion-tabs">
        {emotionGroups.map(([name]) => (
          <button
            type="button"
            key={name}
            className={activeGroup === name ? 'is-active' : undefined}
            onClick={() => setActiveGroup(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="annotation-emotion-items"
        data-type={currentEmotions?.type ?? undefined}
      >
        {currentEmotions?.container.map((item, index) => {
          const type = currentEmotions.type
          const imageUrl =
            type === 'image' ? emotionImageUrl(item.icon ?? '') : null
          return (
            <button
              type="button"
              key={`${activeGroup}-${index}`}
              title={item.text || undefined}
              onClick={() => insertEmotion(item, type)}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.text || t('annotation.emotionFallback', '表情')}
                />
              ) : (
                item.icon
              )}
            </button>
          )
        })}
      </div>
      <div
        className="annotation-emotion-resize"
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('annotation.emotionResize', '拖动调整表情面板高度')}
        title={t('annotation.emotionResize', '拖动调整表情面板高度')}
        onPointerDown={startEmotionResize}
        onDoubleClick={() => {
          setEmotionHeight(DEFAULT_EMOTION_HEIGHT)
          try {
            window.localStorage.removeItem(EMOTION_HEIGHT_KEY)
          } catch {
            // Ignore blocked storage.
          }
        }}
      />
    </>
  )

  const emotionPanel =
    emojiOpen && pack
      ? isMobile
        ? createPortal(
            <div
              className="annotation-emotion-backdrop"
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setEmojiOpen(false)
              }}
            >
              <div
                ref={emotionPanelRef}
                className={`annotation-emotion-panel annotation-emotion-panel-modal${
                  resizingEmotion ? ' is-resizing' : ''
                }${closing ? ' is-closing' : ''}`}
                role="dialog"
                aria-modal="true"
                style={{ height: emotionPanelHeight }}
              >
                {emotionPanelBody}
              </div>
            </div>,
            document.body
          )
        : createPortal(
            <div
              ref={emotionPanelRef}
              className={`annotation-emotion-panel${
                resizingEmotion ? ' is-resizing' : ''
              }${closing ? ' is-closing' : ''}`}
              data-placement={emotionPosition.placement}
              style={{
                left: emotionPosition.left,
                top: emotionPosition.top,
                height: emotionPanelHeight,
              }}
            >
              {emotionPanelBody}
            </div>,
            document.body
          )
      : null

  const panel = (
    <div
      className={`annotation-sidebar${closing ? ' is-closing' : ''}`}
      onAnimationEnd={handleExitEnd}
    >
      <div className="annotation-sidebar-header">
        <h3>{t('annotation.title', '划线评论')}</h3>
        <button
          type="button"
          onClick={closeComposer}
          aria-label={t('annotation.close', '关闭划线评论')}
        >
          <FiX aria-hidden="true" />
        </button>
      </div>

      <div className="annotation-sidebar-stack">
        <section className="annotation-sidebar-card annotation-sidebar-card-comments">
          {lineComments.length ? (
            <div className="annotation-sidebar-comments">
              {lineComments.map((comment) => (
                <div className="annotation-viewer-comment" key={comment.id}>
                  <div className="annotation-viewer-head">
                    <CommentAvatar
                      avatar={comment.avatar}
                      mailMd5={comment.mailMd5}
                      nick={comment.nick}
                    />
                    <div className="annotation-viewer-meta">
                      <span className="annotation-viewer-nick">{comment.nick}</span>
                      <span className="annotation-viewer-time">
                        {comment.relativeTime ??
                          new Date(comment.created).toLocaleDateString()}
                      </span>
                    </div>
                    {comment.isOwner ? (
                      <button
                        type="button"
                        className="annotation-comment-delete"
                        aria-label={t('annotation.deleteComment', '删除评论')}
                        onClick={() => {
                          if (
                            window.confirm(
                              t(
                                'annotation.deleteCommentConfirm',
                                '确认删除这条评论？'
                              )
                            )
                          ) {
                            void deleteComment(comment.id)
                          }
                        }}
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div className="annotation-viewer-body">
                    {comment.html ? (
                      <div
                        className="annotation-viewer-comment-body"
                        dangerouslySetInnerHTML={{ __html: comment.html }}
                      />
                    ) : (
                      <p>
                        {comment.linkText
                          ? comment.text.split(comment.linkText).join('').trim()
                          : comment.text}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="annotation-viewer-empty">
              {t('annotation.empty', '还没有评论')}
            </p>
          )}
        </section>

        <section
          ref={composeCardRef}
          className={`annotation-sidebar-card annotation-sidebar-card-compose${
            composerExpanded ? ' is-open' : ''
          }`}
        >
          {composerExpanded ? (
            <>
              {hasIdentity ? null : (
                <p className="annotation-identity-hint">
                  {t(
                    'annotation.identityHint',
                    '请先在下方评论区填写昵称、邮箱和网址，再在这里评论。'
                  )}
                </p>
              )}

              <form className="annotation-form" onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  className="annotation-form-text"
                  value={text}
                  onFocus={() =>
                    setHasIdentity(Boolean(getTwikooUserMeta().nick.trim()))
                  }
                  onChange={(event) => setText(event.target.value)}
                  placeholder={t('annotation.placeholder', '想要说点什么？')}
                  rows={1}
                  maxLength={500}
                />

                {error ? <p className="annotation-form-error">{error}</p> : null}

                <div className="annotation-form-actions">
                  <div className="annotation-emotion" ref={pickerRef}>
                    <button
                      ref={triggerRef}
                      type="button"
                      className={`annotation-emotion-trigger${
                        emojiOpen ? ' is-open' : ''
                      }`}
                      aria-label={t('annotation.emotion', '插入表情')}
                      title={t('annotation.emotion', '插入表情')}
                      aria-expanded={emojiOpen}
                      disabled={!pack}
                      onClick={() => setEmojiOpen((open) => !open)}
                    >
                      <FiSmile aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="annotation-form-submit"
                    disabled={sending || !text.trim()}
                  >
                    {sending
                      ? t('annotation.sending', '发送中…')
                      : t('annotation.submit', '发送')}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <button
              type="button"
              className="annotation-compose-collapsed"
              aria-label={t('annotation.placeholder', '想要说点什么？')}
              onClick={expandComposer}
            >
              <span>{t('annotation.placeholder', '想要说点什么？')}</span>
            </button>
          )}
        </section>
      </div>
    </div>
  )

  const quickBar =
    showQuick && composerPosition
      ? (() => {
          const width = Math.min(320, window.innerWidth - 24)
          const left = Math.min(
            Math.max(width / 2 + 12, composerPosition.x),
            window.innerWidth - width / 2 - 12
          )
          const top = Math.min(
            Math.max(
              12,
              composerPosition.y + (composerPosition.above ? -76 : 8)
            ),
            window.innerHeight - 84
          )
          return createPortal(
            <div
              ref={quickRef}
              className={`annotation-quick-bar${closing ? ' is-closing' : ''}`}
              role="dialog"
              onAnimationEnd={handleExitEnd}
              aria-label={t('annotation.title', '评论')}
              style={{ left, top }}
            >
              <form className="annotation-quick-form" onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  className="annotation-quick-input"
                  value={text}
                  rows={1}
                  maxLength={500}
                  placeholder={t('annotation.placeholder', '想要说点什么？')}
                  onFocus={() =>
                    setHasIdentity(Boolean(getTwikooUserMeta().nick.trim()))
                  }
                  onChange={(event) => setText(event.target.value)}
                />
                {error ? (
                  <p className="annotation-form-error">{error}</p>
                ) : null}
                <div className="annotation-quick-actions">
                  <div className="annotation-emotion" ref={pickerRef}>
                    <button
                      ref={triggerRef}
                      type="button"
                      className={`annotation-emotion-trigger${
                        emojiOpen ? ' is-open' : ''
                      }`}
                      aria-label={t('annotation.emotion', '插入表情')}
                      title={t('annotation.emotion', '插入表情')}
                      aria-expanded={emojiOpen}
                      disabled={!pack}
                      onClick={() => setEmojiOpen((open) => !open)}
                    >
                      <FiSmile aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="annotation-form-submit"
                    disabled={sending || !text.trim()}
                  >
                    {sending
                      ? t('annotation.sending', '发送中…')
                      : t('annotation.submit', '发送')}
                  </button>
                </div>
              </form>
            </div>,
            document.body
          )
        })()
      : null

  const dialog = showQuick
    ? null
    : isMobile
      ? createPortal(
          <div
            className={`annotation-modal-backdrop${
              closing ? ' is-closing' : ''
            }`}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeComposer()
            }}
          >
            <div
              className={`annotation-modal${closing ? ' is-closing' : ''}`}
              role="dialog"
              onAnimationEnd={handleExitEnd}
              aria-modal="true"
              aria-label={t('annotation.title', '评论')}
            >
              {panel}
            </div>
          </div>,
          document.body
        )
      : panel

  return (
    <>
      {dialog}
      {quickBar}
      {emotionPanel}
    </>
  )
}
