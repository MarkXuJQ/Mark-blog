import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { plugin as markdown, Mode } from 'vite-plugin-markdown'
import MarkdownIt from 'markdown-it'
import type { RenderRule } from 'markdown-it/lib/renderer.mjs'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import katex from 'katex'
import markdownItTexmath from 'markdown-it-texmath'
import fs from 'node:fs'
import path from 'path'
import { pathToFileURL } from 'node:url'

const TABLE_WIDTHS_PATTERN =
  /^<!--\s*table-widths\s*:\s*([\s\S]*?)\s*-->$/i

function splitTableWidths(input: string): string[] {
  const widths: string[] = []
  let current = ''
  let depth = 0

  for (const char of input) {
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    } else if (char === ',' && depth === 0) {
      widths.push(current)
      current = ''
      continue
    }

    current += char
  }

  widths.push(current)

  return widths
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^[\w\s.%(),/+*-]+$/.test(item))
}

function markdownItArticleTables(md: MarkdownIt) {
  md.core.ruler.after('inline', 'article_table_metadata', (state: StateCore) => {
    let pendingWidths: string[] | null = null

    state.tokens.forEach((token) => {
      if (token.type === 'html_block') {
        const match = token.content.trim().match(TABLE_WIDTHS_PATTERN)

        if (match) {
          pendingWidths = splitTableWidths(match[1])
          token.content = ''
          token.hidden = true
          return
        }

        pendingWidths = null
        return
      }

      if (token.type === 'table_open') {
        token.attrJoin('class', 'md-table')

        if (pendingWidths?.length) {
          token.meta = {
            ...(token.meta ?? {}),
            columnWidths: pendingWidths,
          }
          token.attrSet('style', '--md-table-layout: fixed;')
        }

        pendingWidths = null
      }
    })
  })

  const defaultTableOpen =
    md.renderer.rules.table_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  const defaultTableClose =
    md.renderer.rules.table_close ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.table_open = ((tokens, idx, options, env, self) => {
    const widths = tokens[idx].meta?.columnWidths as string[] | undefined
    const colgroup = widths?.length
      ? `<colgroup>${widths
          .map((width) => `<col style="width: ${md.utils.escapeHtml(width)};">`)
          .join('')}</colgroup>`
      : ''

    return `<div class="md-table-frame">${defaultTableOpen(
      tokens,
      idx,
      options,
      env,
      self
    )}${colgroup}`
  }) satisfies RenderRule

  md.renderer.rules.table_close = ((tokens, idx, options, env, self) =>
    `${defaultTableClose(tokens, idx, options, env, self)}</div>`) satisfies RenderRule
}

const markdownIt = new MarkdownIt({ html: true })
  .use(markdownItTexmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: {
      throwOnError: false,
    },
  })
  .use(markdownItArticleTables)

function vercelApiDevPlugin(): Plugin {
  const apiHandlers = {
    '/api/tmdb': path.resolve(__dirname, './api/tmdb.js'),
    '/api/steam': path.resolve(__dirname, './api/steam.js'),
  }
  const moduleVersionCache = new Map<string, string>()

  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, __dirname, ''))

      Object.entries(apiHandlers).forEach(([route, filePath]) => {
        server.middlewares.use(route, async (req, res, next) => {
          try {
            const stat = fs.statSync(filePath)
            const version = String(stat.mtimeMs)
            const cachedVersion = moduleVersionCache.get(filePath)

            if (cachedVersion !== version) {
              moduleVersionCache.set(filePath, version)
            }

            const moduleUrl = `${pathToFileURL(filePath).href}?t=${moduleVersionCache.get(filePath)}`
            const handlerModule = await import(moduleUrl)
            const handler =
              typeof handlerModule.default === 'function'
                ? handlerModule.default
                : null

            if (!handler) {
              return next(new Error(`API handler not found for ${route}`))
            }

            await handler(req, res)

            if (!res.writableEnded) {
              next()
            }
          } catch (error) {
            next(error instanceof Error ? error : new Error(String(error)))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    markdown({ mode: [Mode.HTML, Mode.TOC], markdownIt }),
    vercelApiDevPlugin(),
  ],
  resolve: {
    alias: {
      '@content': path.resolve(__dirname, '../../content'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 6370,
  },
  build: {
    target: 'es2015',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/')) return 'vendor-react'
          if (id.includes('/node_modules/react-dom/')) return 'vendor-react'
          if (id.includes('/node_modules/react-router-dom/')) return 'vendor-react'
          if (id.includes('/node_modules/react-helmet-async/')) return 'vendor-react'

          if (id.includes('/node_modules/i18next/')) return 'vendor-i18n'
          if (id.includes('/node_modules/react-i18next/')) return 'vendor-i18n'
          if (id.includes('/node_modules/i18next-browser-languagedetector/')) {
            return 'vendor-i18n'
          }

          if (id.includes('/node_modules/gsap/')) return 'vendor-gsap'
          if (id.includes('/node_modules/yet-another-react-lightbox/')) {
            return 'vendor-lightbox'
          }
        },
      },
    },
  },
})
