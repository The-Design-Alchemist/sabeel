import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Check, Download, Loader2, Trash2 } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { SURAHS } from "@/data/surahs"
import { isBundledAudio } from "@/data/quran"
import {
  deleteSurah,
  downloadSurah,
  isDownloaded,
  useDownloads,
  type DownloadProgress,
} from "@/lib/downloads"

export default function Downloads() {
  useDownloads() // re-render when the download set changes
  const native = Capacitor.isNativePlatform()
  const [busy, setBusy] = useState<Record<number, DownloadProgress | undefined>>({})
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (id: number, verses: number) => {
    setError(null)
    setBusy((b) => ({ ...b, [id]: { done: 0, total: verses } }))
    try {
      await downloadSurah(id, verses, (p) => setBusy((b) => ({ ...b, [id]: p })))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed")
    } finally {
      setBusy((b) => ({ ...b, [id]: undefined }))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <header className="flex items-center gap-2 bg-teal-deep px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowLeft className="size-5" />
          <span>Back</span>
        </Link>
        <h1 className="text-lg font-semibold">Downloads</h1>
      </header>

      {!native && (
        <p className="mx-auto mt-4 w-full max-w-[632px] rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted-foreground">
          Audio downloads run in the installed app. In the browser, Al-Fatiha is bundled and
          other surahs open in reading mode.
        </p>
      )}
      {error && (
        <p className="mx-auto mt-4 w-full max-w-[632px] rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <ul className="mx-auto w-full max-w-[632px] flex-1 divide-y divide-line">
        {SURAHS.map((s) => {
          const prog = busy[s.id]
          const bundled = isBundledAudio(s.id)
          const done = isDownloaded(s.id)
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-deep text-sm font-semibold text-white">
                {s.id}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{s.englishName}</p>
                <p className="text-xs text-muted-foreground">{s.verses} verses</p>
              </div>

              {bundled ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-deep">
                  <Check className="size-4" /> Included
                </span>
              ) : prog ? (
                <span className="inline-flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {prog.done}/{prog.total}
                </span>
              ) : done ? (
                <button
                  onClick={() => deleteSurah(s.id)}
                  aria-label={`Delete ${s.englishName} audio`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-teal-deep outline-none hover:bg-teal-deep/5 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Check className="size-4" /> Saved
                  <Trash2 className="size-4 opacity-70" />
                </button>
              ) : (
                <button
                  disabled={!native}
                  onClick={() => handleDownload(s.id, s.verses)}
                  aria-label={`Download ${s.englishName} audio`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-deep px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
                >
                  <Download className="size-4" /> Download
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  )
}
