import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { plugin as markdown, Mode } from 'vite-plugin-markdown'
import fs from 'node:fs'
import path from 'path'
import { pathToFileURL } from 'node:url'

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
    markdown({ mode: [Mode.HTML, Mode.TOC] }),
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
        manualChunks: {
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-helmet-async',
          ],
          'vendor-i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
          ],
          'vendor-motion': ['framer-motion'],
          'vendor-lightbox': [
            'yet-another-react-lightbox',
            'yet-another-react-lightbox/plugins/zoom',
            'yet-another-react-lightbox/plugins/captions',
          ],
        },
      },
    },
  },
})
