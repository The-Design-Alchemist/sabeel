import { useEffect, useState } from "react"
import { SURAHS, type Surah } from "@/data/surahs"

export type RecentEntry = {
  surah: Surah
  currentVerse: number
  progressPercent: number
  lastPlayed: number
}

/** Reads the "recently opened" surahs + per-surah progress from localStorage,
 *  mirroring the original app's keys (recentSurahs, progress_<id>). */
export function useRecents(): RecentEntry[] {
  const [recents, setRecents] = useState<RecentEntry[]>([])

  useEffect(() => {
    try {
      const ids: number[] = (
        JSON.parse(localStorage.getItem("recentSurahs") || "[]") as number[]
      ).slice(0, 6)

      const entries = ids
        .map((id): RecentEntry | null => {
          const surah = SURAHS.find((s) => s.id === id)
          if (!surah) return null
          const p = JSON.parse(localStorage.getItem(`progress_${id}`) || "{}")
          const currentVerse = Number(p.lastVerse) || 0
          return {
            surah,
            currentVerse,
            progressPercent: Math.round((currentVerse / surah.verses) * 100),
            lastPlayed: Number(p.lastPlayed) || Date.now(),
          }
        })
        .filter((e): e is RecentEntry => e !== null)

      setRecents(entries)
    } catch {
      setRecents([])
    }
  }, [])

  return recents
}
