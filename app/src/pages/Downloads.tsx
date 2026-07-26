import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { motion } from "motion/react"
import { ArrowLeft, Check, Download, Loader2, RotateCw, Trash2, X } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { toast } from "sonner"
import { SURAHS, type Surah } from "@/data/surahs"
import { isBundledAudio } from "@/data/quran"
import {
  cancelDownload,
  deleteSurah,
  getActiveDownloads,
  isDownloaded,
  queueDownload,
  useActiveDownloadCount,
  useDownloadState,
  useDownloads,
  useDownloadTotals,
} from "@/lib/downloads"
import { usePlayback } from "@/playback/PlaybackProvider"
import { useHaptics } from "@/hooks/useHaptics"
import { CountUp } from "@/components/motion/CountUp"
import { fadeRise, staggerContainer } from "@/lib/motion"
import { cn } from "@/lib/utils"

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-black/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {children}
    </button>
  )
}

/** One surah row. Reads its own live download state so only the active row re-renders per
 *  verse tick; the parent handles saved/deleted set changes. */
function DownloadRow({ surah, native, focused }: { surah: Surah; native: boolean; focused: boolean }) {
  const dl = useDownloadState(surah.id)
  const ref = useRef<HTMLLIElement>(null)
  const [glow, setGlow] = useState(focused)
  const haptics = useHaptics()

  // Deep-linked from the reader's progress counter (/downloads?focus=<id>): scroll this row
  // into view and flash a soft ring so the user lands on the right surah.
  useEffect(() => {
    if (!focused) return
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    const t = setTimeout(() => setGlow(false), 1800)
    return () => clearTimeout(t)
  }, [focused])

  const bundled = isBundledAudio(surah.id)
  const done = isDownloaded(surah.id)

  const remove = () => {
    haptics.tap() // kept: deleting saved audio is destructive and irreversible without a re-download
    void deleteSurah(surah.id)
    toast(`Removed ${surah.englishName}`, {
      action: { label: "Re-download", onClick: () => queueDownload(surah.id, surah.verses) },
    })
  }

  return (
    <li
      ref={ref}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 transition-colors duration-700",
        glow && "bg-teal-deep/[0.06]"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-deep text-sm font-semibold text-white">
        {surah.id}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{surah.englishName}</p>
        <p className="text-xs text-muted-foreground">{surah.verses} verses</p>
      </div>

      {bundled ? (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-deep">
          <Check className="size-4" /> Included
        </span>
      ) : dl && dl.phase === "active" ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <CountUp value={dl.done} />/{dl.total}
          </span>
          <IconButton onClick={() => cancelDownload(surah.id)} label={`Cancel ${surah.englishName} download`}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : dl && dl.phase === "queued" ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Queued</span>
          <IconButton onClick={() => cancelDownload(surah.id)} label={`Cancel ${surah.englishName} download`}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : dl && dl.phase === "error" ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => queueDownload(surah.id, surah.verses)}
            aria-label={`Retry ${surah.englishName} download`}
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-deep px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-teal-deep-hover focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <RotateCw className="size-4" /> Retry
          </button>
          <IconButton onClick={() => cancelDownload(surah.id)} label={`Dismiss ${surah.englishName} error`}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : done ? (
        // Status and the destructive action are separated so a scan-and-tap can't delete by mistake.
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-deep">
            <Check className="size-4" /> Saved
          </span>
          <IconButton onClick={remove} label={`Delete ${surah.englishName} audio`}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ) : (
        <button
          disabled={!native}
          onClick={() => queueDownload(surah.id, surah.verses)}
          aria-label={`Download ${surah.englishName} audio`}
          title={native ? undefined : "Downloads run in the installed app"}
          className="inline-flex items-center gap-1.5 rounded-full bg-teal-deep px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-teal-deep-hover focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
        >
          <Download className="size-4" /> Download
        </button>
      )}

      {/* Determinate per-surah progress so a long download never looks frozen. */}
      {dl && dl.phase === "active" && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-line/60">
          <span
            className="block h-full origin-left bg-teal-deep transition-transform duration-300"
            style={{ transform: `scaleX(${dl.total ? dl.done / dl.total : 0})` }}
          />
        </span>
      )}
    </li>
  )
}

