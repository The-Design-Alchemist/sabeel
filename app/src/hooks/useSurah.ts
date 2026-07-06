import { useEffect, useState } from "react"
import { loadSurah, type SurahData } from "@/data/quran"

type State = { data: SurahData | null; loading: boolean; error: string | null }

export function useSurah(id: number): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null })

  useEffect(() => {
    let alive = true
    setState({ data: null, loading: true, error: null })
    loadSurah(id)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e: Error) => alive && setState({ data: null, loading: false, error: e.message }))
    return () => {
      alive = false
    }
  }, [id])

  return state
}
