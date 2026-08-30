import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@audit-config': path.resolve(rootDir, 'functions/api/audit-config.ts'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/og-*.png', 'brand/**/*'],
        navigateFallbackDenylist: [/^\/api\//],
        // No runtimeCaching for /api/* on purpose: a live leaderboard must never be
        // answered from the SW cache (10s network timeout used to serve stale/empty
        // payloads for slow endpoints — phantom "No matches found" states). Freshness
        // is handled by edge Cache-Control + the client's in-memory cache.
      },
      manifest: {
        name: 'Arma Mods Intelligence',
        short_name: 'ArmaMods',
        description: 'Real-time Arma Reforger and Arma 3 mod leaderboard, server network, and trending intel.',
        start_url: '/',
        display: 'standalone',
        background_color: '#101923',
        theme_color: '#B8784A',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://reforgermods.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
