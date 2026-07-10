import { useEffect } from "react"
import { toast } from "sonner"
import {
  cancelDownload,
  getActiveDownloads,
  onDownloadEvent,
  onDownloadProgress,
  queueDownload,
} from "@/lib/downloads"
import {
  clearDownloadProgress,
  ensureNotifyPermission,
  notify,
  registerDownloadActions,
  showDownloadProgress,
} from "@/lib/notify"
import { SURAHS } from "@/data/surahs"

const surahName = (id: number) => SURAHS.find((s) => s.id === id)?.englishName ?? `Surah ${id}`
const surahVerses = (id: number) => SURAHS.find((s) => s.id === id)?.verses ?? 0

/** Headless bridge: turns download-store events into user feedback — an in-app toast, an
 *  ongoing "Downloading …" system notification with a Cancel action, and a completion
 *  notification. Mounted once at the app root; renders nothing. */
export function DownloadNotifications() {
  useEffect(() => {
    // A "Cancel" tap on the system notification routes back into the store.
    void registerDownloadActions((surah) => cancelDownload(surah))

    // Keep the ongoing notification in step with progress, throttled so we don't reschedule
    // on every verse (final tick always goes through so it reads N/N before it clears).
    let last = 0
    const unsubProgress = onDownloadProgress(() => {
      const act = getActiveDownloads().find((d) => d.phase === "active")
      if (!act) return
      const now = Date.now()
      if (act.done < act.total && now - last < 1200) return
      last = now
      void showDownloadProgress(act.surah, surahName(act.surah), act.done, act.total)
    })

    const unsubEvents = onDownloadEvent((e) => {
      const name = surahName(e.surah)
      switch (e.type) {
        case "start":
          // First download of the session → ask for notification permission in context.
          void ensureNotifyPermission()
          void showDownloadProgress(e.surah, name, 0, surahVerses(e.surah))
          break
        case "complete":
          void clearDownloadProgress(e.surah)
          // De-spam "Download all": only announce once nothing else is queued or active.
          if (getActiveDownloads().length === 0) {
            toast.success(`${name} saved for offline`)
            void notify("Download complete", `${name} is ready to play offline.`)
          }
          break
        case "error":
          void clearDownloadProgress(e.surah)
          toast.error(`Couldn't finish ${name}`, {
            description: "Check your connection and try again.",
            action: { label: "Retry", onClick: () => queueDownload(e.surah, surahVerses(e.surah)) },
          })
          break
        case "cancelled":
          void clearDownloadProgress(e.surah)
          toast(`${name} download cancelled`)
          break
      }
    })

    return () => {
      unsubProgress()
      unsubEvents()
    }
  }, [])
  return null
}
