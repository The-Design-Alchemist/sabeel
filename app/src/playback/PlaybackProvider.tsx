import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { loadSurah, loadTimings, isSegmented, type SurahData, type TimingVerse } from "@/data/quran"
import { audioSrc, isAvailableOffline } from "@/lib/downloads"
import { useVerseAudio } from "@/hooks/useVerseAudio"
import { useSegmentLoop } from "@/hooks/useSegmentLoop"
import { useMediaSession } from "@/hooks/useMediaSession"
import { useOnline } from "@/hooks/useOnline"
import { useHaptics } from "@/hooks/useHaptics"
import { activeWordAt } from "@/lib/highlight"

const REPEAT_GAP_MS = 150

type Verse = SurahData["verses"][number]

export type PlaybackApi = {
  // identity / status
  surahId: number | null
  started: boolean
  loading: boolean
  error: string | null
  canPlay: boolean
  // data
  data: SurahData | null
  verses: Verse[]
  timing: TimingVerse | undefined
  verseNum: number
  segmented: boolean
  segments: NonNullable<Verse["segments"]>
  // position
  verseIndex: number
  segmentIndex: number
  dir: number
  repeat: boolean
  playing: boolean
  activeWord: number
  // control
  open: (surahId: number) => void
  start: () => void
  resumeAt: (verseIndex: number) => void
  togglePlay: () => void
  startOver: () => void
  toggleRepeat: () => void
  goVerse: (i: number) => void
  goSegment: (i: number) => void
  playWordAt: (localIdx: number) => void
  clear: () => void
}

const PlaybackContext = createContext<PlaybackApi | null>(null)

