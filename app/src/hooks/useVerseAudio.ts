import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Minimal verse-audio player: play/pause a per-verse mp3. Word-by-word highlighting
 * and segment-precise playback (using the real cpfair timings) come in the audio slice.
 */
export function useVerseAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef<(() => void) | undefined>(undefined)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const a = new Audio()
    a.preload = "auto"
    audioRef.current = a
    const onEnd = () => {
      setPlaying(false)
      onEndedRef.current?.()
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    a.addEventListener("ended", onEnd)
    a.addEventListener("play", onPlay)
    a.addEventListener("pause", onPause)
    return () => {
      a.pause()
      a.removeEventListener("ended", onEnd)
      a.removeEventListener("play", onPlay)
      a.removeEventListener("pause", onPause)
      a.src = ""
    }
  }, [])

  const play = useCallback((src: string) => {
    const a = audioRef.current
    if (!a) return
    if (!a.src.endsWith(src)) {
      a.src = src
      a.currentTime = 0
    }
    a.play().catch(() => {
      /* autoplay blocked without a gesture — ignore */
    })
  }, [])

  const pause = useCallback(() => audioRef.current?.pause(), [])

  const stop = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
  }, [])

  const setOnEnded = useCallback((cb?: () => void) => {
    onEndedRef.current = cb
  }, [])

  return { playing, play, pause, stop, setOnEnded }
}
