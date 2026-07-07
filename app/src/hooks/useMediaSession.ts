import { useEffect, useRef } from "react"
import { MediaSession, type MediaSessionAction } from "@capgo/capacitor-media-session"

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
 * Native OS media session — a real lock-screen / notification-shade transport control
 * backed by a `mediaPlayback` foreground service (so audio survives screen-off) on
 * Android & iOS via @capgo/capacitor-media-session, falling back to navigator.mediaSession
 * on the web. One API for all three. (The web MediaSession API alone does NOT surface a
 * system notification inside the Android WebView — hence the native plugin.)
 */
export function useMediaSession({ title, artist, playing, onPlay, onPause, onNext, onPrev }: Opts) {
  // Keep the latest callbacks in a ref so the native action handlers register ONCE —
  // re-registering across the bridge on every render would spam it.
  const cbs = useRef({ onPlay, onPause, onNext, onPrev })
  cbs.current = { onPlay, onPause, onNext, onPrev }

  // Now-playing metadata. Artwork is omitted for now: the native loader fetches the URL
  // over HTTP and can't reach the WebView's bundled assets — a data-URI cover comes later.
  useEffect(() => {
    MediaSession.setMetadata({ title, artist, album: "Sabeel" }).catch(() => {})
  }, [title, artist])

  // Transport controls — register stable wrappers once; each calls the freshest callback.
  useEffect(() => {
    const set = (action: MediaSessionAction, handler: (() => void) | null) =>
      MediaSession.setActionHandler({ action }, handler).catch(() => {})
    set("play", () => cbs.current.onPlay())
    set("pause", () => cbs.current.onPause())
    set("previoustrack", () => cbs.current.onPrev?.())
    set("nexttrack", () => cbs.current.onNext?.())
    return () => {
      set("play", null)
      set("pause", null)
      set("previoustrack", null)
      set("nexttrack", null)
    }
  }, [])

  // Playback state drives the notification's play/pause icon + the foreground service.
  // Stay "none" until the first real play so the notification doesn't pop up on the
  // Bismillah start screen before the user begins.
  const everPlayed = useRef(false)
  useEffect(() => {
    if (playing) everPlayed.current = true
    const playbackState = playing ? "playing" : everPlayed.current ? "paused" : "none"
    MediaSession.setPlaybackState({ playbackState }).catch(() => {})
  }, [playing])

  // Leaving the reader tears down the <audio> → dismiss the media session/notification too.
  useEffect(() => {
    return () => {
      MediaSession.setPlaybackState({ playbackState: "none" }).catch(() => {})
    }
  }, [])
}
