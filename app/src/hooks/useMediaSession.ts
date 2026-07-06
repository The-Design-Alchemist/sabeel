import { useEffect } from "react"

type Opts = {
  title: string
  artist: string
  playing: boolean
  onPlay: () => void
  onPause: () => void
  onNext?: () => void
  onPrev?: () => void
}

/**
 * Wires the OS Media Session: now-playing metadata + lock-screen / headphone /
 * notification transport controls. Safe no-op where the API is unavailable.
 */
export function useMediaSession({ title, artist, playing, onPlay, onPause, onNext, onPrev }: Opts) {
  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "Sabeel",
      artwork: [
        { src: `${import.meta.env.BASE_URL}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
        { src: `${import.meta.env.BASE_URL}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      ],
    })
  }, [title, artist])

  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    const ms = navigator.mediaSession
    ms.setActionHandler("play", onPlay)
    ms.setActionHandler("pause", onPause)
    ms.setActionHandler("nexttrack", onNext ?? null)
    ms.setActionHandler("previoustrack", onPrev ?? null)
    return () => {
      ms.setActionHandler("play", null)
      ms.setActionHandler("pause", null)
      ms.setActionHandler("nexttrack", null)
      ms.setActionHandler("previoustrack", null)
    }
  }, [onPlay, onPause, onNext, onPrev])

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused"
    }
  }, [playing])
}
