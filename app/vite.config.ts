import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // O registro é feito manualmente em main.tsx para controlar as atualizações.
      injectRegister: false,
      includeAssets: ['icons/pwa-512x512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Altoprints — Sistema de Pedidos DTF',
        short_name: 'Altoprints',
        description: 'Pedidos, clientes, produção e entregas da Altoprints.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#a21caf',
        background_color: '#f8fafc',
        categories: ['business', 'productivity'],
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Como o registro é manual (injectRegister:false), não dependemos dos
        // padrões automáticos do plugin: a atualização nova precisa ativar sem
        // esperar todas as janelas antigas fecharem e assumir o controle delas.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // O app shell fica disponível para abrir sem rede; dados e login do
        // Supabase nunca entram no cache offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.(co|in)\/.*$/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
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
