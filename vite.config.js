// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // WebAssemblyライブラリ(@jsquash/webp)を最適化対象から除外
  optimizeDeps: {
    exclude: ['@jsquash/webp']
  },
  // 最新のJavaScript機能を有効化
  build: {
    target: 'esnext'
  },
  // サーバー設定（外部アクセスとWasm用ヘッダー）
  server: {
    host: true, // LAN内からのアクセスを許可
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // 更新があったら自動でリロード
      devOptions: {
        enabled: true // 開発環境でもPWAを有効にする
      },
      includeAssets: ['icon.png'], // キャッシュする静的アセット
      manifest: {
        name: 'WebP Tool',
        short_name: 'WebP',
        description: 'WebAssemblyを使った画像圧縮ツール',
        start_url: '/',
        display: 'standalone', // アプリのように全画面表示
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: '/icon.png', // publicフォルダ内のアイコン画像
            sizes: '512x512', // 画像サイズ（実際のファイルと合わせるのがベスト）
            type: 'image/png'
          }
        ]
      },
      // workboxの設定（警告が出るため、一旦デフォルト設定を使用＝記述を削除）
    })
  ]
});