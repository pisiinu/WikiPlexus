import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
        runtimeCaching: [
          {
            // Noto Serif JP フォント
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // 青空文庫カタログ ZIP（NetworkFirst）
            urlPattern: /raw\.githubusercontent\.com.*index_pages.*\.zip$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'aozora-catalog',
              networkTimeoutSeconds: 15,
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // 本文 HTML（CacheFirst: 一度取得したら変わらない）
            urlPattern: /raw\.githubusercontent\.com.*\/cards\/.*\.html$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'aozora-books',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
      manifest: {
        name: '文庫びより',
        short_name: '文庫びより',
        description: '青空文庫の作品を縦書きで読めるアプリ',
        theme_color: '#2a1800',
        background_color: '#f7f2e8',
        display: 'standalone',
        lang: 'ja',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
