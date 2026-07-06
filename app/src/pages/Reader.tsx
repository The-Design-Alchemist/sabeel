import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { useSurah } from "@/hooks/useSurah"
import { useTimings } from "@/hooks/useTimings"
import { useVerseAudio } from "@/hooks/useVerseAudio"
import { audioUrl, isSegmented, type TimingVerse } from "@/data/quran"
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
import { SettingsDialog, type ReaderSettings } from "@/components/reader/SettingsDialog"
import { easeOut, springPress } from "@/lib/motion"
import { activeWordAt } from "@/lib/highlight"

const DEFAULT_SETTINGS: ReaderSettings = {
  translation: true,
  transliteration: true,
  highlighting: true,
}

function loadSettings(): ReaderSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("sabeel_settings") || "{}") }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -28 : 28 }),
}

export default function Reader() {
  const { id } = useParams()
  const surahId = Number(id)
  const { data, loading, error } = useSurah(surahId)
  const timings = useTimings(surahId)
  const { playing, play, pause, stop, seek, setOnEnded, audioRef } = useVerseAudio()

  const [started, setStarted] = useState(false)
  const [verseIndex, setVerseIndex] = useState(0)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [dir, setDir] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)
  const [activeWord, setActiveWord] = useState(-1) // global word index into timing.words

  const updateSettings = (patch: Partial<ReaderSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      localStorage.setItem("sabeel_settings", JSON.stringify(next))
      return next
    })
  }

  const verses = data?.verses ?? []
  const verse = verses[verseIndex]
  const verseNum = verse ? Number(verse.key.split(":")[1]) : 0
  const timing = timings.get(verseNum)
  const segmented = verse ? isSegmented(verse) : false
  const segments = verse?.segments ?? []

  const srcFor = useCallback(
    (i: number) => {
      const v = verses[i]
      return v ? audioUrl(surahId, Number(v.key.split(":")[1])) : ""
    },
    [verses, surahId]
  )

  // Refs so the rAF loop reads live values without re-subscribing every frame.
  const timingRef = useRef<TimingVerse | undefined>(undefined)
  const segIdxRef = useRef(0)
  const highlightRef = useRef(true)
  const activeRef = useRef(-1)
  timingRef.current = timing
  segIdxRef.current = segmentIndex
  highlightRef.current = settings.highlighting

  // Reset when the surah changes.
  useEffect(() => {
    setStarted(false)
    setVerseIndex(0)
    setSegmentIndex(0)
    setDir(0)
    stop()
  }, [surahId, stop])

  // Persist reading progress + mark recent (drives the Home cards).
  useEffect(() => {
    if (!verse) return
    localStorage.setItem(
      `progress_${surahId}`,
      JSON.stringify({ lastVerse: verseNum, lastPlayed: Date.now() })
    )
    try {
      const recents: number[] = JSON.parse(localStorage.getItem("recentSurahs") || "[]")
      localStorage.setItem(
        "recentSurahs",
        JSON.stringify([surahId, ...recents.filter((x) => x !== surahId)].slice(0, 6))
      )
    } catch {
      /* ignore */
    }
  }, [surahId, verseIndex, verse, verseNum])

  // Natural end of a verse's audio: repeat it, or advance and keep playing.
  useEffect(() => {
    setOnEnded(() => {
      if (repeat) {
        play(srcFor(verseIndex))
      } else if (verseIndex < verses.length - 1) {
        const next = verseIndex + 1
        setDir(1)
        setVerseIndex(next)
        setSegmentIndex(0)
        play(srcFor(next))
      }
    })
  }, [repeat, verseIndex, verses.length, play, srcFor, setOnEnded])

  // Playback sync loop: highlight the spoken word + follow segments as audio plays.
  useEffect(() => {
    if (!playing) {
      activeRef.current = -1
      setActiveWord(-1)
      return
    }
    let raf = 0
    const loop = () => {
      const a = audioRef.current
      const tm = timingRef.current
      if (a && tm) {
        const t = a.currentTime
        // follow the current segment during continuous playback
        if (tm.segments && tm.segments.length > 1) {
          const si = tm.segments.findIndex((s) => t >= s.start && t < s.end)
          if (si >= 0 && si !== segIdxRef.current) {
            segIdxRef.current = si
            setDir(1)
            setSegmentIndex(si)
          }
        }
        // highlight the active word (only when the toggle is on)
        if (highlightRef.current) {
          const idx = activeWordAt(tm.words, t)
          if (idx !== activeRef.current) {
            activeRef.current = idx
            setActiveWord(idx)
          }
        } else if (activeRef.current !== -1) {
          activeRef.current = -1
          setActiveWord(-1)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, audioRef])

  const goVerse = (i: number) => {
    if (!verses.length) return
    const clamped = Math.max(0, Math.min(verses.length - 1, i))
    if (clamped === verseIndex) return
    setDir(clamped > verseIndex ? 1 : -1)
    setVerseIndex(clamped)
    setSegmentIndex(0)
    if (playing) play(srcFor(clamped))
  }
  const goSegment = (i: number) => {
    const clamped = Math.max(0, Math.min(segments.length - 1, i))
    setDir(clamped >= segmentIndex ? 1 : -1)
    setSegmentIndex(clamped)
    segIdxRef.current = clamped
    const seg = timing?.segments?.[clamped]
    if (playing && seg) {
      seek(seg.start)
      play(srcFor(verseIndex))
    }
  }

  const handleStart = () => {
    setStarted(true)
    play(srcFor(verseIndex))
  }
  const togglePlay = () => (playing ? pause() : play(srcFor(verseIndex)))
  const startOver = () => {
    setDir(-1)
    setVerseIndex(0)
    setSegmentIndex(0)
    play(srcFor(0))
  }

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

  const onWordClick = (localIdx: number) => {
    if (!timing) return
    const base = segmented && timing.segments ? timing.segments[segmentIndex].startWord : 0
    const w = timing.words[base + localIdx]
    if (!w) return
    seek(w.start)
    play(srcFor(verseIndex))
  }

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
    <div className="flex min-h-screen flex-col bg-teal-deep">
      {/* Header (lean) — title block is absolutely centered on the screen */}
      <header className="relative flex items-center justify-between px-4 py-4 text-white sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowLeft className="size-5" />
          <span className="hidden sm:inline">Back to List</span>
        </Link>

        {data && (
          <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
            <span dir="rtl" lang="ar" className="whitespace-nowrap font-arabic text-lg sm:text-xl">
              سُورَة {data.name}
            </span>
            <span className="h-8 w-px bg-white/25" aria-hidden="true" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-sm font-semibold">{data.englishName}</span>
              <span className="text-xs text-white/60">{data.englishNameTranslation}</span>
            </div>
          </div>
        )}

        <SettingsDialog settings={settings} onChange={updateSettings} />
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

      {!loading && !error && data && !started && <BismillahScreen onStart={handleStart} />}

      {!loading && !error && data && started && view && (
        <div className="flex flex-1 flex-col overflow-hidden rounded-t-[40px]">
          <AudioControls
            playing={playing}
            repeat={repeat}
            onTogglePlay={togglePlay}
            onStartOver={startOver}
            onToggleRepeat={() => setRepeat((r) => !r)}
          />

          <main className="flex flex-1 items-center justify-center overflow-y-auto bg-ground px-6 py-10">
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
                    words={settings.highlighting ? renderWords : undefined}
                    activeWord={activeLocal}
                    onWordClick={onWordClick}
                    highlight={settings.highlighting}
                    transliteration={view.transliteration}
                    translation={view.translation}
                    verseNumber={view.verseNumber}
                    showTranslation={settings.translation}
                    showTransliteration={settings.transliteration}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {segmented && (
            <SegmentNav
              total={segments.length}
              index={segmentIndex}
              onSelect={goSegment}
              onPrev={() => goSegment(segmentIndex - 1)}
              onNext={() => goSegment(segmentIndex + 1)}
            />
          )}

          {/* Bottom verse navigation */}
          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-line bg-white px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:gap-6">
            <motion.button
              whileTap={{ scale: 0.97, transition: springPress }}
              onClick={() => goVerse(verseIndex - 1)}
              disabled={verseIndex === 0}
              className="flex h-12 flex-1 items-center justify-center gap-1 rounded-[30px] bg-teal-deep px-3 text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] sm:w-[200px] sm:flex-none [&_svg]:size-5"
            >
              <ChevronLeft />
              <span className="hidden sm:inline">Previous Verse</span>
            </motion.button>

            <Select value={String(verseIndex)} onValueChange={(v) => goVerse(Number(v))}>
              <SelectTrigger aria-label="Jump to verse" className="h-12 rounded-[30px] px-4">
                <SelectValue>
                  <span className="text-muted-foreground">Verse</span>{" "}
                  <b className="font-bold text-ink">{verseNum}</b>{" "}
                  <span className="text-muted-foreground">of {verses.length}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {verses.map((v, i) => (
                  <SelectItem key={v.key} value={String(i)}>
                    Verse {v.key.split(":")[1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <motion.button
              whileTap={{ scale: 0.97, transition: springPress }}
              onClick={() => goVerse(verseIndex + 1)}
              disabled={verseIndex === verses.length - 1}
              className="flex h-12 flex-1 items-center justify-center gap-1 rounded-[30px] bg-teal-deep px-3 text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] sm:w-[200px] sm:flex-none [&_svg]:size-5"
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
