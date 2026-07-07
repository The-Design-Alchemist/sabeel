import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

// Surahs whose recitation audio ships *inside* the app bundle. Everything else is
// download-on-demand at runtime (the native download manager). Keep this in sync with
// BUNDLED_AUDIO in src/data/quran.ts.
const BUNDLED_SURAHS = ['001']

// The full recitation corpus (~1.6 GB, 6,236 verses) lives in the repo at
// ../quran-data/audio. It must NOT be copied into the web bundle — bundling it would
// bloat the APK past any store limit and defeat the download-on-demand design. So audio
// is deliberately kept OUT of public/, and this plugin handles it per-mode instead:
//   • dev:   serve any surah's audio straight from the repo (desktop testing stays full)
//   • build: copy ONLY BUNDLED_SURAHS into dist/quran-data/audio
const AUDIO_SRC = fileURLToPath(new URL('../quran-data/audio', import.meta.url))
const AUDIO_RE = /\/quran-data\/audio\/(\d{3})\/(\d{6}\.mp3)$/

function quranAudio(): Plugin {
  return {
    name: 'quran-audio',
    // Dev only: stream any verse's mp3 from the repo corpus (honours Range for seeking).
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = AUDIO_RE.exec((req.url || '').split('?')[0])
        if (!m) return next()
        let stat: fs.Stats
        const file = path.join(AUDIO_SRC, m[1], m[2])
        try {
          stat = fs.statSync(file)
        } catch {
          return next()
        }
        res.setHeader('Content-Type', 'audio/mpeg')
        res.setHeader('Accept-Ranges', 'bytes')
        const range = req.headers.range
        if (range) {
          const r = /bytes=(\d*)-(\d*)/.exec(range)
          const start = r && r[1] ? parseInt(r[1], 10) : 0
          const end = r && r[2] ? parseInt(r[2], 10) : stat.size - 1
          res.statusCode = 206
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
          res.setHeader('Content-Length', String(end - start + 1))
          fs.createReadStream(file, { start, end }).pipe(res)
        } else {
          res.setHeader('Content-Length', String(stat.size))
          fs.createReadStream(file).pipe(res)
        }
      })
    },
    // Build only: runs after Vite writes dist/ (incl. the public/ copy). Add the bundled
    // surahs' audio; leave the rest for download-on-demand.
    closeBundle() {
      const outDir = fileURLToPath(new URL('./dist/quran-data/audio', import.meta.url))
      for (const s of BUNDLED_SURAHS) {
        const from = path.join(AUDIO_SRC, s)
        if (fs.existsSync(from)) fs.cpSync(from, path.join(outDir, s), { recursive: true })
      }
    },
  }
}

// base: './' keeps asset URLs relative so the same build works under /sabeel/ on
// GitHub Pages AND inside the Capacitor WebView (https://localhost). https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), quranAudio()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
