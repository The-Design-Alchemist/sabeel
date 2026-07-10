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
const PENDING_KEY = "sabeel_pending_downloads"

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
const downloaded = loadManifest()

// ---- store #1: the completed set. Changes rarely (a surah finishes or is deleted), so
// components that only care about "is this saved?" subscribe here and stay quiet during the
// per-verse progress churn on store #2. ----
let setVersion = 0
const setListeners = new Set<() => void>()
function commitSet() {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify([...downloaded]))
  setVersion++
  setListeners.forEach((l) => l())
}
function subscribeSet(l: () => void) {
  setListeners.add(l)
  return () => {
    setListeners.delete(l)
  }
}

export function isDownloaded(surah: number): boolean {
  return downloaded.has(surah)
}

/** Can this surah play offline — i.e. bundled in the app (Al-Fatiha) or downloaded? */
export function isAvailableOffline(surah: number): boolean {
  return isBundledAudio(surah) || downloaded.has(surah)
}

// ---- store #2: live progress of queued/active downloads. Ticks once per verse, so it has its
// own subscription; a component reading one surah's state only re-renders when *that* surah's
// snapshot object changes (untouched surahs keep a stable ref → no re-render). ----
export type DownloadPhase = "queued" | "active" | "error"
export type DownloadState = { surah: number; done: number; total: number; phase: DownloadPhase }

const active = new Map<number, DownloadState>()
const queue: number[] = []
let running: number | null = null
const cancelRequested = new Set<number>()

// No version counter here: useDownloadState keys off the per-surah state object's identity
// (a fresh object on each change), so subscribers only need the notify signal.
const progListeners = new Set<() => void>()
function commitProgress() {
  progListeners.forEach((l) => l())
}
function subscribeProgress(l: () => void) {
  progListeners.add(l)
  return () => {
    progListeners.delete(l)
  }
}
// Always replace (never mutate) a surah's state so useSyncExternalStore sees a fresh ref for
// that surah alone.
function setState(surah: number, s: DownloadState) {
  active.set(surah, s)
  commitProgress()
}
function clearState(surah: number) {
  active.delete(surah)
  commitProgress()
}

// ---- store #3: fire-and-forget events for UI side effects (toast + OS notification). Kept
// UI-free here so this module has no dependency on React/sonner/Capacitor notifications. ----
export type DownloadEvent =
  | { type: "start"; surah: number }
  | { type: "complete"; surah: number }
  | { type: "error"; surah: number }
  | { type: "cancelled"; surah: number }
const eventListeners = new Set<(e: DownloadEvent) => void>()
export function onDownloadEvent(cb: (e: DownloadEvent) => void): () => void {
  eventListeners.add(cb)
  return () => {
    eventListeners.delete(cb)
  }
}
function emit(e: DownloadEvent) {
  eventListeners.forEach((l) => l(e))
}

