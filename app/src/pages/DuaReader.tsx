import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { duaCategory, loadDuaCategory, type DuaTopic } from "@/data/duas"
import { useHaptics } from "@/hooks/useHaptics"
import { useVerseAudio } from "@/hooks/useVerseAudio"
import { useReaderSettings } from "@/hooks/useReaderSettings"
import { audioSrc } from "@/lib/downloads"
import { activeWordAt } from "@/lib/highlight"
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

// Same on-demand settings dialog as the Qur'an reader (kept out of the eager Home bundle).
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
  const haptics = useHaptics()
  const [topic, setTopic] = useState<DuaTopic | null>(null)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(0)
  const [settings, updateSettings] = useReaderSettings()
  const [repeat, setRepeat] = useState(false)
  const [activeWord, setActiveWord] = useState(-1)
  const { playing, play, pause, stop, setOnEnded, audioRef } = useVerseAudio()

  // This screen has a light header, so flip the status bar to dark icons (and restore on exit).
  useEffect(() => {
    setStatusBar("#eef4ea", false)
    return () => {
      setStatusBar("#042a2b", true)
    }
  }, [])

  useEffect(() => {
    let alive = true
    setTopic(null)
    setError(false)
    setIndex(0)
    loadDuaCategory(categoryId)
      .then((d) => {
        if (!alive) return
        const t = d.topics.find((x) => x.id === topicId)
        if (t) setTopic(t)
        else setError(true)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [categoryId, topicId])

  const total = topic?.duas.length ?? 0
  const dua = topic?.duas[index]

  // Every Qur'anic dua is a verse we already have audio + word timings for, so recitation
  // reuses the exact Qur'an-reader stack (per-verse .m4a + cpfair word timings).
  const src = dua?.surah != null && dua?.ayah != null ? audioSrc(dua.surah, dua.ayah) : ""
  const words = dua?.words
  const hasAudio = !!src

  const go = (delta: number) => {
    if (!topic) return
    const n = Math.max(0, Math.min(total - 1, index + delta))
    if (n === index) return
    haptics.tap()
    setDir(delta)
    setIndex(n)
  }

  // Reset playback whenever the dua changes (navigation or a fresh topic load).
  useEffect(() => {
    stop()
    setActiveWord(-1)
  }, [index, topic, stop])

  // cpfair timings use {start,end}; our compact dua words use {s,e} — map once per dua.
  const wordTimes = useMemo(() => words?.map((w) => ({ start: w.s, end: w.e })), [words])

  // Drive word highlighting off the audio clock while it plays.
  useEffect(() => {
    if (!playing || !wordTimes?.length) return
    let raf = 0
    const tick = () => {
      setActiveWord(activeWordAt(wordTimes, audioRef.current?.currentTime ?? 0))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, wordTimes, audioRef])

  // On verse end: loop it when Repeat is on, otherwise clear the highlight.
  useEffect(() => {
    setOnEnded(() => {
      if (repeat && src) play(src, 0)
      else setActiveWord(-1)
    })
  }, [setOnEnded, play, repeat, src])

  const togglePlay = () => {
    if (!hasAudio) return
    haptics.tap()
    if (playing) pause()
    else play(src)
  }
  const startOver = () => {
    if (!hasAudio) return
    haptics.tap()
    play(src, 0)
  }

  const renderWords = useMemo(() => words?.map((w) => w.w), [words])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ground">
      {/* Light header — matches the design; status bar flips to dark icons for it. */}
      <header className="flex shrink-0 flex-col gap-3 bg-[#eef4ea] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
          <h1 className="text-lg font-semibold text-ink">{topic?.name ?? cat?.name ?? "Duas"}</h1>
          {topic && <p className="text-[13px] text-ink/55">{topic.arabicName}</p>}
        </div>
      </header>

      {/* Recitation controls — the same bar as the Qur'an reader, playing the verse audio. */}
      <AudioControls
        playing={playing}
        repeat={repeat}
        onTogglePlay={togglePlay}
        onStartOver={startOver}
        onToggleRepeat={() => setRepeat((r) => !r)}
      />

      <main className="flex-1 overflow-y-auto bg-ground">
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Couldn&rsquo;t load these duas.
          </div>
        ) : !dua ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading&hellip;</div>
        ) : (
          <div className="flex min-h-full items-center justify-center px-6 py-10">
            <div className="mx-auto w-full max-w-[632px]">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={index}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={easeOut}
                  className="flex flex-col items-center gap-5"
                >
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">{dua.reference}</span>
                  {/* Same display component (and dividers) as the Qur'an reader. */}
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
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
        >
          <ChevronLeft />
          <span className="hidden sm:inline">Previous Dua</span>
        </motion.button>

        <Select value={String(index)} onValueChange={(v) => { setDir(Number(v) > index ? 1 : -1); setIndex(Number(v)) }}>
          <SelectTrigger aria-label="Jump to dua" className="h-[60px] flex-1 rounded-[30px] px-4 sm:h-12 sm:flex-none">
            <SelectValue>
              <span className="text-muted-foreground">Dua</span>{" "}
              <b className="font-bold text-ink">{total ? index + 1 : 0}</b>{" "}
              <span className="text-muted-foreground">of {total}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {topic?.duas.map((d, i) => (
              <SelectItem key={d.id} value={String(i)}>
                Dua {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <motion.button
          whileTap={{ scale: 0.97, transition: springPress }}
          onClick={() => go(1)}
          disabled={total === 0 || index >= total - 1}
          className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
        >
          <span className="hidden sm:inline">Next Dua</span>
          <ChevronRight />
        </motion.button>
      </div>
    </div>
  )
}
