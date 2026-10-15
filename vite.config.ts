import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'mahalaxmi-logo.svg'],
      manifest: {
        name: 'Mahalaxmi Agri Commodities',
        short_name: 'Mahalaxmi',
        description: 'Professional contract management for agri-commodity brokers',
        theme_color: '#e11d48',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // the PDF library chunks are large; keep them in the offline cache too
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        // phone notifications for the Rates Desk (push handler lives in public/push-sw.js)
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // the two contract-note templates (3 MB each): fetched once, then served from the device
            urlPattern: /\/contract-templates\/.*\.pdf/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'contract-templates',
              expiration: { maxEntries: 6 },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
