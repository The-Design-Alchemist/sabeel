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
import { loadDuaCategory, type Dua } from "@/data/duas"
import { audioSrc, isAvailableOffline } from "@/lib/downloads"
import { useVerseAudio } from "@/hooks/useVerseAudio"
import { useSegmentLoop } from "@/hooks/useSegmentLoop"
import { useMediaSession } from "@/hooks/useMediaSession"
import { useOnline } from "@/hooks/useOnline"
import { useHaptics } from "@/hooks/useHaptics"
import { activeWordAt } from "@/lib/highlight"

const REPEAT_GAP_MS = 150

type Verse = SurahData["verses"][number]
type Mode = "surah" | "dua" | null

export type NowPlaying = {
  kind: "surah" | "dua"
  title: string
  subtitle: string
  route: string
  atStart: boolean
  atEnd: boolean
}

export type PlaybackApi = {
  // ---- shared ----
  mode: Mode
  playing: boolean
  repeat: boolean
  activeWord: number
  nowPlaying: NowPlaying | null
  togglePlay: () => void
  startOver: () => void
  toggleRepeat: () => void
  next: () => void
  prev: () => void
  // ---- surah session ----
  surahId: number | null
  started: boolean
  loading: boolean
  error: string | null
  canPlay: boolean
  data: SurahData | null
  verses: Verse[]
  timing: TimingVerse | undefined
  verseNum: number
  segmented: boolean
  segments: NonNullable<Verse["segments"]>
  verseIndex: number
  segmentIndex: number
  dir: number
  open: (surahId: number) => void
  start: () => void
  resumeAt: (verseIndex: number) => void
  goVerse: (i: number) => void
  goSegment: (i: number) => void
  playWordAt: (localIdx: number) => void
  // ---- dua session ----
  duas: Dua[]
  duaTopicName: string
  duaArabicName: string
  duaIndex: number
  duaLoading: boolean
  duaError: boolean
  duaDir: number
  openDua: (categoryId: string, topicId: string) => void
  goDua: (i: number) => void
}

const PlaybackContext = createContext<PlaybackApi | null>(null)

export function usePlayback(): PlaybackApi {
  const ctx = useContext(PlaybackContext)
  if (!ctx) throw new Error("usePlayback must be used within <PlaybackProvider>")
  return ctx
}

