import { useSyncExternalStore } from "react"
import { Capacitor } from "@capacitor/core"
import { Filesystem, Directory } from "@capacitor/filesystem"
import { audioUrl, isBundledAudio } from "@/data/quran"

// Base URL for the compressed AAC corpus, served from a public GitHub repo via jsDelivr's CDN.
// Per-verse files live at `${CDN_BASE}/NNN/NNNVVV.m4a`. The app streams from here when online
// and downloads from here for offline. Owner/repo must match the repo you created; `@main`
// serves the default branch. (Swap to a Cloudflare R2 domain later with no code change but this.)
export const CDN_BASE = "https://cdn.jsdelivr.net/gh/The-Design-Alchemist/sabeel-audio@main"

const AUDIO_DIR = "audio" // subfolder under Directory.Data on the device
const MANIFEST_KEY = "sabeel_downloaded_surahs"

const pad = (n: number) => String(n).padStart(3, "0")
const relPath = (s: number, v: number) => `${pad(s)}/${pad(s)}${pad(v)}.m4a`
const remoteUrl = (s: number, v: number) => `${CDN_BASE}/${relPath(s, v)}`

// ---- persisted set of downloaded surahs (localStorage, like settings/progress/recents) ----
function loadManifest(): Set<number> {
  try {
    return new Set<number>(JSON.parse(localStorage.getItem(MANIFEST_KEY) || "[]"))
  } catch {
    return new Set<number>()
  }
}
let downloaded = loadManifest()

// ---- tiny external store so React components re-render when the download set changes ----
let version = 0
const listeners = new Set<() => void>()
function commit() {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify([...downloaded]))
  version++
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function isDownloaded(surah: number): boolean {
  return downloaded.has(surah)
}

/** Can this surah play offline — i.e. bundled in the app (Al-Fatiha) or downloaded? */
export function isAvailableOffline(surah: number): boolean {
  return isBundledAudio(surah) || downloaded.has(surah)
}

// Resolve the Directory.Data base file:// URI once at startup so we can build child URIs
// synchronously for the <audio> src (convertFileSrc is a sync string transform).
let dataBase: string | null = null
export async function initDownloads(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Filesystem.mkdir({ path: AUDIO_DIR, directory: Directory.Data, recursive: true })
  } catch {
    /* directory already exists */
  }
  try {
    const { uri } = await Filesystem.getUri({ path: AUDIO_DIR, directory: Directory.Data })
    dataBase = uri
  } catch {
    /* ignore — audioSrc falls back to bundled/CDN */
  }
}

/** <audio> src for a verse: the local file if downloaded, the bundled asset for Al-Fatiha,
 *  else the CDN URL (streamed directly when online). */
export function audioSrc(surah: number, verse: number): string {
  if (downloaded.has(surah) && dataBase) {
    return Capacitor.convertFileSrc(`${dataBase}/${relPath(surah, verse)}`)
  }
  if (isBundledAudio(surah)) return audioUrl(surah, verse)
  return remoteUrl(surah, verse)
}

export type DownloadProgress = { done: number; total: number }

/** Download every verse of a surah to device storage (streamed, one file at a time). */
export async function downloadSurah(
  surah: number,
  verseCount: number,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Audio download is only available in the app")
  }
  try {
    await Filesystem.mkdir({ path: `${AUDIO_DIR}/${pad(surah)}`, directory: Directory.Data, recursive: true })
  } catch {
    /* directory already exists */
  }
  for (let v = 1; v <= verseCount; v++) {
    const path = `${AUDIO_DIR}/${relPath(surah, v)}`
    // Resume an interrupted download: skip verses already on disk (the >1 KB check
    // guards against a truncated/partial write from a previous attempt).
    let present = false
    try {
      const st = await Filesystem.stat({ path, directory: Directory.Data })
      present = (st.size ?? 0) > 1024
    } catch {
      /* not downloaded yet */
    }
    if (!present) {
      await Filesystem.downloadFile({
        url: remoteUrl(surah, v),
        path,
        directory: Directory.Data,
        recursive: true,
      })
    }
    onProgress?.({ done: v, total: verseCount })
  }
  downloaded.add(surah)
  commit()
}

/** Remove a downloaded surah's audio from the device. */
export async function deleteSurah(surah: number): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.rmdir({
        path: `${AUDIO_DIR}/${pad(surah)}`,
        directory: Directory.Data,
        recursive: true,
      })
    } catch {
      /* ignore */
    }
  }
  downloaded.delete(surah)
  commit()
}

/** React hook: subscribes a component to download-set changes (re-renders on download/delete). */
export function useDownloads() {
  return useSyncExternalStore(subscribe, () => version)
}
