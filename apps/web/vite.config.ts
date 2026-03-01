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
  },
})
