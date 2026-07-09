import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Sample-accurate waqf-segment looper (Web Audio).
 *
 * The old repeat mechanism polled HTMLAudioElement.currentTime in requestAnimationFrame and
 * seeked back near seg.end — which overshot the cut (rAF jitter + seek latency), so the next
 * segment's word leaked in, and a fixed SEG_LOOP_GUARD fudge couldn't win. Here we decode the
 * verse once into a PCM AudioBuffer and schedule each repeat as a discrete one-shot on the audio
 * clock: `source.start(when, seg.start, dur)` plays EXACTLY [seg.start, seg.end] and stops — the
 * next segment physically cannot sound, whether the cut lands in silence or mid-word. A short
 * gain fade at each seam removes clicks; an optional gap between repeats gives a breath for hifz.
 *
 * Used surgically for the segment-repeat path only. Streaming, continuous playback, word
 * highlighting during normal play, and the lock-screen media session all stay on the <audio>
 * element in useVerseAudio.
 */

const LOOKAHEAD = 0.4 // schedule reps this many seconds ahead of the audio clock
const TICK_MS = 120 // how often the scheduler wakes
const LEAD = 0.08 // start the first repeat this far in the future
const FADE_IN = 0.006 // 6 ms — inaudible on a word onset, kills the seam click
const FADE_OUT = 0.014 // 14 ms

type Rep = { t0: number; t1: number } // audio-clock window of one audible repeat

// Some older Web
type WinAudio = typeof window & { webkitAudioContext?: typeof AudioContext }

export function useSegmentLoop() {
  const [playing, setPlaying] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const bufsRef = useRef<Map<string, AudioBuffer>>(new Map())
  const pendingRef = useRef<Map<string, Promise<AudioBuffer>>>(new Map())

  // active-loop state (refs so the scheduler tick reads live values)
  const bufRef = useRef<AudioBuffer | null>(null)
  const segRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
  const gapRef = useRef(0)
  const nextRef = useRef(0) // next repeat's audio-clock start time
  const repsRef = useRef<Rep[]>([])
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runningRef = useRef(false)

  const ctx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const AC = (window as WinAudio).AudioContext ?? (window as WinAudio).webkitAudioContext!
      const c = new AC()
      const g = c.createGain()
      g.connect(c.destination)
      ctxRef.current = c
      masterRef.current = g
    }
    return ctxRef.current
  }, [])

  /** Resume the AudioContext from inside a user gesture (iOS starts it suspended). */
  const unlock = useCallback(() => {
    const c = ctx()
    if (c.state === "suspended") c.resume().catch(() => {})
  }, [ctx])

  const decode = useCallback(
    (src: string): Promise<AudioBuffer> => {
      const cached = bufsRef.current.get(src)
      if (cached) return Promise.resolve(cached)
      const inflight = pendingRef.current.get(src)
      if (inflight) return inflight
      const p = fetch(src)
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx().decodeAudioData(ab))
        .then((buf) => {
          // keep only the most recent couple of verses decoded — bound memory on low-end devices
          if (bufsRef.current.size > 2) bufsRef.current.clear()
          bufsRef.current.set(src, buf)
          pendingRef.current.delete(src)
          return buf
        })
      pendingRef.current.set(src, p)
      return p
    },
    [ctx]
  )

  /** Warm the buffer so a later startLoop is instant (call when repeat turns on / verse changes). */
  const prefetch = useCallback(
    (src: string) => {
      if (src) decode(src).catch(() => {})
    },
    [decode]
  )

  const clearScheduled = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    for (const s of sourcesRef.current) {
      try {
        s.onended = null
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current.clear()
    repsRef.current = []
  }, [])

  const scheduleAhead = useCallback(() => {
    const c = ctxRef.current
    const buf = bufRef.current
    const master = masterRef.current
    if (!c || !buf || !master) return
    const { start, end } = segRef.current
    const dur = Math.max(0.02, end - start)
    const period = dur + gapRef.current / 1000
    while (nextRef.current < c.currentTime + LOOKAHEAD) {
      const t0 = Math.max(nextRef.current, c.currentTime + 0.02)
      const src = c.createBufferSource()
      src.buffer = buf
      const g = c.createGain()
      const fi = Math.min(FADE_IN, dur / 3)
      const fo = Math.min(FADE_OUT, dur / 3)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(1, t0 + fi)
      g.gain.setValueAtTime(1, t0 + dur - fo)
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
      src.connect(g)
      g.connect(master)
      src.start(t0, start, dur)
      const rep = { t0, t1: t0 + dur }
      repsRef.current.push(rep)
      sourcesRef.current.add(src)
      src.onended = () => {
        sourcesRef.current.delete(src)
        try {
          src.disconnect()
          g.disconnect()
        } catch {
          /* noop */
        }
      }
      nextRef.current = t0 + period
    }
    // prune reps that have fully played
    const now = c.currentTime
    repsRef.current = repsRef.current.filter((r) => r.t1 > now - 1)
  }, [])

  /** Begin (or restart) looping [start, end] of the verse at `src`. */
  const startLoop = useCallback(
    async (src: string, start: number, end: number, opts?: { gapMs?: number }) => {
      const buf = await decode(src)
      const c = ctx()
      if (c.state === "suspended") await c.resume().catch(() => {})
      clearScheduled()
      bufRef.current = buf
      segRef.current = { start, end }
      gapRef.current = Math.max(0, opts?.gapMs ?? 0)
      nextRef.current = c.currentTime + LEAD
      runningRef.current = true
      scheduleAhead()
      timerRef.current = setInterval(scheduleAhead, TICK_MS)
      setPlaying(true)
    },
    [decode, ctx, clearScheduled, scheduleAhead]
  )

  const stopLoop = useCallback(() => {
    runningRef.current = false
    clearScheduled()
    bufRef.current = null
    setPlaying(false)
  }, [clearScheduled])

  const pauseLoop = useCallback(() => {
    if (!runningRef.current) return
    ctxRef.current?.suspend().catch(() => {})
    setPlaying(false)
  }, [])

  const resumeLoop = useCallback(() => {
    if (!bufRef.current) return
    ctxRef.current?.resume().catch(() => {})
    runningRef.current = true
    setPlaying(true)
  }, [])

  /** Current playback position inside the verse (seconds), for word highlighting; null if idle. */
  const getPosition = useCallback((): number | null => {
    const c = ctxRef.current
    if (!c || !bufRef.current) return null
    const now = c.currentTime
    const { start, end } = segRef.current
    for (const r of repsRef.current) {
      if (now >= r.t0 && now < r.t1) return start + (now - r.t0)
    }
    return end // in the breath between repeats — sit on the segment end
  }, [])

  // Tear down the AudioContext when the reader unmounts.
  useEffect(() => {
    return () => {
      clearScheduled()
      ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
    }
  }, [clearScheduled])

  return { playing, unlock, prefetch, startLoop, stopLoop, pauseLoop, resumeLoop, getPosition }
}
