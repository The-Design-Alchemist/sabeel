import { lazy, Suspense, useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { duaCategory } from "@/data/duas"
import { useReaderSettings } from "@/hooks/useReaderSettings"
import { usePlayback } from "@/playback/PlaybackProvider"
import { AudioControls } from "@/components/reader/AudioControls"
import { VerseView } from "@/components/reader/VerseView"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { setStatusBar } from "@/lib/native"
import { easeOut, springPress } from "@/lib/motion"

const SettingsDialog = lazy(() =>
  import("@/components/reader/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
)

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -28 : 28 }),
}

export default function DuaReader() {
  const { categoryId = "", topicId = "" } = useParams()
  const cat = duaCategory(categoryId)
  // Tint the header to match the category card the user tapped (solid pastel from the
  // duas data), falling back to the old faded green if the category can't be resolved.
  const headerColor = cat?.color ?? "#eef4ea"
  const pb = usePlayback()
  const [settings, updateSettings] = useReaderSettings()

  const { duas, duaTopicName, duaArabicName, duaLoading, duaError, duaIndex, duaDir, activeWord } = pb
  const total = duas.length
  const dua = duas[duaIndex]

  // Make this the active dua topic (keeps playing if it already is — e.g. from the pill).
  useEffect(() => {
    pb.openDua(categoryId, topicId)
  }, [categoryId, topicId, pb.openDua])

  // Header tinted to the category's pastel — all five are light, so keep the status bar on
  // dark icons; restore the app's teal on exit.
  useEffect(() => {
    setStatusBar(headerColor, false)
    return () => {
      setStatusBar("#042a2b", true)
    }
  }, [headerColor])

  const renderWords = useMemo(() => dua?.words?.map((w) => w.w), [dua])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ground">
      {/* Light header — matches the design; status bar flips to dark icons for it. */}
      <header
        style={{ backgroundColor: headerColor }}
        className="flex shrink-0 flex-col gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-teal-deep shadow-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-teal-deep/30"
          >
            <ArrowLeft className="size-4" />
            Back to List
          </Link>
          <Suspense fallback={<div className="size-10" aria-hidden="true" />}>
            <SettingsDialog
              settings={settings}
              onChange={updateSettings}
              triggerClassName="text-teal-deep hover:bg-black/5"
            />
          </Suspense>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">{duaTopicName || cat?.name || "Duas"}</h1>
          {duaArabicName && <p className="text-[13px] text-ink/55">{duaArabicName}</p>}
        </div>
      </header>

      {/* Recitation controls — the same bar as the Qur'an reader, playing the verse audio. */}
      <AudioControls
        playing={pb.playing}
        repeat={pb.repeat}
        onTogglePlay={pb.togglePlay}
        onStartOver={pb.startOver}
        onToggleRepeat={pb.toggleRepeat}
      />

      <main className="flex-1 overflow-y-auto bg-ground">
        {duaError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Couldn&rsquo;t load these duas.
          </div>
        ) : duaLoading || !dua ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading&hellip;</div>
        ) : (
          <div className="flex min-h-full items-center justify-center px-6 py-10">
            <div className="mx-auto w-full max-w-[632px]">
              <AnimatePresence mode="wait" custom={duaDir} initial={false}>
                <motion.div
                  key={duaIndex}
                  custom={duaDir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={easeOut}
                  className="flex flex-col items-center gap-5"
                >
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">{dua.reference}</span>
                  <VerseView
                    arabic={dua.arabic}
                    words={renderWords}
                    activeWord={activeWord}
                    highlight={settings.highlighting && !!renderWords?.length}
                    transliteration={dua.transliteration}
                    translation={dua.translation}
                    verseNumber={null}
                    showTranslation={settings.translation}
                    showTransliteration={settings.transliteration}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Bottom navigation — mirrors the Qur'an reader. */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-line bg-white px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:gap-6">
        <motion.button
          whileTap={{ scale: 0.97, transition: springPress }}
          onClick={() => pb.goDua(duaIndex - 1)}
          disabled={duaIndex === 0}
          className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Previous Dua</span>
        </motion.button>

        <Select value={String(duaIndex)} onValueChange={(v) => pb.goDua(Number(v))}>
          <SelectTrigger aria-label="Jump to dua" className="h-[60px] flex-1 rounded-[30px] px-4 sm:h-12 sm:flex-none">
            <SelectValue>
              <span className="text-muted-foreground">Dua</span>{" "}
              <b className="font-bold text-ink">{total ? duaIndex + 1 : 0}</b>{" "}
              <span className="text-muted-foreground">of {total}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {duas.map((d, i) => (
              <SelectItem key={d.id} value={String(i)}>
                Dua {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <motion.button
          whileTap={{ scale: 0.97, transition: springPress }}
          onClick={() => pb.goDua(duaIndex + 1)}
          disabled={total === 0 || duaIndex >= total - 1}
          className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
        >
          <span className="hidden sm:inline">Next Dua</span>
          <ChevronRight />
        </motion.button>
      </div>
    </div>
  )
}
