import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const BASE = '/lesson_observer/'

// ---------------------------------------------------------------------------
// PDF.js が PDF 表示時に追加で読み込むデータ（CMap・標準フォント・wasm・ICC）を
// dist/pdfjs/ 以下に出力する。CDN から取らずに自前で配信し、Service Worker の
// プリキャッシュに含めることで、オフラインでも日本語 PDF を表示できるようにする。
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url)
const PDFJS_DIR = path.dirname(require.resolve('pdfjs-dist/package.json'))
const PDFJS_ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs']

function pdfjsAssets(): Plugin {
  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      // 開発サーバーでは node_modules から直接返す
      server.middlewares.use((req, res, next) => {
        const prefix = `${BASE}pdfjs/`
        if (!req.url?.startsWith(prefix)) return next()
        const rel = decodeURIComponent(req.url.slice(prefix.length).split('?')[0])
        const file = path.join(PDFJS_DIR, rel)
        if (!file.startsWith(PDFJS_DIR + path.sep) || !fs.existsSync(file)) return next()
        fs.createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      for (const dir of PDFJS_ASSET_DIRS) {
        const src = path.join(PDFJS_DIR, dir)
        for (const name of fs.readdirSync(src)) {
          if (name.startsWith('LICENSE')) continue
          this.emitFile({
            type: 'asset',
            fileName: `pdfjs/${dir}/${name}`,
            source: fs.readFileSync(path.join(src, name)),
          })
        }
      }
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    pdfjsAssets(),
    VitePWA({
      // 更新は自動適用せず、画面上の「更新」ボタンで反映する（記録中の再読み込みを防ぐ）
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: '授業観察メモ',
        short_name: '授業観察メモ',
        description: '授業観察の記録・手書きメモ・資料閲覧をオフラインで行えるアプリ',
        lang: 'ja',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f9fafb',
        theme_color: '#2563eb',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // アプリ本体・PDF.js worker・CMap/フォント/wasm をすべてプリキャッシュ
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webmanifest,bcmap,pfb,ttf,wasm,icc}'],
        globIgnores: ['404.html'],
        // pdf.worker や jspdf 等のチャンクが 2MB 既定上限を超えるため引き上げる
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        // 古い版のプリキャッシュを削除し、古いファイルが残らないようにする
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // skipWaiting はしない: 利用者が「更新」を押した時だけ新しい版に切り替える
      },
      devOptions: { enabled: false },
    }),
  ],
})
