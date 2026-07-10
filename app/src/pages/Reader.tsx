import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Download, Loader2, WifiOff } from "lucide-react"
import { isBundledAudio } from "@/data/quran"
import { isDownloaded, queueDownload, useDownloadState, useDownloads } from "@/lib/downloads"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { VerseView } from "@/components/reader/VerseView"
import { SegmentNav } from "@/components/reader/SegmentNav"
import { AudioControls } from "@/components/reader/AudioControls"
import { BismillahScreen } from "@/components/reader/BismillahScreen"
import { CountUp } from "@/components/motion/CountUp"
import { useReaderSettings } from "@/hooks/useReaderSettings"
import { usePlayback } from "@/playback/PlaybackProvider"

// Radix Dialog + Switch are chunky and only needed if the user opens settings — load on
// demand so it never rides along in the eager Home bundle (shared with the Dua reader).
const SettingsDialog = lazy(() =>
  import("@/components/reader/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
)
import { ResumeDialog } from "@/components/reader/ResumeDialog"
import { easeOut, springPress } from "@/lib/motion"

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -28 : 28 }),
}

export default function Reader() {
  const { id } = useParams()
  const surahId = Number(id)
  const navigate = useNavigate()
  useDownloads() // re-render if this surah's downloaded state changes
  const dl = useDownloadState(surahId) // live queued/active/error progress from the global store

  const pb = usePlayback()
  const [settings, updateSettings] = useReaderSettings()
  const [resume, setResume] = useState<{ verse: number; lastPlayed: number } | null>(null)
  const [repeatNotif, setRepeatNotif] = useState<string | null>(null)

  // Make this the active surah (fresh Bismillah), unless it's already the one playing —
  // reopening the currently-playing surah (e.g. from the mini-player) keeps it going.
  useEffect(() => {
    pb.open(surahId)
  }, [surahId, pb.open])

  const {
    data,
    loading,
    error,
    canPlay,
    verses,
    timing,
    verseNum,
    segmented,
    segments,
    verseIndex,
    segmentIndex,
    dir,
    repeat,
    playing: isPlaying,
    activeWord,
    started,
  } = pb

  const verse = verses[verseIndex]

  // On entering a surah that isn't already playing, offer to resume saved progress.
  useEffect(() => {
    if (!data || started) return
    try {
      const p = JSON.parse(localStorage.getItem(`progress_${surahId}`) || "{}")
      if (p.lastVerse > 1) setResume({ verse: p.lastVerse, lastPlayed: p.lastPlayed || Date.now() })
      else setResume(null)
    } catch {
      setResume(null)
    }
  }, [data, surahId, started])

  // Kick off (or resume) the download in the global store; progress lives there now, so it
  // survives leaving this screen and shows up on the Downloads manager too.
  const saveOffline = () => {
    if (!verses.length) return
    queueDownload(surahId, verses.length)
  }

  const onToggleRepeat = () => {
    pb.toggleRepeat()
    setRepeatNotif(!repeat ? "Repeat mode on" : "Repeat mode off")
  }

  const handleResumeContinue = () => {
    if (!resume) return
    const idx = verses.findIndex((v) => Number(v.key.split(":")[1]) === resume.verse)
    setResume(null)
    pb.resumeAt(idx >= 0 ? idx : 0)
  }

  // Auto-hide the repeat-mode notification strip.
  useEffect(() => {
    if (!repeatNotif) return
    const t = setTimeout(() => setRepeatNotif(null), 2000)
    return () => clearTimeout(t)
  }, [repeatNotif])

  // Words to render as spans (timing words for the verse, sliced to the segment).
  const renderWords = useMemo(() => {
    if (!timing) return undefined
    if (segmented && timing.segments) {
      const seg = timing.segments[segmentIndex]
      if (seg) return timing.words.slice(seg.startWord, seg.endWord + 1).map((w) => w.word)
    }
    return timing.words.map((w) => w.word)
  }, [timing, segmented, segmentIndex])

  const activeLocal = useMemo(() => {
    if (activeWord < 0 || !timing) return -1
    if (segmented && timing.segments) {
      const seg = timing.segments[segmentIndex]
      if (!seg) return -1
      const local = activeWord - seg.startWord
      return local >= 0 && local <= seg.endWord - seg.startWord ? local : -1
    }
    return activeWord
  }, [activeWord, segmented, timing, segmentIndex])

  const view = useMemo(() => {
    if (!verse) return null
    if (segmented) {
      const seg = segments[segmentIndex]
      const isLast = segmentIndex === segments.length - 1
      return {
        arabic: seg.arabic,
        transliteration: seg.transliteration,
        translation: seg.translation,
        verseNumber: isLast ? verseNum : null,
      }
    }
    return {
      arabic: verse.arabic,
      transliteration: verse.transliteration,
      translation: verse.translation,
      verseNumber: verseNum,
    }
  }, [verse, segmented, segments, segmentIndex, verseNum])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-teal-deep">
      {/* Header — "Back to List" pill on top, surah title below it (mirrors the Dua reader). */}
      <header className="flex shrink-0 flex-col gap-3 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-teal-deep shadow-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ArrowLeft className="size-4" />
            Back to List
          </Link>

          <div className="flex items-center gap-1">
            {data &&
              !isBundledAudio(surahId) &&
              (dl && dl.phase !== "error" ? (
                <button
                  onClick={() => navigate(`/downloads?focus=${surahId}`)}
                  aria-label="View download progress and manage downloads"
                  title="View downloads"
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium tabular-nums text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <Loader2 className="size-4 animate-spin" />
                  {dl.phase === "queued" ? (
                    "Queued"
                  ) : (
                    <span>
                      <CountUp value={dl.done} />/{dl.total}
                    </span>
                  )}
                </button>
              ) : isDownloaded(surahId) ? (
                <span
                  className="inline-flex size-10 items-center justify-center text-white/80"
                  title="Saved for offline"
                  aria-label="Saved for offline"
                >
                  <Check className="size-5" />
                </span>
              ) : (
                <button
                  onClick={saveOffline}
                  aria-label="Save this surah for offline"
                  title="Save for offline"
                  className="inline-flex size-10 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <Download className="size-5" />
                </button>
              ))}
            <Suspense fallback={<div className="size-10" aria-hidden="true" />}>
              <SettingsDialog settings={settings} onChange={updateSettings} />
            </Suspense>
          </div>
        </div>

        {data && (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-lg font-semibold">{data.englishName}</h1>
              <span lang="ar" className="font-arabic text-lg text-white/85">
                سُورَة {data.name}
              </span>
            </div>
            <p className="text-[13px] text-white/55">{data.englishNameTranslation}</p>
          </div>
        )}
      </header>

      {/* States */}
      {loading && (
        <div className="flex flex-1 items-center justify-center rounded-t-[40px] bg-ground">
          <p className="text-sm text-muted-foreground">Loading surah…</p>
        </div>
      )}

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-t-[40px] bg-ground text-center">
          <p className="text-sm text-ink">Couldn't load this surah. {error}</p>
          <Button asChild variant="outline">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      )}

      {!loading && !error && data && !started && (
        <BismillahScreen onStart={pb.start} audioAvailable={canPlay} />
      )}

      {resume && (
        <ResumeDialog
          open
          verse={resume.verse}
          lastPlayed={resume.lastPlayed}
          onContinue={handleResumeContinue}
          onStartOver={() => setResume(null)}
        />
      )}

      {!loading && !error && data && started && view && (
        <div className="flex flex-1 flex-col overflow-hidden rounded-t-[40px]">
          {canPlay ? (
            <AudioControls
              playing={isPlaying}
              repeat={repeat}
              onTogglePlay={pb.togglePlay}
              onStartOver={pb.startOver}
              onToggleRepeat={onToggleRepeat}
            />
          ) : (
            <div className="flex w-full shrink-0 items-center justify-center gap-2 border-b border-line bg-white px-4 py-4 text-center text-sm font-medium text-muted-foreground">
              <WifiOff className="size-4 shrink-0 opacity-70" />
              <span>Reading mode — you're offline and this surah isn't saved</span>
            </div>
          )}

          <AnimatePresence>
            {repeatNotif && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={easeOut}
                className="shrink-0 overflow-hidden bg-gradient-to-r from-teal to-teal-deep text-center text-sm font-medium text-white"
              >
                <div className="py-2.5">{repeatNotif}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex-1 overflow-y-auto bg-ground">
            <div className="flex min-h-full items-center justify-center px-6 py-10">
              <div className="mx-auto w-full max-w-[632px]">
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div
                    key={`${verseIndex}:${segmentIndex}`}
                    custom={dir}
                    variants={slide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={easeOut}
                  >
                    <VerseView
                      arabic={view.arabic}
                      words={settings.highlighting && canPlay ? renderWords : undefined}
                      activeWord={activeLocal}
                      onWordClick={pb.playWordAt}
                      highlight={settings.highlighting && canPlay}
                      transliteration={view.transliteration}
                      translation={view.translation}
                      verseNumber={view.verseNumber}
                      showTranslation={settings.translation}
                      showTransliteration={settings.transliteration}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>

          {segmented && (
            <SegmentNav
              total={segments.length}
              index={segmentIndex}
              onSelect={pb.goSegment}
              onPrev={() => pb.goSegment(segmentIndex - 1)}
              onNext={() => pb.goSegment(segmentIndex + 1)}
            />
          )}

          {/* Bottom verse navigation */}
          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-line bg-white px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:gap-6">
            <motion.button
              whileTap={{ scale: 0.97, transition: springPress }}
              onClick={() => pb.goVerse(verseIndex - 1)}
              disabled={verseIndex === 0}
              className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
            >
              <ChevronLeft />
              <span className="hidden sm:inline">Previous Verse</span>
            </motion.button>

            <Select value={String(verseIndex)} onValueChange={(v) => pb.goVerse(Number(v))}>
              <SelectTrigger
                aria-label="Jump to verse"
                className="h-[60px] flex-1 rounded-[30px] px-4 sm:h-12 sm:flex-none"
              >
                <SelectValue>
                  <span className="text-muted-foreground">Verse</span>{" "}
                  <b className="font-bold text-ink">{verseNum}</b>{" "}
                  <span className="text-muted-foreground">of {verses.length}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {verses.map((v, i) => {
                  const waqf = v.segments?.length ?? 0
                  return (
                    <SelectItem
                      key={v.key}
                      value={String(i)}
                      trailing={
                        waqf > 1 ? (
                          <span className="ml-auto pl-3 text-xs font-medium text-muted-foreground group-data-[state=checked]/item:text-white/70">
                            {waqf} Waqf
                          </span>
                        ) : null
                      }
                    >
                      Verse {v.key.split(":")[1]}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <motion.button
              whileTap={{ scale: 0.97, transition: springPress }}
              onClick={() => pb.goVerse(verseIndex + 1)}
              disabled={verseIndex === verses.length - 1}
              className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
            >
              <span className="hidden sm:inline">Next Verse</span>
              <ChevronRight />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}
