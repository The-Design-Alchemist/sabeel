import { useEffect, useState } from "react"

/**
 * Returns true only once `active` has stayed true continuously for `delayMs`.
 * Used to suppress sub-threshold flashes — e.g. a buffering spinner should only
 * appear if the wait is actually long enough to notice; instant/cached starts
 * never flicker it on.
 */
export function useDelayedFlag(active: boolean, delayMs = 120): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!active) {
      setOn(false)
      return
    }
    const t = setTimeout(() => setOn(true), delayMs)
    return () => clearTimeout(t)
  }, [active, delayMs])
  return on
}
