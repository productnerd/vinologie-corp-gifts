import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // Served at root in dev; under the repo subpath when built for GitHub Pages.
  base: command === 'build' ? '/vinologie-corp-gifts/' : '/',
  plugins: [react(), tailwindcss()],
  // Inline (empty) PostCSS config stops Vite searching up to a stray
  // ~/postcss.config.js in the home directory. Tailwind runs via the Vite plugin.
  css: { postcss: { plugins: [] } },
}))
