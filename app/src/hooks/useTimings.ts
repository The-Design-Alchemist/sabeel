import { useEffect, useState } from "react"
import { loadTimings, type TimingVerse } from "@/data/quran"

/** Loads a surah's word/segment timings, indexed by verse number. */
export function useTimings(id: number): Map<number, TimingVerse> {
  const [map, setMap] = useState<Map<number, TimingVerse>>(new Map())

  useEffect(() => {
    let alive = true
    setMap(new Map())
    loadTimings(id)
      .then((arr) => {
        if (alive) setMap(new Map(arr.map((v) => [v.verseNumber, v])))
      })
      .catch(() => alive && setMap(new Map()))
    return () => {
      alive = false
    }
  }, [id])

  return map
}
