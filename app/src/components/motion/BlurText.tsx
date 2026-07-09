import type { ReactNode } from "react"
import { motion } from "motion/react"

/**
 * A gentle "comes into focus" reveal — blur + fade in once on mount. Used sparingly for
 * reverent moments (the Bismillah, an āyah settling). Honors OS reduce-motion via the
 * app-wide <MotionConfig reducedMotion="user">.
 */
export function BlurText({
  children,
  className,
  delay = 0,
  duration = 0.9,
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(12px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
