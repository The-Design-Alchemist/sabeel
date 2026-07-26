import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Minimal verse-audio player: play/pause a per-verse mp3. Word-by-word highlighting
 * and segment-precise playback (using the real cpfair timings) come in the audio slice.
 */
export function useVerseAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | undefined>(undefined)
  const onErrorRef = useRef<((message: string) => void) | undefined>(undefined)
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [playing, setPlaying] = useState(false)
  // "pending" = play() was requested but real playback hasn't started yet (buffering a cold,
  // non-downloaded verse). Drives the buffering spinner so a slow first play never reads as a
  // missed tap. Cleared the moment playback actually produces sound / advances.
  const [pending, setPending] = useState(false)

  const clearFade = useCallback(() => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current)
      fadeRef.current = null
    }
  }, [])

  useEffect(() => {
    const a = new Audio()
    a.preload = "auto"
    audioRef.current = a
    const onEnd = () => {
      setPlaying(false)
      setPending(false)
      onEndedRef.current?.()
    }
    const onPlay = () => setPlaying(true)
    const onPlaying = () => {
      setPlaying(true)
      setPending(false)
    }
    const onTimeUpdate = () => setPending(false) // position advanced → definitely playing
    const onWaiting = () => setPending(true) // buffer underrun mid-play
    const onPause = () => {
      setPlaying(false)
      setPending(false)
    }
    const onError = () => {
      setPlaying(false)
      setPending(false)
      onErrorRef.current?.(a.error?.message || "Playback error")
    }
    a.addEventListener("ended", onEnd)
    a.addEventListener("play", onPlay)
    a.addEventListener("playing", onPlaying)
    a.addEventListener("timeupdate", onTimeUpdate)
    a.addEventListener("waiting", onWaiting)
    a.addEventListener("pause", onPause)
    a.addEventListener("error", onError)
    return () => {
      a.pause()
      a.removeEventListener("ended", onEnd)
      a.removeEventListener("play", onPlay)
      a.removeEventListener("playing", onPlaying)
      a.removeEventListener("timeupdate", onTimeUpdate)
      a.removeEventListener("waiting", onWaiting)
      a.removeEventListener("pause", onPause)
      a.removeEventListener("error", onError)
      a.src = ""
    }
  }, [])

  const play = useCallback(
    (src: string, startAt?: number) => {
      const a = audioRef.current
      if (!a) return
      clearFade()
      a.volume = 1 // undo any in-flight stop() fade
      setPending(true)
      if (!a.src.endsWith(src)) {
        a.src = src
        a.currentTime = startAt ?? 0
      } else if (startAt != null) {
        a.currentTime = startAt
      }
      a.play().catch((err: DOMException) => {
        // AbortError = a newer play() interrupted this one (benign). Real media/network
        // failures surface via the "error" event listener above.
        if (err?.name !== "AbortError") setPending(false)
      })
    },
    [clearFade]
  )

  const pause = useCallback(() => audioRef.current?.pause(), [])

  const stop = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    clearFade()
    setPending(false)
    if (a.paused) {
      a.currentTime = 0
      return
    }
    // Short volume fade (~120ms) so switching surah/dua doesn't click off abruptly.
    fadeRef.current = setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.18)
      if (a.volume <= 0.02) {
        clearFade()
        a.pause()
        a.currentTime = 0
        a.volume = 1
      }
    }, 20)
  }, [clearFade])

  const seek = useCallback((sec: number) => {
    const a = audioRef.current
    if (a) a.currentTime = sec
  }, [])

  const setOnEnded = useCallback((cb?: () => void) => {
    onEndedRef.current = cb
  }, [])

  const setOnError = useCallback((cb?: (message: string) => void) => {
    onErrorRef.current = cb
  }, [])

  return { playing, pending, play, pause, stop, seek, setOnEnded, setOnError, audioRef }
}
