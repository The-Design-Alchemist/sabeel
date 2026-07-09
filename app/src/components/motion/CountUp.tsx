import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"

/**
 * Counts up to `value` (ease-out) whenever it changes — a small delight for progress and
 * completion moments. Snaps instantly under reduce-motion.
 */
export function CountUp({
  value,
  className,
  duration = 550,
}: {
  value: number
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reduce || from.current === value) {
      setDisplay(value)
      from.current = value
      return
    }
    const a = from.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(a + (value - a) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce, duration])

  return <span className={className}>{display}</span>
}
