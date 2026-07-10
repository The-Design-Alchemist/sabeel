import { useState } from "react"

const KEY = "sabeel_onboarded"

/** First-launch gate flag, persisted in localStorage (like the other prefs). Fails open — if
 *  storage is unavailable we treat the user as onboarded rather than trapping them on the intro. */
export function useOnboarded() {
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1"
    } catch {
      return true
    }
  })
  const complete = () => {
    try {
      localStorage.setItem(KEY, "1")
    } catch {
      /* ignore */
    }
    setDone(true)
  }
  return [done, complete] as const
}
