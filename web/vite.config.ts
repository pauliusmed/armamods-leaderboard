import path from 'node:path'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vite plugin: automatiškai prideda <link rel="preload"> CSS ir fontų failams
 * po build'o. Išsprendžia render-blocking grandinę: CSS + 6 fontai kraunasi
 * lygiagrečiai su HTML, vietoj serijinės grandinės (1015ms+ → ~200ms).
 *
 * Hash'ai dinamiškai ištraukiami iš dist/assets katalogo kiekvienam build'ui.
 */
function preloadCriticalAssets() {
  return {
    name: 'preload-critical-assets',
    closeBundle() {
      const distDir = path.resolve(rootDir, 'dist')
      const indexPath = path.join(distDir, 'index.html')
      let html = readFileSync(indexPath, 'utf8')

      const assets = readdirSync(path.join(distDir, 'assets'))

      // CSS: pirmas index-*.css failas
      const cssFile = assets.find(f => f.startsWith('index-') && f.endsWith('.css'))
      // Fontai: visi .woff2
      const fontFiles = assets.filter(f => f.endsWith('.woff2'))

      if (!cssFile) return

      const preloads = [
        `<link rel="preload" href="/assets/${cssFile}" as="style" />`,
        ...fontFiles.map(f =>
          `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`
        ),
      ].join('\n    ')

      // Pridėti prieš pirmą <script> tag'ą (prieš JS, kad krautųsi lygiagrečiai)
      html = html.replace(
        /(<script type="module")/,
        `${preloads}\n    $1`
      )

      writeFileSync(indexPath, html)
      console.log(`[preload] Pridėti ${1 + fontFiles.length} preload link'ai: ${cssFile}, ${fontFiles.join(', ')}`)
    },
  }
}

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
    preloadCriticalAssets(),
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