// ---- pending-intent persistence: records queued/active surahs so an interrupted download
// resumes on the next launch (the per-verse "already on disk" skip makes resume cheap). ----
function savePending() {
  const entries = [...active.values()]
    .filter((s) => s.phase !== "error")
    .map((s) => [s.surah, s.total] as const)
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(entries))
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}
function loadPending(): Array<[number, number]> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]")
  } catch {
    return []
  }
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
  // Auto-resume anything still downloading when the app was last closed.
  for (const [surah, total] of loadPending()) {
    if (!downloaded.has(surah)) queueDownload(surah, total)
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

// ---- queue + single worker ----
class CancelledError extends Error {}

/** Queue a surah for offline download (processed one at a time). No-op if it's already saved,
 *  queued, or active; a surah left in the `error` phase is re-queued (this doubles as "retry"). */
export function queueDownload(surah: number, verseCount: number): void {
  if (!Capacitor.isNativePlatform()) return
  if (downloaded.has(surah)) return
  const cur = active.get(surah)
  if (cur && cur.phase !== "error") return
  cancelRequested.delete(surah)
  setState(surah, { surah, done: 0, total: verseCount, phase: "queued" })
  if (!queue.includes(surah)) queue.push(surah)
  savePending()
  void pump()
}

/** Cancel a queued or active download. An active download stops at the next verse boundary;
 *  verses already saved stay on disk so it can be resumed (or deleted) later. */
export function cancelDownload(surah: number): void {
  const cur = active.get(surah)
  if (!cur) return
  if (cur.phase === "active") {
    cancelRequested.add(surah) // the worker loop notices this between verses and bails out
    return
  }
  // queued or error → drop it right away
  const i = queue.indexOf(surah)
  if (i >= 0) queue.splice(i, 1)
  clearState(surah)
  savePending()
}

async function pump(): Promise<void> {
  if (running != null) return // one download at a time
  const surah = queue.shift()
  if (surah == null) return
  const st = active.get(surah)
  if (!st) {
    void pump()
    return
  }
  if (cancelRequested.has(surah)) {
    cancelRequested.delete(surah)
    clearState(surah)
    void pump()
    return
  }
  running = surah // set before the first await so a concurrent pump() bails on the guard above
  setState(surah, { surah, done: 0, total: st.total, phase: "active" })
  savePending()
  emit({ type: "start", surah })
  try {
    await downloadVerses(
      surah,
      st.total,
      (done) => setState(surah, { surah, done, total: st.total, phase: "active" }),
      () => cancelRequested.has(surah),
    )
    clearState(surah)
    downloaded.add(surah)
    commitSet()
    savePending()
    emit({ type: "complete", surah })
  } catch (e) {
    if (e instanceof CancelledError || cancelRequested.has(surah)) {
      cancelRequested.delete(surah)
      clearState(surah)
      savePending()
      emit({ type: "cancelled", surah })
    } else {
      const done = active.get(surah)?.done ?? 0
      setState(surah, { surah, done, total: st.total, phase: "error" })
      savePending()
      emit({ type: "error", surah })
    }
  } finally {
    running = null
    void pump() // process the next queued surah, if any
  }
}

async function downloadVerses(
  surah: number,
  verseCount: number,
  onTick: (done: number) => void,
  isCancelled: () => boolean,
): Promise<void> {
  try {
    await Filesystem.mkdir({ path: `${AUDIO_DIR}/${pad(surah)}`, directory: Directory.Data, recursive: true })
  } catch {
    /* directory already exists */
  }
  for (let v = 1; v <= verseCount; v++) {
    // Cancel is checked at each verse boundary — verse files are tiny, so this is near-instant.
    if (isCancelled()) throw new CancelledError()
    const path = `${AUDIO_DIR}/${relPath(surah, v)}`
    // Resume an interrupted download: skip verses already on disk (the >1 KB check
    // guards against a truncated/partial write from a previous attempt).
    let present = false
    try {
      const stt = await Filesystem.stat({ path, directory: Directory.Data })
      present = (stt.size ?? 0) > 1024
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
    onTick(v)
  }
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
  commitSet()
}

// ---- React hooks ----
/** Re-render a component when the set of *completed* downloads changes (download/delete). */
export function useDownloads(): number {
  return useSyncExternalStore(subscribeSet, () => setVersion)
}

/** Live queued/active/error state for one surah (undefined when idle). Only the surah whose
 *  state changed re-renders — every other subscriber keeps a stable `undefined` snapshot. */
export function useDownloadState(surah: number): DownloadState | undefined {
  return useSyncExternalStore(subscribeProgress, () => active.get(surah))
}

// ---- non-hook access, for the notification bridge (which lives outside React state) ----
/** Subscribe to live progress ticks (queued/active/error changes). Returns an unsubscribe fn. */
export function onDownloadProgress(cb: () => void): () => void {
  return subscribeProgress(cb)
}
/** Snapshot of all currently queued / active / errored downloads. */
export function getActiveDownloads(): DownloadState[] {
  return [...active.values()]
}

/** Count of queued/active downloads (excludes errored) — for the "Download all / Cancel all"
 *  control. Re-renders only when the count changes, not on every verse tick. */
export function useActiveDownloadCount(): number {
  return useSyncExternalStore(subscribeProgress, () => {
    let n = 0
    for (const s of active.values()) if (s.phase !== "error") n++
    return n
  })
}
