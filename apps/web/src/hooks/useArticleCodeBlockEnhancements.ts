import { useEffect, type RefObject } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-ini'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'
import 'prismjs/plugins/line-numbers/prism-line-numbers'

const COLLAPSE_LINE_THRESHOLD = 10

const LANGUAGE_ALIASES: Record<string, string> = {
  'c++': 'cpp',
  html: 'markup',
  md: 'markdown',
  plaintext: 'plain',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  text: 'plain',
  ts: 'typescript',
  xml: 'markup',
  yml: 'yaml',
  zsh: 'bash',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function extractLanguage(code: HTMLElement) {
  const className = code.className || ''
  const match = className.match(/language-([a-z0-9#+-]+)/i)
  return match?.[1] || ''
}

function normalizeLanguage(language: string) {
  const normalized = language.trim().toLowerCase()
  return LANGUAGE_ALIASES[normalized] || normalized
}

function getLanguageLabel(language: string, plainTextLabel: string) {
  return language || plainTextLabel
}

function getCodeLineCount(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').replace(/\n$/, '')
  return normalized ? normalized.split('\n').length : 1
}

function getDirectCodeElement(pre: HTMLPreElement) {
  return Array.from(pre.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName === 'CODE'
  )
}

export interface CodeBlockEnhancementLabels {
  copy: string
  copied: string
  plainText: string
  wrap: string
  scroll: string
  expand: string
  collapse: string
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function updateWrapButton(
  button: HTMLButtonElement,
  isWrapped: boolean,
  labels: CodeBlockEnhancementLabels
) {
  button.textContent = isWrapped ? labels.wrap : labels.scroll
  button.setAttribute('aria-pressed', String(isWrapped))
  button.setAttribute('aria-label', isWrapped ? labels.wrap : labels.scroll)
}

function updateExpandButton(
  button: HTMLButtonElement,
  isExpanded: boolean,
  labels: CodeBlockEnhancementLabels
) {
  button.textContent = isExpanded ? labels.collapse : labels.expand
  button.setAttribute('aria-expanded', String(isExpanded))
}

export function useArticleCodeBlockEnhancements(
  containerRef: RefObject<HTMLElement | null>,
  labels: CodeBlockEnhancementLabels,
  contentKey?: string
) {
  const { collapse, copied, copy, expand, plainText, scroll, wrap } = labels

  useEffect(() => {
    if (window.__PRERENDER__) return

    let raf = 0
    let attempt = 0
    const maxAttempts = 8
    const timeouts: number[] = []
    let observer: MutationObserver | undefined
    const activeLabels = {
      collapse,
      copied,
      copy,
      expand,
      plainText,
      scroll,
      wrap,
    }

    const enhance = () => {
      const container = containerRef.current
      if (!container) return false

      const codeBlocks = Array.from(container.querySelectorAll('pre'))
      if (codeBlocks.length === 0) return false

      codeBlocks.forEach((pre) => {
        if (!(pre instanceof HTMLPreElement)) return
        if (pre.closest('.md-code-frame')) {
          return
        }

        const code = getDirectCodeElement(pre)
        if (!code) return

        try {
          const rawCode = code.textContent || ''
          const originalLanguage = extractLanguage(code)
          const prismLanguage = normalizeLanguage(originalLanguage)
          const languageLabel = getLanguageLabel(
            originalLanguage,
            activeLabels.plainText
          )
          const lineCount = getCodeLineCount(rawCode)

          pre.classList.add('md-code-pre', 'line-numbers')
          pre.classList.add(`language-${prismLanguage || 'plain'}`)
          code.classList.add('md-code-content')

          if (prismLanguage && Prism.languages[prismLanguage]) {
            code.className = `md-code-content language-${prismLanguage}`
            code.textContent = rawCode
          } else {
            code.className = 'md-code-content language-plain'
            code.innerHTML = escapeHtml(rawCode)
          }

          const frame = document.createElement('div')
          frame.className = 'md-code-frame not-prose'
          frame.setAttribute('data-code-language', prismLanguage || 'plain')
          frame.setAttribute('data-wrap', 'true')

          const toolbar = document.createElement('div')
          toolbar.className = 'md-code-toolbar'

          const languageBadge = document.createElement('span')
          languageBadge.className = 'md-code-language'
          languageBadge.textContent = languageLabel

          const actions = document.createElement('div')
          actions.className = 'md-code-actions'

          const wrapButton = document.createElement('button')
          wrapButton.type = 'button'
          wrapButton.className = 'md-code-action'
          updateWrapButton(wrapButton, true, activeLabels)

          const copyButton = document.createElement('button')
          copyButton.type = 'button'
          copyButton.className = 'md-code-action'
          copyButton.setAttribute('aria-label', activeLabels.copy)
          copyButton.setAttribute('data-copy-state', 'idle')
          copyButton.textContent = activeLabels.copy

          actions.append(wrapButton, copyButton)
          toolbar.append(languageBadge, actions)

          const body = document.createElement('div')
          body.className = 'md-code-body'

          let expandButton: HTMLButtonElement | null = null
          if (lineCount > COLLAPSE_LINE_THRESHOLD) {
            frame.classList.add('is-collapsible', 'is-collapsed')
            expandButton = document.createElement('button')
            expandButton.type = 'button'
            expandButton.className = 'md-code-expand'
            updateExpandButton(expandButton, false, activeLabels)
          }

          pre.replaceWith(frame)
          body.append(pre)
          frame.append(toolbar, body)
          if (expandButton) {
            frame.append(expandButton)
          }

          if (prismLanguage && Prism.languages[prismLanguage]) {
            Prism.highlightElement(code)
          }
          Prism.plugins.lineNumbers?.resize?.(pre)

          const handleWrapToggle = () => {
            const nextWrapped = frame.getAttribute('data-wrap') !== 'true'
            frame.setAttribute('data-wrap', String(nextWrapped))
            updateWrapButton(wrapButton, nextWrapped, activeLabels)
            Prism.plugins.lineNumbers?.resize?.(pre)
          }

          const handleCopy = async () => {
            try {
              await copyToClipboard(rawCode)
              copyButton.setAttribute('aria-label', activeLabels.copied)
              copyButton.setAttribute('data-copy-state', 'copied')
              copyButton.textContent = activeLabels.copied
              copyButton.disabled = true
              window.setTimeout(() => {
                copyButton.setAttribute('aria-label', activeLabels.copy)
                copyButton.setAttribute('data-copy-state', 'idle')
                copyButton.textContent = activeLabels.copy
                copyButton.disabled = false
              }, 1500)
            } catch (error) {
              console.error('Failed to copy code block', error)
            }
          }

          const handleExpandToggle = () => {
            if (!expandButton) return
            const nextExpanded = frame.classList.contains('is-collapsed')
            frame.classList.toggle('is-collapsed', !nextExpanded)
            updateExpandButton(expandButton, nextExpanded, activeLabels)
          }

          wrapButton.addEventListener('click', handleWrapToggle)
          copyButton.addEventListener('click', handleCopy)
          expandButton?.addEventListener('click', handleExpandToggle)
        } catch (error) {
          console.error('Failed to enhance code block', error)
        }
      })

      return true
    }

    const scheduleEnhance = () => {
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const didEnhance = enhance()
        attempt += 1
        if (!didEnhance && attempt < maxAttempts) {
          timeouts.push(window.setTimeout(scheduleEnhance, 50))
        }
      })
    }

    scheduleEnhance()
    if (containerRef.current) {
      observer = new MutationObserver(() => {
        attempt = 0
        if (!raf) scheduleEnhance()
      })
      observer.observe(containerRef.current, {
        childList: true,
      })
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      observer?.disconnect()
    }
  }, [
    containerRef,
    contentKey,
    collapse,
    copied,
    copy,
    expand,
    plainText,
    scroll,
    wrap,
  ])
}
