import type { Transition, Variants } from "motion/react"

/**
 * Shared motion language for Sabeel. Principles: motion is fast, spring-based,
 * transform/opacity only (GPU), interruptible, and always subtle + purposeful.
 * The whole app is wrapped in <MotionConfig reducedMotion="user"> so every one of
 * these respects the user's OS "reduce motion" setting automatically.
 */

/** Snappy spring for pointer feedback (hover / press) — natural and interruptible. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 30,
  mass: 0.8,
}

/** A touch firmer spring for the press-down (returns quickly). */
export const springPress: Transition = { type: "spring", stiffness: 600, damping: 32 }

/** Softer spring for larger element / layout movement (carousels, sheets). */
export const springSoft: Transition = { type: "spring", stiffness: 320, damping: 34 }

/** Ease-out (expo-ish) for entrances — quick start, gentle settle. */
export const easeOut: Transition = { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
export const easeOutFast: Transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] }

/** Subtle fade + rise, used for section / element entrances. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: easeOut },
}

/** Stagger children as a group enters (orchestrated, not gratuitous). */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
}
