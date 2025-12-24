// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // ★これがないとGitHub Pagesで画面が真っ白になります
  base: './',

  optimizeDeps: {
    exclude: ['@jsquash/webp']
  },
  build: {
    target: 'esnext'
  },
  server: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['icon.png'],
      manifest: {
        name: 'WebP Tool',
        short_name: 'WebP',
        description: 'WebAssemblyを使った画像圧縮ツール',
        start_url: './index.html', // ★ここも ./ をつけておくと安全です
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: 'icon.png', // ★ /icon.png から / を取りました（相対パス対応）
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});