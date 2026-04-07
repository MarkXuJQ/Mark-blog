import { useEffect, type RefObject } from 'react'
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

const LANGUAGE_LABELS: Record<string, string> = {
  bash: 'Bash',
  shell: 'Shell',
  sh: 'Shell',
  zsh: 'Zsh',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  css: 'CSS',
  diff: 'Diff',
  go: 'Go',
  ini: 'INI',
  toml: 'TOML',
  java: 'Java',
  javascript: 'JavaScript',
  js: 'JavaScript',
  jsx: 'JSX',
  json: 'JSON',
  kotlin: 'Kotlin',
  markdown: 'Markdown',
  md: 'Markdown',
  plaintext: 'Text',
  text: 'Text',
  txt: 'Text',
  python: 'Python',
  py: 'Python',
  rust: 'Rust',
  rs: 'Rust',
  sql: 'SQL',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  html: 'HTML',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
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
  return match?.[1]?.toLowerCase() || ''
}

function getLanguageLabel(language: string, plainTextLabel: string) {
  if (!language) return plainTextLabel
  return LANGUAGE_LABELS[language] || language.toUpperCase()
}

function countCodeLines(source: string) {
  const normalized = source.replace(/\r\n/g, '\n')
  const trimmed =
    normalized.endsWith('\n') && normalized.length > 1
      ? normalized.slice(0, -1)
      : normalized
  return Math.max(1, trimmed.split('\n').length)
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
      const languageLabel = getLanguageLabel(language, labels.plainText)
      const lineCount = countCodeLines(rawCode)

      if (language && hljs.getLanguage(language)) {
        code.innerHTML = hljs.highlight(rawCode, { language }).value
        code.classList.add('hljs')
      } else {
        code.innerHTML = escapeHtml(rawCode)
      }

      const frame = document.createElement('div')
      frame.className = 'md-code-frame not-prose'
      frame.setAttribute('data-code-language', language || 'text')

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
      copyButton.textContent = labels.copy

      const headerLeft = document.createElement('div')
      headerLeft.className = 'md-code-header-left'
      headerLeft.append(terminalDots, meta)

      header.append(headerLeft, copyButton)

      const body = document.createElement('div')
      body.className = 'md-code-body'

      const gutter = document.createElement('div')
      gutter.className = 'md-code-gutter'
      gutter.setAttribute('aria-hidden', 'true')

      for (let index = 1; index <= lineCount; index += 1) {
        const lineNumber = document.createElement('span')
        lineNumber.className = 'md-code-gutter-line'
        lineNumber.textContent = String(index)
        gutter.appendChild(lineNumber)
      }

      pre.classList.add('md-code-pre')
      code.classList.add('md-code-content')

      pre.replaceWith(frame)
      body.append(gutter, pre)
      frame.append(header, body)

      const handleCopy = async () => {
        try {
          await copyToClipboard(rawCode)
          copyButton.textContent = labels.copied
          copyButton.disabled = true
          window.setTimeout(() => {
            copyButton.textContent = labels.copy
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
