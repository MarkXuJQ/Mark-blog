import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { plugin as markdown, Mode } from 'vite-plugin-markdown'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), markdown({ mode: [Mode.HTML, Mode.TOC] })],
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
