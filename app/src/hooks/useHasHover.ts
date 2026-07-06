import { useEffect, useState } from "react"

/**
 * True only on devices with a real hover-capable, fine pointer (mouse/trackpad).
 * Motion's `whileHover` fires on touch tap (pointerenter), which would make cards
 * "stick" lifted on mobile — gate hover motion behind this. (Emil Kowalski standards:
 * @media (hover: hover) and (pointer: fine).) Tailwind's `hover:` utilities are
 * already gated this way, so only JS-driven hover needs it.
 */
export function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)")
    setHasHover(mq.matches)
    const onChange = () => setHasHover(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return hasHover
}