export default function Downloads() {
  useDownloads() // re-render the list when a surah finishes saving or is deleted
  const activeCount = useActiveDownloadCount()
  const totals = useDownloadTotals()
  const pb = usePlayback()
  const pillVisible = !!pb.nowPlaying // the floating mini-player overlaps the bottom of the list
  const [params] = useSearchParams()
  const native = Capacitor.isNativePlatform()
  const focusId = Number(params.get("focus")) || null

  const downloadable = SURAHS.filter((s) => !isBundledAudio(s.id))
  const savedCount = downloadable.filter((s) => isDownloaded(s.id)).length
  const remaining = downloadable.length - savedCount

  const downloadAll = () => {
    SURAHS.forEach((s) => {
      if (!isBundledAudio(s.id) && !isDownloaded(s.id)) queueDownload(s.id, s.verses)
    })
  }
  const cancelAll = () => {
    getActiveDownloads().forEach((d) => cancelDownload(d.surah))
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex h-dvh flex-col overflow-hidden bg-teal-deep"
    >
      <header className="relative flex shrink-0 items-center justify-center px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <Link
          to="/"
          aria-label="Back to Home"
          className="absolute left-3 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-white/90 outline-none transition hover:bg-white/10 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowLeft className="size-5" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="text-base font-semibold">Downloads</span>
      </header>

      <motion.main variants={fadeRise} className="flex-1 overflow-y-auto overscroll-contain rounded-t-[40px] bg-ground">
        <div
          className={cn(
            "mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-10 transition-[padding] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
            // Extra bottom room so the last surah can scroll clear of the floating pill.
            pillVisible
              ? "pb-[calc(env(safe-area-inset-bottom)+6.5rem)]"
              : "pb-[max(2.5rem,env(safe-area-inset-bottom))]"
          )}
        >
          {/* Intro */}
          <section className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface text-teal-deep shadow-card">
              <Download className="size-7" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-ink">Offline downloads</h1>
              <p className="mx-auto mt-1.5 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
                Save a surah&rsquo;s recitation to listen without a connection. Downloads keep going as
                you move around the app, and pick back up on their own if interrupted.
              </p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
              {savedCount} of {downloadable.length} saved
            </span>

            {/* Overall progress across the whole batch, so "Download all" never looks frozen. */}
            {totals.active > 0 && totals.total > 0 && (
              <div className="w-full max-w-[320px]" role="status" aria-live="polite">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium tabular-nums text-muted-foreground">
                  <span>
                    Downloading {totals.active} {totals.active === 1 ? "surah" : "surahs"}
                  </span>
                  <span>{Math.round((totals.done / totals.total) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-teal-deep transition-[width] duration-300"
                    style={{ width: `${(totals.done / totals.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {activeCount > 0 ? (
              <button
                onClick={cancelAll}
                className="mt-1 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink outline-none transition-colors hover:bg-ground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-4" /> Cancel all ({activeCount})
              </button>
            ) : native && remaining > 0 ? (
              <button
                onClick={downloadAll}
                className="mt-1 inline-flex items-center gap-2 rounded-full bg-teal-deep px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-teal-deep-hover focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Download className="size-4" /> Download all ({remaining})
              </button>
            ) : remaining === 0 ? (
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-teal-deep">
                <Check className="size-4" /> All surahs saved
              </span>
            ) : null}
          </section>

          {!native && (
            <p className="rounded-2xl bg-surface px-4 py-3 text-center text-[13px] leading-relaxed text-muted-foreground shadow-card">
              Audio downloads run in the installed app. In the browser, Al-Fatiha is bundled and
              other surahs open in reading mode.
            </p>
          )}

          {/* List */}
          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              All surahs
            </h2>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-card">
              {SURAHS.map((s) => (
                <DownloadRow key={s.id} surah={s} native={native} focused={focusId === s.id} />
              ))}
            </ul>
          </section>
        </div>
      </motion.main>
    </motion.div>
  )
}
