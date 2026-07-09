import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * A single light-sweep across a brand mark — fires once on mount, then idle. Deliberately
 * one-pass (a constantly shimmering wordmark reads as flashy). Skipped under reduce-motion.
 */
export function Sheen({
  children,
  className,
  delay = 0.35,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      {children}
      {!reduce && (
        <motion.span
          aria-hidden="true"
          initial={{ x: "-160%" }}
          animate={{ x: "260%" }}
          transition={{ duration: 1.15, delay, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />
      )}
    </span>
  )
}
