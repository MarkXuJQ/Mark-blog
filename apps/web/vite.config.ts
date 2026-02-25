import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { plugin as markdown } from 'vite-plugin-markdown'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), markdown({ mode: ['html', 'toc'] })],
  resolve: {
    alias: {
      '@content': path.resolve(__dirname, '../../content'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
