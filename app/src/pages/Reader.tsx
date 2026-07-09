import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Download, Loader2, WifiOff } from "lucide-react"
import { useSurah } from "@/hooks/useSurah"
import { useTimings } from "@/hooks/useTimings"
import { useVerseAudio } from "@/hooks/useVerseAudio"
import { useSegmentLoop } from "@/hooks/useSegmentLoop"
import { useMediaSession } from "@/hooks/useMediaSession"
import { useHaptics } from "@/hooks/useHaptics"
import { isBundledAudio, isSegmented, type TimingVerse } from "@/data/quran"
import { audioSrc, downloadSurah, isAvailableOffline, isDownloaded, useDownloads } from "@/lib/downloads"
import { useOnline } from "@/hooks/useOnline"
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
import { SettingsDialog, type ReaderSettings } from "@/components/reader/SettingsDialog"
import { ResumeDialog } from "@/components/reader/ResumeDialog"
import { easeOut, springPress } from "@/lib/motion"
import { activeWordAt } from "@/lib/highlight"

const DEFAULT_SETTINGS: ReaderSettings = {
  translation: true,
  transliteration: true,
  highlighting: true,
  repeatBreath: true,
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

// The breath inserted between repeats of a waqf segment when "Pause between repeats" is on.
// Sample-accurate looping means the cut never bleeds regardless; this is purely hifz pacing.
const REPEAT_GAP_MS = 150

export default function Reader() {
  const { id } = useParams()
  const surahId = Number(id)
  useDownloads() // re-render if this surah's downloaded state changes
  const online = useOnline()
  const savedOffline = isAvailableOffline(surahId) // bundled (Al-Fatiha) or downloaded
  // Stream by default when online; play the local file when saved. Reading-mode only when
  // offline AND not saved.
  const canPlay = savedOffline || online
  const { data, loading, error } = useSurah(surahId)
  const timings = useTimings(surahId)
  const { playing, play, pause, stop, seek, setOnEnded, audioRef } = useVerseAudio()
  const loop = useSegmentLoop()
  const haptics = useHaptics()

  const [started, setStarted] = useState(false)
  const [verseIndex, setVerseIndex] = useState(0)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [dir, setDir] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)
  const [activeWord, setActiveWord] = useState(-1) // global word index into timing.words
  const [resume, setResume] = useState<{ verse: number; lastPlayed: number } | null>(null)
  const [repeatNotif, setRepeatNotif] = useState<string | null>(null)
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null) // save-for-offline progress

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

  // Segment-repeat runs on the sample-accurate Web-Audio looper; everything else on <audio>.
  const useLoop = repeat && segmented
  const isPlaying = playing || loop.playing
  const gapMs = () => (settings.repeatBreath ? REPEAT_GAP_MS : 0)

  const srcFor = useCallback(
    (i: number) => {
      const v = verses[i]
      return v ? audioSrc(surahId, Number(v.key.split(":")[1])) : ""
    },
    [verses, surahId]
  )

  // Start (or restart) the segment loop on the focused segment of the current verse.
  // If Web Audio can't decode the file on this device, fall back to linear <audio> playback
  // from the segment start so repeat mode never goes silent.
  const startSegLoop = (sIdx = segmentIndex) => {
    const seg = timing?.segments?.[sIdx]
    if (!seg) return
    pause() // silence the <audio> element; the looper takes over
    loop.unlock()
    loop.startLoop(srcFor(verseIndex), seg.start, seg.end, { gapMs: gapMs() }).catch(() => {
      play(srcFor(verseIndex), seg.start)
    })
  }

  // Refs so the rAF loop reads live values without re-subscribing every frame.
  const timingRef = useRef<TimingVerse | undefined>(undefined)
  const segIdxRef = useRef(0)
  const highlightRef = useRef(true)
  const repeatRef = useRef(false)
  const segmentedRef = useRef(false)
  const getPosRef = useRef(loop.getPosition)
  const activeRef = useRef(-1)
  timingRef.current = timing
  segIdxRef.current = segmentIndex
  highlightRef.current = settings.highlighting
  repeatRef.current = repeat
  segmentedRef.current = segmented
  getPosRef.current = loop.getPosition

  // Reset when the surah changes.
  useEffect(() => {
    setStarted(false)
    setVerseIndex(0)
    setSegmentIndex(0)
    setDir(0)
    stop()
    loop.stopLoop()
  }, [surahId, stop, loop.stopLoop])

  // On entering a surah, offer to resume if there's meaningful saved progress.
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

  // Persist reading progress + mark recent (drives the Home cards) — only while reading.
  useEffect(() => {
    if (!verse || !started) return
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
  }, [surahId, verseIndex, verse, verseNum, started])

  // Natural end of a verse's <audio>: loop a single-breath verse, or advance and keep playing.
  // (Segmented repeat is handled by the Web-Audio looper, so `ended` never fires there.)
  useEffect(() => {
    setOnEnded(() => {
      if (repeat && !segmented) {
        play(srcFor(verseIndex)) // loop the whole verse when it has no waqf segments
      } else if (!repeat && verseIndex < verses.length - 1) {
        const next = verseIndex + 1
        setDir(1)
        setVerseIndex(next)
        setSegmentIndex(0)
        play(srcFor(next))
      }
    })
  }, [repeat, segmented, verseIndex, verses.length, play, srcFor, setOnEnded])

  // Playback sync loop: highlight the spoken word + follow segments as audio plays. Reads the
  // position from whichever engine is live — <audio> during normal play, the looper on repeat.
  useEffect(() => {
    if (!isPlaying) {
      activeRef.current = -1
      setActiveWord(-1)
      return
    }
    let raf = 0
    const tick = () => {
      const tm = timingRef.current
      const fromLoop = repeatRef.current && segmentedRef.current
      const t = fromLoop ? getPosRef.current() : audioRef.current?.currentTime ?? null
      if (tm && t != null) {
        // follow the current segment during continuous (non-repeat) playback only
        if (!fromLoop && tm.segments && tm.segments.length > 1) {
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
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, audioRef])

  // Loop segment 0 of an arbitrary verse (used when navigating verses while repeat is on).
  const loopVerseAt = (vIdx: number, sIdx: number) => {
    const v = verses[vIdx]
    if (!v) return false
    const seg = timings.get(Number(v.key.split(":")[1]))?.segments?.[sIdx]
    if (!seg) return false
    pause()
    loop.unlock()
    loop.startLoop(srcFor(vIdx), seg.start, seg.end, { gapMs: gapMs() }).catch(() => {
      play(srcFor(vIdx), seg.start)
    })
    return true
  }

  const goVerse = (i: number) => {
    if (!verses.length) return
    const clamped = Math.max(0, Math.min(verses.length - 1, i))
    if (clamped === verseIndex) return
    haptics.tap() // Light — verse change (was Medium, felt too strong on device)
    setDir(clamped > verseIndex ? 1 : -1)
    setVerseIndex(clamped)
    setSegmentIndex(0)
    segIdxRef.current = 0
    const wasPlaying = isPlaying
    if (loop.playing) loop.stopLoop()
    if (!wasPlaying) return
    // keep playing the new verse: loop its first segment on repeat, else stream it
    if (repeat && isSegmented(verses[clamped]) && loopVerseAt(clamped, 0)) return
    play(srcFor(clamped))
  }
  const goSegment = (i: number) => {
    const clamped = Math.max(0, Math.min(segments.length - 1, i))
    if (clamped !== segmentIndex) haptics.tap()
    setDir(clamped >= segmentIndex ? 1 : -1)
    setSegmentIndex(clamped)
    segIdxRef.current = clamped
    const seg = timing?.segments?.[clamped]
    if (!seg) return
    if (loop.playing) {
      startSegLoop(clamped) // re-focus the loop on the newly selected segment
    } else if (playing) {
      seek(seg.start)
      play(srcFor(verseIndex))
    }
  }

  const saveOffline = async () => {
    if (dl || !verses.length) return
    setDl({ done: 0, total: verses.length })
    try {
      await downloadSurah(surahId, verses.length, (p) => setDl(p))
    } catch {
      /* stay on streaming — user can retry */
    } finally {
      setDl(null)
    }
  }

  const handleStart = () => {
    setStarted(true)
    if (!canPlay) return
    loop.unlock()
    if (useLoop) startSegLoop()
    else play(srcFor(verseIndex))
  }
  const togglePlay = () => {
    haptics.tap()
    if (isPlaying) {
      if (loop.playing) loop.pauseLoop()
      else pause()
      return
    }
    loop.unlock()
    if (useLoop) startSegLoop()
    else play(srcFor(verseIndex))
  }
  const startOver = () => {
    setDir(-1)
    setVerseIndex(0)
    setSegmentIndex(0)
    segIdxRef.current = 0
    if (loop.playing) loop.stopLoop()
    if (repeat && verses[0] && isSegmented(verses[0]) && loopVerseAt(0, 0)) return
    play(srcFor(0))
  }

  const toggleRepeat = () => {
    const next = !repeat
    setRepeat(next)
    setRepeatNotif(next ? "Repeat mode on" : "Repeat mode off")
    if (!segmented || !canPlay) return
    if (next) {
      loop.unlock()
      loop.prefetch(srcFor(verseIndex))
      if (isPlaying) startSegLoop() // hand playback from <audio> to the looper
    } else {
      const wasLooping = loop.playing
      loop.stopLoop()
      if (wasLooping) {
        // resume linear playback from the segment we were repeating
        play(srcFor(verseIndex), timing?.segments?.[segmentIndex]?.start)
      }
    }
  }

  const handleResumeContinue = () => {
    if (!resume) return
    const idx = verses.findIndex((v) => Number(v.key.split(":")[1]) === resume.verse)
    const target = idx >= 0 ? idx : 0
    setResume(null)
    setStarted(true)
    setVerseIndex(target)
    setSegmentIndex(0)
    if (!canPlay) return
    loop.unlock()
    play(srcFor(target))
  }

  // Lock-screen / background-audio transport controls.
  useMediaSession({
    title: data ? `${data.englishName} · Verse ${verseNum}` : "Sabeel",
    artist: "Mishary Rashid Alafasy",
    playing: isPlaying,
    onPlay: () => {
      loop.unlock()
      if (useLoop) startSegLoop()
      else play(srcFor(verseIndex))
    },
    onPause: () => {
      if (loop.playing) loop.pauseLoop()
      else pause()
    },
    onNext: () => goVerse(verseIndex + 1),
    onPrev: () => goVerse(verseIndex - 1),
  })

  // Auto-hide the repeat-mode notification strip.
  useEffect(() => {
    if (!repeatNotif) return
    const t = setTimeout(() => setRepeatNotif(null), 2000)
    return () => clearTimeout(t)
  }, [repeatNotif])

  // Warm the decoded buffer so the first repeat starts instantly (no fetch/decode stall).
  useEffect(() => {
    if (useLoop && canPlay) loop.prefetch(srcFor(verseIndex))
  }, [useLoop, canPlay, verseIndex, srcFor, loop.prefetch])

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
    if (loop.playing) return // words belong to the segment currently repeating — ignore taps
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
    <div className="flex h-dvh flex-col overflow-hidden bg-teal-deep">
      {/* Header (lean) — title block is absolutely centered on the screen */}
      <header className="relative flex shrink-0 items-center justify-between px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6">
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

        <div className="flex items-center gap-1">
          {data &&
            !isBundledAudio(surahId) &&
            (dl ? (
              <span className="inline-flex items-center gap-1.5 px-2 text-xs tabular-nums text-white/90">
                <Loader2 className="size-4 animate-spin" />
                <CountUp value={dl.done} />/{dl.total}
              </span>
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
          <SettingsDialog settings={settings} onChange={updateSettings} />
        </div>
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
        <BismillahScreen onStart={handleStart} audioAvailable={canPlay} />
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
              onTogglePlay={togglePlay}
              onStartOver={startOver}
              onToggleRepeat={toggleRepeat}
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
                      onWordClick={onWordClick}
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
              className="flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-[#c0c0c0] [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"
            >
              <ChevronLeft />
              <span className="hidden sm:inline">Previous Verse</span>
            </motion.button>

            <Select value={String(verseIndex)} onValueChange={(v) => goVerse(Number(v))}>
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
              onClick={() => goVerse(verseIndex + 1)}
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
