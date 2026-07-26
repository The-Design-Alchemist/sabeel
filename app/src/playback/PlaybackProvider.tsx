import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { toast } from "sonner"
import { loadSurah, loadTimings, isSegmented, type SurahData, type TimingVerse } from "@/data/quran"
import { loadDuaCategory, type Dua } from "@/data/duas"
import { audioSrc, isAvailableOffline } from "@/lib/downloads"
import { ensureNotifyPermission } from "@/lib/notify"
import { useVerseAudio } from "@/hooks/useVerseAudio"
import { useSegmentLoop } from "@/hooks/useSegmentLoop"
import { useMediaSession } from "@/hooks/useMediaSession"
import { useOnline } from "@/hooks/useOnline"
import { useHaptics } from "@/hooks/useHaptics"
import { activeWordAt } from "@/lib/highlight"

const REPEAT_GAP_MS = 150

type Verse = SurahData["verses"][number]
type Mode = "surah" | "dua" | null

// Stable empty fallbacks — see the `verses`/`segments` derivation in the provider.
const NO_VERSES: Verse[] = []
const NO_SEGMENTS: NonNullable<Verse["segments"]> = []

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
  pending: boolean
  looping: boolean
  repeat: boolean
  activeWord: number
  nowPlaying: NowPlaying | null
  audioRef: RefObject<HTMLAudioElement | null>
  getProgress: () => number
  togglePlay: () => void
  startOver: () => void
  toggleRepeat: () => void
  next: () => void
  prev: () => void
  dismiss: () => void
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
  const { playing, pending, play, pause, stop, seek, setOnEnded, setOnError, audioRef } = useVerseAudio()
  const loop = useSegmentLoop()
  const haptics = useHaptics()
  const online = useOnline()

  const [mode, setMode] = useState<Mode>(null)
  const [activeWord, setActiveWord] = useState(-1)
  const [finished, setFinished] = useState(false) // playback reached the end → hide the mini-player
  const [dismissed, setDismissed] = useState(false) // user swiped/closed the pill → hide until next play
  const [loopPending, setLoopPending] = useState(false) // decoding a segment-loop buffer

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

  // Shared empty fallbacks: `?? []` would mint a fresh array on every render whenever the surah
  // hasn't loaded (or the verse has no segments), which changes the identity of `verses`/`segments`
  // and re-creates every transport callback below them — during the word-highlight rAF loop.
  const verses = data?.verses ?? NO_VERSES
  const verse = verses[verseIndex]
  const verseNum = verse ? Number(verse.key.split(":")[1]) : 0
  const timing = timings.get(verseNum)
  const segmented = verse ? isSegmented(verse) : false
  const segments = verse?.segments ?? NO_SEGMENTS
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
      setLoopPending(true)
      loop
        .startLoop(srcFor(verseIndex), seg.start, seg.end, { gapMs: gapMs() })
        .then(() => setLoopPending(false))
        .catch(() => {
          setLoopPending(false)
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

  // Playback progress 0..1 for the mini-player. While a waqf segment is looping, this is the
  // position WITHIN that segment (fills, resets, fills — mirroring the loop); otherwise it's the
  // <audio> element's position through the verse/dua. Reads live refs, so it's stable.
  const getProgress = useCallback((): number => {
    const fromLoop = repeatRef.current && segmentedRef.current
    if (fromLoop) {
      const seg = timingRef.current?.segments?.[segIdxRef.current]
      const pos = getPosRef.current()
      if (seg && pos != null) {
        const span = seg.end - seg.start
        return span > 0 ? Math.min(1, Math.max(0, (pos - seg.start) / span)) : 0
      }
      return 0
    }
    const a = audioRef.current
    return a && a.duration ? Math.min(1, a.currentTime / a.duration) : 0
  }, [audioRef])

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

  // Any (re)started playback brings the mini-player back after it finished or was dismissed.
  useEffect(() => {
    if (isPlaying) {
      setFinished(false)
      setDismissed(false)
    }
  }, [isPlaying])

  // Ask for notification permission the first time audio actually plays — that's the moment it
  // buys the user something (lock-screen + background controls are gated behind POST_NOTIFICATIONS
  // on Android 13+). It used to be requested in MainActivity.onCreate, which put a system dialog
  // over the first onboarding slide, before the user knew what Sabeel even was.
  const askedNotify = useRef(false)
  useEffect(() => {
    if (!isPlaying || askedNotify.current) return
    askedNotify.current = true
    void ensureNotifyPermission()
  }, [isPlaying])

  // ---- end-of-track: loop, advance, or finish, per mode ------------------
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
        } else if (!repeat) {
          setFinished(true) // last verse played through → surah complete, retire the pill
        }
      } else if (mode === "dua") {
        if (duaRepeat) {
          const src = duaSrc(duas[duaIndex])
          if (src) play(src, 0)
        } else {
          setFinished(true) // dua finished → retire the pill
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
            setDir(si > segIdxRef.current ? 1 : -1) // slide direction from the actual delta
            segIdxRef.current = si
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
      setLoopPending(true)
      loop
        .startLoop(srcFor(vIdx), seg.start, seg.end, { gapMs: gapMs() })
        .then(() => setLoopPending(false))
        .catch(() => {
          setLoopPending(false)
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
    [verses, verseIndex, isPlaying, loop, repeat, loopVerseAt, play, srcFor]
  )

  const goSegment = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(segments.length - 1, i))
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
    [segments.length, segmentIndex, timing, loop, startSegLoop, playing, seek, play, srcFor, verseIndex]
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
    [duas, duaIndex, isPlaying, play]
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
  // Kept haptic: play/pause is the core transport state change, and it's routinely pressed
  // without looking — from the mini-player, or with the reader only half in view.
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
    // Kept haptic: repeat is a sticky mode you can leave on by accident. One light tap either
    // way — the old success() buzz was a two-pulse Android pattern, i.e. a double vibration.
    haptics.tap()
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
    // repeat/duaRepeat are read through the functional updaters, so they aren't deps.
  }, [haptics, mode, segmented, canPlay, loop, srcFor, verseIndex, isPlaying, startSegLoop, play, timing, segmentIndex])

  const next = useCallback(() => {
    if (mode === "surah") goVerse(verseIndex + 1)
    else if (mode === "dua") goDua(duaIndex + 1)
  }, [mode, goVerse, verseIndex, goDua, duaIndex])

  const prev = useCallback(() => {
    if (mode === "surah") goVerse(verseIndex - 1)
    else if (mode === "dua") goDua(duaIndex - 1)
  }, [mode, goVerse, verseIndex, goDua, duaIndex])

  // Re-attempt the current track after a playback error.
  const retryPlayback = useCallback(() => {
    if (mode === "surah") play(srcFor(verseIndex))
    else if (mode === "dua") {
      const src = duaSrc(duas[duaIndex])
      if (src) play(src)
    }
  }, [mode, play, srcFor, verseIndex, duas, duaIndex])

  // Surface swallowed <audio> load/network failures as a toast with Retry (mirrors the
  // download flow). Offline gets a distinct message and no dead retry button.
  useEffect(() => {
    setOnError(() => {
      if (online) {
        toast.error("Couldn't play this recitation.", {
          action: { label: "Retry", onClick: retryPlayback },
        })
      } else {
        toast.error("You're offline — reconnect to listen.")
      }
    })
  }, [setOnError, online, retryPlayback])

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

  // warm the decoded buffer so the first surah repeat starts instantly.
  // Depends on loop.prefetch (stable), not the loop object, which changes as playback advances.
  useEffect(() => {
    if (useLoop && canPlay) loop.prefetch(srcFor(verseIndex))
  }, [useLoop, canPlay, verseIndex, srcFor, loop.prefetch])

  // Close the floating pill (swipe-down / ×): stop audio and hide until the next play.
  const dismiss = useCallback(() => {
    stopAll()
    setFinished(true)
    setDismissed(true)
  }, [stopAll])

  // ---- unified "now playing" for the mini-player -------------------------
  const nowPlaying = useMemo<NowPlaying | null>(() => {
    if (dismissed) return null
    if (mode === "surah" && started && data && !finished) {
      return {
        kind: "surah",
        title: data.englishName,
        // Multi-waqf verse → name the segment so the pill mirrors the reader's "Part X of Z".
        subtitle:
          segmented && segments.length > 1
            ? `Verse ${verseNum} · Waqf ${segmentIndex + 1} of ${segments.length}`
            : `Verse ${verseNum} of ${verses.length}`,
        route: `/surah/${surahId}`,
        atStart: verseIndex === 0,
        atEnd: verseIndex >= verses.length - 1,
      }
    }
    if (mode === "dua" && duaStarted && duas.length && !finished) {
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
  }, [mode, started, data, verseNum, verses.length, segmented, segmentIndex, segments.length, surahId, verseIndex, duaStarted, duas.length, duaTopicName, duaIndex, duaCategoryId, duaTopicId, finished, dismissed])

  const api = useMemo<PlaybackApi>(
    () => ({
      mode,
      playing: isPlaying,
      pending: pending || loopPending,
      looping: loop.playing,
      repeat: mode === "dua" ? duaRepeat : repeat,
      activeWord,
      nowPlaying,
      audioRef,
      getProgress,
      togglePlay,
      startOver,
      toggleRepeat,
      next,
      prev,
      dismiss,
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
      mode, isPlaying, pending, loopPending, loop.playing, duaRepeat, repeat, activeWord,
      nowPlaying, audioRef, getProgress, dismiss, togglePlay, startOver,
      toggleRepeat, next, prev, surahId, started, loading, error, canPlay, data, verses,
      timing, verseNum, segmented, segments, verseIndex, segmentIndex, dir, open, start,
      resumeAt, goVerse, goSegment, playWordAt, duas, duaTopicName, duaArabicName, duaIndex,
      duaLoading, duaError, duaDir, openDua, goDua,
    ]
  )

  return <PlaybackContext.Provider value={api}>{children}</PlaybackContext.Provider>
}