export function usePlayback(): PlaybackApi {
  const ctx = useContext(PlaybackContext)
  if (!ctx) throw new Error("usePlayback must be used within <PlaybackProvider>")
  return ctx
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { playing, play, pause, stop, seek, setOnEnded, audioRef } = useVerseAudio()
  const loop = useSegmentLoop()
  const haptics = useHaptics()
  const online = useOnline()

  const [surahId, setSurahId] = useState<number | null>(null)
  const [data, setData] = useState<SurahData | null>(null)
  const [timings, setTimings] = useState<Map<number, TimingVerse>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [started, setStarted] = useState(false)
  const [verseIndex, setVerseIndex] = useState(0)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [dir, setDir] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const [activeWord, setActiveWord] = useState(-1)

  const verses = data?.verses ?? []
  const verse = verses[verseIndex]
  const verseNum = verse ? Number(verse.key.split(":")[1]) : 0
  const timing = timings.get(verseNum)
  const segmented = verse ? isSegmented(verse) : false
  const segments = verse?.segments ?? []

  const savedOffline = surahId != null && isAvailableOffline(surahId)
  const canPlay = savedOffline || online

  const useLoop = repeat && segmented
  const isPlaying = playing || loop.playing
  const gapMs = () => REPEAT_GAP_MS

  // ---- data loading (replaces useSurah/useTimings; only loads a real active surah) --------
  useEffect(() => {
    if (surahId == null) {
      setData(null)
      setTimings(new Map())
      setError(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([loadSurah(surahId), loadTimings(surahId).catch(() => [] as TimingVerse[])])
      .then(([d, t]) => {
        if (!alive) return
        setData(d)
        setTimings(new Map(t.map((v) => [v.verseNumber, v])))
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!alive) return
        setError(e.message)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [surahId])

  const srcFor = useCallback(
    (i: number) => {
      const v = verses[i]
      return v && surahId != null ? audioSrc(surahId, Number(v.key.split(":")[1])) : ""
    },
    [verses, surahId]
  )

  const startSegLoop = useCallback(
    (sIdx = segmentIndex) => {
      const seg = timing?.segments?.[sIdx]
      if (!seg) return
      pause()
      loop.unlock()
      loop.startLoop(srcFor(verseIndex), seg.start, seg.end, { gapMs: gapMs() }).catch(() => {
        play(srcFor(verseIndex), seg.start)
      })
    },
    [segmentIndex, timing, pause, loop, srcFor, verseIndex, play]
  )

  // refs so the rAF loop reads live values without re-subscribing every frame
  const timingRef = useRef<TimingVerse | undefined>(undefined)
  const segIdxRef = useRef(0)
  const repeatRef = useRef(false)
  const segmentedRef = useRef(false)
  const getPosRef = useRef(loop.getPosition)
  const activeRef = useRef(-1)
  timingRef.current = timing
  segIdxRef.current = segmentIndex
  repeatRef.current = repeat
  segmentedRef.current = segmented
  getPosRef.current = loop.getPosition

  // reset when the active surah changes (fresh open)
  useEffect(() => {
    if (surahId == null) return
    setStarted(false)
    setVerseIndex(0)
    setSegmentIndex(0)
    setDir(0)
    setActiveWord(-1)
    activeRef.current = -1
    stop()
    loop.stopLoop()
  }, [surahId, stop, loop.stopLoop])

  // persist reading progress + recents (drives the Home cards) while reading
  useEffect(() => {
    if (surahId == null || !verse || !started) return
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

  // natural end of a verse's <audio>: loop a breath-verse, or advance and keep playing
  useEffect(() => {
    setOnEnded(() => {
      if (repeat && !segmented) {
        play(srcFor(verseIndex))
      } else if (!repeat && verseIndex < verses.length - 1) {
        const next = verseIndex + 1
        setDir(1)
        setVerseIndex(next)
        setSegmentIndex(0)
        play(srcFor(next))
      }
    })
  }, [repeat, segmented, verseIndex, verses.length, play, srcFor, setOnEnded])

  // playback sync loop: highlight the spoken word + follow segments during linear play
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
        if (!fromLoop && tm.segments && tm.segments.length > 1) {
          const si = tm.segments.findIndex((s) => t >= s.start && t < s.end)
          if (si >= 0 && si !== segIdxRef.current) {
            segIdxRef.current = si
            setDir(1)
            setSegmentIndex(si)
          }
        }
        const idx = activeWordAt(tm.words, t)
        if (idx !== activeRef.current) {
          activeRef.current = idx
          setActiveWord(idx)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, audioRef])

  const loopVerseAt = useCallback(
    (vIdx: number, sIdx: number) => {
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
    },
    [verses, timings, pause, loop, srcFor, play]
  )

  const goVerse = useCallback(
    (i: number) => {
      if (!verses.length) return
      const clamped = Math.max(0, Math.min(verses.length - 1, i))
      if (clamped === verseIndex) return
      haptics.tap()
      setDir(clamped > verseIndex ? 1 : -1)
      setVerseIndex(clamped)
      setSegmentIndex(0)
      segIdxRef.current = 0
      const wasPlaying = isPlaying
      if (loop.playing) loop.stopLoop()
      if (!wasPlaying) return
      if (repeat && isSegmented(verses[clamped]) && loopVerseAt(clamped, 0)) return
      play(srcFor(clamped))
    },
    [verses, verseIndex, haptics, isPlaying, loop, repeat, loopVerseAt, play, srcFor]
  )

  const goSegment = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(segments.length - 1, i))
      if (clamped !== segmentIndex) haptics.tap()
      setDir(clamped >= segmentIndex ? 1 : -1)
      setSegmentIndex(clamped)
      segIdxRef.current = clamped
      const seg = timing?.segments?.[clamped]
      if (!seg) return
      if (loop.playing) {
        startSegLoop(clamped)
      } else if (playing) {
        seek(seg.start)
        play(srcFor(verseIndex))
      }
    },
    [segments.length, segmentIndex, haptics, timing, loop, startSegLoop, playing, seek, play, srcFor, verseIndex]
  )

  const start = useCallback(() => {
    setStarted(true)
    if (!canPlay) return
    loop.unlock()
    if (useLoop) startSegLoop()
    else play(srcFor(verseIndex))
  }, [canPlay, loop, useLoop, startSegLoop, play, srcFor, verseIndex])

  const togglePlay = useCallback(() => {
    haptics.tap()
    if (isPlaying) {
      if (loop.playing) loop.pauseLoop()
      else pause()
      return
    }
    loop.unlock()
    if (useLoop) startSegLoop()
    else play(srcFor(verseIndex))
  }, [haptics, isPlaying, loop, pause, useLoop, startSegLoop, play, srcFor, verseIndex])

  const startOver = useCallback(() => {
    setDir(-1)
    setVerseIndex(0)
    setSegmentIndex(0)
    segIdxRef.current = 0
    if (loop.playing) loop.stopLoop()
    if (repeat && verses[0] && isSegmented(verses[0]) && loopVerseAt(0, 0)) return
    play(srcFor(0))
  }, [loop, repeat, verses, loopVerseAt, play, srcFor])

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      const next = !prev
      if (!segmented || !canPlay) return next
      if (next) {
        loop.unlock()
        loop.prefetch(srcFor(verseIndex))
        if (isPlaying) startSegLoop()
      } else {
        const wasLooping = loop.playing
        loop.stopLoop()
        if (wasLooping) play(srcFor(verseIndex), timing?.segments?.[segmentIndex]?.start)
      }
      return next
    })
  }, [segmented, canPlay, loop, srcFor, verseIndex, isPlaying, startSegLoop, play, timing, segmentIndex])

  const playWordAt = useCallback(
    (localIdx: number) => {
      if (loop.playing || !timing) return
      const base = segmented && timing.segments ? timing.segments[segmentIndex].startWord : 0
      const w = timing.words[base + localIdx]
      if (!w) return
      seek(w.start)
      play(srcFor(verseIndex))
    },
    [loop.playing, timing, segmented, segmentIndex, seek, play, srcFor, verseIndex]
  )

  const open = useCallback((id: number) => {
    setSurahId((prev) => (prev === id ? prev : id))
  }, [])

  const resumeAt = useCallback(
    (target: number) => {
      setStarted(true)
      setVerseIndex(target)
      setSegmentIndex(0)
      if (!canPlay) return
      loop.unlock()
      play(srcFor(target))
    },
    [canPlay, loop, play, srcFor]
  )

  const clear = useCallback(() => {
    stop()
    loop.stopLoop()
    setSurahId(null)
    setStarted(false)
    setActiveWord(-1)
  }, [stop, loop])

  // lock-screen / background transport
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

  // warm the decoded buffer so the first repeat starts instantly
  useEffect(() => {
    if (useLoop && canPlay) loop.prefetch(srcFor(verseIndex))
  }, [useLoop, canPlay, verseIndex, srcFor, loop.prefetch])

  const api = useMemo<PlaybackApi>(
    () => ({
      surahId,
      started,
      loading,
      error,
      canPlay,
      data,
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
      open,
      start,
      resumeAt,
      togglePlay,
      startOver,
      toggleRepeat,
      goVerse,
      goSegment,
      playWordAt,
      clear,
    }),
    [
      surahId, started, loading, error, canPlay, data, verses, timing, verseNum, segmented,
      segments, verseIndex, segmentIndex, dir, repeat, isPlaying, activeWord, open, start,
      resumeAt, togglePlay, startOver, toggleRepeat, goVerse, goSegment, playWordAt, clear,
    ]
  )

  return <PlaybackContext.Provider value={api}>{children}</PlaybackContext.Provider>
}
