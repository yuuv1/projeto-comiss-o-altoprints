import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base relativo: funciona no GitHub Pages, Netlify, Vercel ou em qualquer subpasta
  base: './',
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: false,
    // permite o preview do Arena e tunelamentos
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: true,
  },
})