const duaSrc = (d: Dua | undefined) =>
  d && d.surah != null && d.ayah != null ? audioSrc(d.surah, d.ayah) : ""

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { playing, play, pause, stop, seek, setOnEnded, audioRef } = useVerseAudio()
  const loop = useSegmentLoop()
  const haptics = useHaptics()
  const online = useOnline()

  const [mode, setMode] = useState<Mode>(null)
  const [activeWord, setActiveWord] = useState(-1)

  // ---- surah session state ----
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

  // ---- dua session state ----
  const [duaCategoryId, setDuaCategoryId] = useState<string | null>(null)
  const [duaTopicId, setDuaTopicId] = useState<string | null>(null)
  const [duaTopicName, setDuaTopicName] = useState("")
  const [duaArabicName, setDuaArabicName] = useState("")
  const [duas, setDuas] = useState<Dua[]>([])
  const [duaIndex, setDuaIndex] = useState(0)
  const [duaLoading, setDuaLoading] = useState(false)
  const [duaError, setDuaError] = useState(false)
  const [duaDir, setDuaDir] = useState(0)
  const [duaRepeat, setDuaRepeat] = useState(false)
  const [duaStarted, setDuaStarted] = useState(false)

  const verses = data?.verses ?? []
  const verse = verses[verseIndex]
  const verseNum = verse ? Number(verse.key.split(":")[1]) : 0
  const timing = timings.get(verseNum)
  const segmented = verse ? isSegmented(verse) : false
  const segments = verse?.segments ?? []
  const savedOffline = surahId != null && isAvailableOffline(surahId)
  const canPlay = savedOffline || online

  const dua = duas[duaIndex]
  const useLoop = mode === "surah" && repeat && segmented
  const isPlaying = playing || loop.playing
  const gapMs = () => REPEAT_GAP_MS

  // refs so callbacks read live identity without re-subscribing
  const modeRef = useRef<Mode>(null)
  const surahIdRef = useRef<number | null>(null)
  const duaTopicIdRef = useRef<string | null>(null)
  modeRef.current = mode
  surahIdRef.current = surahId
  duaTopicIdRef.current = duaTopicId

  const stopAll = useCallback(() => {
    stop()
    loop.stopLoop()
  }, [stop, loop])

  // ---- surah data loading -------------------------------------------------
  useEffect(() => {
    if (surahId == null) return
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

  // reset surah position on a fresh surah
  useEffect(() => {
    if (surahId == null) return
    setStarted(false)
    setVerseIndex(0)
    setSegmentIndex(0)
    setDir(0)
    setActiveWord(-1)
  }, [surahId])

  // ---- dua data loading ---------------------------------------------------
  useEffect(() => {
    if (!duaCategoryId || !duaTopicId) return
    let alive = true
    setDuaLoading(true)
    setDuaError(false)
    setDuaIndex(0)
    setDuaDir(0)
    setDuaStarted(false)
    loadDuaCategory(duaCategoryId)
      .then((d) => {
        if (!alive) return
        const t = d.topics.find((x) => x.id === duaTopicId)
        if (t) {
          setDuas(t.duas)
          setDuaTopicName(t.name)
          setDuaArabicName(t.arabicName)
        } else setDuaError(true)
        setDuaLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setDuaError(true)
        setDuaLoading(false)
      })
    return () => {
      alive = false
    }
  }, [duaCategoryId, duaTopicId])

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

  // refs for the rAF highlight loop
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

  // ---- surah: progress persistence ---------------------------------------
  useEffect(() => {
    if (mode !== "surah" || surahId == null || !verse || !started) return
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
  }, [mode, surahId, verseIndex, verse, verseNum, started])

  // ---- end-of-track: loop or advance, per mode ---------------------------
  useEffect(() => {
    setOnEnded(() => {
      if (mode === "surah") {
        if (repeat && !segmented) {
          play(srcFor(verseIndex))
        } else if (!repeat && verseIndex < verses.length - 1) {
          const nx = verseIndex + 1
          setDir(1)
          setVerseIndex(nx)
          setSegmentIndex(0)
          play(srcFor(nx))
        }
      } else if (mode === "dua") {
        if (duaRepeat) {
          const src = duaSrc(duas[duaIndex])
          if (src) play(src, 0)
        }
      }
    })
  }, [mode, repeat, segmented, verseIndex, verses.length, duaRepeat, duas, duaIndex, play, srcFor, setOnEnded])

  // ---- surah highlight + segment follow ----------------------------------
  useEffect(() => {
    if (mode !== "surah" || !isPlaying) {
      if (mode !== "dua") {
        activeRef.current = -1
        setActiveWord(-1)
      }
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
  }, [mode, isPlaying, audioRef])

  // ---- dua highlight -----------------------------------------------------
  const duaTimes = useMemo(
    () => dua?.words?.map((w) => ({ start: w.s, end: w.e })),
    [dua]
  )
  useEffect(() => {
    if (mode !== "dua" || !isPlaying || !duaTimes?.length) {
      if (mode === "dua") setActiveWord(-1)
      return
    }
    let raf = 0
    const tick = () => {
      setActiveWord(activeWordAt(duaTimes, audioRef.current?.currentTime ?? 0))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, isPlaying, duaTimes, audioRef])

  // ============================ surah transport ============================
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
      if (loop.playing) startSegLoop(clamped)
      else if (playing) {
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

  // ============================ dua transport ==============================
  const goDua = useCallback(
    (i: number) => {
      if (!duas.length) return
      const clamped = Math.max(0, Math.min(duas.length - 1, i))
      if (clamped === duaIndex) return
      haptics.tap()
      setDuaDir(clamped > duaIndex ? 1 : -1)
      setDuaIndex(clamped)
      setActiveWord(-1)
      const wasPlaying = isPlaying
      if (!wasPlaying) return
      const src = duaSrc(duas[clamped])
      if (src) {
        setDuaStarted(true)
        play(src, 0)
      }
    },
    [duas, duaIndex, haptics, isPlaying, play]
  )

  // ============================ mode switching =============================
  const open = useCallback(
    (id: number) => {
      if (modeRef.current === "surah" && surahIdRef.current === id) return
      stopAll()
      setMode("surah")
      setSurahId(id)
    },
    [stopAll]
  )

  const openDua = useCallback(
    (categoryId: string, topicId: string) => {
      if (modeRef.current === "dua" && duaTopicIdRef.current === topicId) return
      stopAll()
      setMode("dua")
      setDuaCategoryId(categoryId)
      setDuaTopicId(topicId)
    },
    [stopAll]
  )

  // ============================ shared transport ===========================
  const togglePlay = useCallback(() => {
    haptics.tap()
    if (mode === "surah") {
      if (isPlaying) {
        if (loop.playing) loop.pauseLoop()
        else pause()
        return
      }
      loop.unlock()
      if (useLoop) startSegLoop()
      else play(srcFor(verseIndex))
    } else if (mode === "dua") {
      if (isPlaying) {
        pause()
        return
      }
      const src = duaSrc(duas[duaIndex])
      if (src) {
        setDuaStarted(true)
        play(src)
      }
    }
  }, [haptics, mode, isPlaying, loop, pause, useLoop, startSegLoop, play, srcFor, verseIndex, duas, duaIndex])

  const startOver = useCallback(() => {
    if (mode === "surah") {
      setDir(-1)
      setVerseIndex(0)
      setSegmentIndex(0)
      segIdxRef.current = 0
      if (loop.playing) loop.stopLoop()
      if (repeat && verses[0] && isSegmented(verses[0]) && loopVerseAt(0, 0)) return
      play(srcFor(0))
    } else if (mode === "dua") {
      const src = duaSrc(duas[duaIndex])
      if (src) {
        setDuaStarted(true)
        play(src, 0)
      }
    }
  }, [mode, loop, repeat, verses, loopVerseAt, play, srcFor, duas, duaIndex])

  const toggleRepeat = useCallback(() => {
    if (mode === "dua") {
      setDuaRepeat((p) => !p)
      return
    }
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
  }, [mode, segmented, canPlay, loop, srcFor, verseIndex, isPlaying, startSegLoop, play, timing, segmentIndex])

  const next = useCallback(() => {
    if (mode === "surah") goVerse(verseIndex + 1)
    else if (mode === "dua") goDua(duaIndex + 1)
  }, [mode, goVerse, verseIndex, goDua, duaIndex])

  const prev = useCallback(() => {
    if (mode === "surah") goVerse(verseIndex - 1)
    else if (mode === "dua") goDua(duaIndex - 1)
  }, [mode, goVerse, verseIndex, goDua, duaIndex])

  // ---- lock-screen / background transport --------------------------------
  useMediaSession({
    title:
      mode === "dua"
        ? duaTopicName || "Sabeel"
        : data
          ? `${data.englishName} · Verse ${verseNum}`
          : "Sabeel",
    artist: "Mishary Rashid Alafasy",
    playing: isPlaying,
    onPlay: togglePlay,
    onPause: togglePlay,
    onNext: next,
    onPrev: prev,
  })

  // warm the decoded buffer so the first surah repeat starts instantly
  useEffect(() => {
    if (useLoop && canPlay) loop.prefetch(srcFor(verseIndex))
  }, [useLoop, canPlay, verseIndex, srcFor, loop.prefetch])

  // ---- unified "now playing" for the mini-player -------------------------
  const nowPlaying = useMemo<NowPlaying | null>(() => {
    if (mode === "surah" && started && data) {
      return {
        kind: "surah",
        title: data.englishName,
        subtitle: `Verse ${verseNum} of ${verses.length}`,
        route: `/surah/${surahId}`,
        atStart: verseIndex === 0,
        atEnd: verseIndex >= verses.length - 1,
      }
    }
    if (mode === "dua" && duaStarted && duas.length) {
      return {
        kind: "dua",
        title: duaTopicName,
        subtitle: `Dua ${duaIndex + 1} of ${duas.length}`,
        route: `/duas/${duaCategoryId}/${duaTopicId}`,
        atStart: duaIndex === 0,
        atEnd: duaIndex >= duas.length - 1,
      }
    }
    return null
  }, [mode, started, data, verseNum, verses.length, surahId, verseIndex, duaStarted, duas.length, duaTopicName, duaIndex, duaCategoryId, duaTopicId])

  const api = useMemo<PlaybackApi>(
    () => ({
      mode,
      playing: isPlaying,
      repeat: mode === "dua" ? duaRepeat : repeat,
      activeWord,
      nowPlaying,
      togglePlay,
      startOver,
      toggleRepeat,
      next,
      prev,
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
      open,
      start,
      resumeAt,
      goVerse,
      goSegment,
      playWordAt,
      duas,
      duaTopicName,
      duaArabicName,
      duaIndex,
      duaLoading,
      duaError,
      duaDir,
      openDua,
      goDua,
    }),
    [
      mode, isPlaying, duaRepeat, repeat, activeWord, nowPlaying, togglePlay, startOver,
      toggleRepeat, next, prev, surahId, started, loading, error, canPlay, data, verses,
      timing, verseNum, segmented, segments, verseIndex, segmentIndex, dir, open, start,
      resumeAt, goVerse, goSegment, playWordAt, duas, duaTopicName, duaArabicName, duaIndex,
      duaLoading, duaError, duaDir, openDua, goDua,
    ]
  )

  return <PlaybackContext.Provider value={api}>{children}</PlaybackContext.Provider>
}
