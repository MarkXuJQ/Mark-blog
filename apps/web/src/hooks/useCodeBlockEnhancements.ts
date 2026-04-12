import { createElement, useEffect, type RefObject } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdown from 'highlight.js/lib/languages/markdown'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import { MdContentCopy } from 'react-icons/md'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('zsh', bash)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('go', go)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('toml', ini)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('jsx', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)
hljs.registerLanguage('txt', plaintext)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('rs', rust)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)

const COPY_ICON_MARKUP = renderToStaticMarkup(
  createElement(MdContentCopy, {
    'aria-hidden': 'true',
    focusable: 'false',
  })
)

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
  return language.toLowerCase()
}

function getLanguageLabel(language: string, plainTextLabel: string) {
  return language || plainTextLabel
}

export interface CodeBlockEnhancementLabels {
  copy: string
  copied: string
  plainText: string
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

export function useCodeBlockEnhancements(
  containerRef: RefObject<HTMLElement | null>,
  labels: CodeBlockEnhancementLabels,
  contentKey?: string
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const codeBlocks = Array.from(container.querySelectorAll('pre'))

    codeBlocks.forEach((pre) => {
      if (!(pre instanceof HTMLPreElement)) return
      if (pre.closest('.md-code-frame')) return

      const code = pre.querySelector(':scope > code')
      if (!(code instanceof HTMLElement)) return

      const rawCode = code.textContent || ''
      const language = extractLanguage(code)
      const normalizedLanguage = normalizeLanguage(language)
      const languageLabel = getLanguageLabel(language, labels.plainText)

      if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
        code.innerHTML = hljs.highlight(rawCode, { language: normalizedLanguage }).value
        code.classList.add('hljs')
      } else {
        code.innerHTML = escapeHtml(rawCode)
      }

      const frame = document.createElement('div')
      frame.className = 'md-code-frame not-prose'
      frame.setAttribute('data-code-language', normalizedLanguage || 'text')

      const header = document.createElement('div')
      header.className = 'md-code-header'

      const terminalDots = document.createElement('div')
      terminalDots.className = 'md-code-dots'
      terminalDots.setAttribute('aria-hidden', 'true')

      for (const className of ['is-red', 'is-yellow', 'is-green']) {
        const dot = document.createElement('span')
        dot.className = `md-code-dot ${className}`
        terminalDots.appendChild(dot)
      }

      const meta = document.createElement('div')
      meta.className = 'md-code-meta'

      const languageBadge = document.createElement('span')
      languageBadge.className = 'md-code-language'
      languageBadge.textContent = languageLabel
      meta.append(languageBadge)

      const copyButton = document.createElement('button')
      copyButton.type = 'button'
      copyButton.className = 'md-code-copy'
      copyButton.setAttribute('aria-label', labels.copy)
      copyButton.setAttribute('data-copy-state', 'idle')
      copyButton.innerHTML = COPY_ICON_MARKUP

      const copyTooltip = document.createElement('span')
      copyTooltip.className = 'md-code-copy-tooltip'
      copyTooltip.textContent = labels.copy

      const copyTooltipArrowWrap = document.createElement('span')
      copyTooltipArrowWrap.className = 'md-code-copy-tooltip-arrow-wrap'

      const copyTooltipArrow = document.createElement('span')
      copyTooltipArrow.className = 'md-code-copy-tooltip-arrow'

      copyTooltipArrowWrap.append(copyTooltipArrow)
      copyTooltip.append(copyTooltipArrowWrap)
      copyButton.append(copyTooltip)

      const headerLeft = document.createElement('div')
      headerLeft.className = 'md-code-header-left'
      headerLeft.append(terminalDots, meta)

      header.append(headerLeft, copyButton)

      const body = document.createElement('div')
      body.className = 'md-code-body'

      pre.classList.add('md-code-pre')
      code.classList.add('md-code-content')

      pre.replaceWith(frame)
      body.append(pre)
      frame.append(header, body)

      const handleCopy = async () => {
        try {
          await copyToClipboard(rawCode)
          copyButton.setAttribute('aria-label', labels.copied)
          copyButton.setAttribute('data-copy-state', 'copied')
          copyTooltip.firstChild?.remove()
          copyTooltip.textContent = labels.copied
          copyTooltip.append(copyTooltipArrowWrap)
          copyButton.disabled = true
          window.setTimeout(() => {
            copyButton.setAttribute('aria-label', labels.copy)
            copyButton.setAttribute('data-copy-state', 'idle')
            copyTooltip.firstChild?.remove()
            copyTooltip.textContent = labels.copy
            copyTooltip.append(copyTooltipArrowWrap)
            copyButton.disabled = false
          }, 1500)
        } catch (error) {
          console.error('Failed to copy code block', error)
        }
      }

      copyButton.addEventListener('click', handleCopy)
    })
  }, [
    containerRef,
    contentKey,
    labels.copy,
    labels.copied,
    labels.plainText,
  ])
}
