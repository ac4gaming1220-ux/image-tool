import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
        // 名称を変更
        name: '画像圧縮│webp変換ツール',
        short_name: 'WebPツール',
        description: '複数画像を一括でWebPに変換するツール',
        start_url: './index.html',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});