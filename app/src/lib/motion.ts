import type { Transition, Variants } from "motion/react"

/**
 * Shared motion language for Sabeel, following Emil Kowalski's design-engineering
 * standards (.claude/skills/emil-design-eng): fast (<300ms), strong custom easing,
 * transform/opacity only, interruptible springs, subtle + purposeful. The whole app
 * is wrapped in <MotionConfig reducedMotion="user"> so all of this honors the OS
 * "reduce motion" setting (keeps opacity, drops transform-based movement).
 */

/** Emil's strong ease-out — starts fast, settles gently (built-in easings are too weak). */
const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Subtle-life spring for hover (Apple-style: duration + small bounce). */
export const springSnappy: Transition = { type: "spring", duration: 0.4, bounce: 0.18 }

/** Crisp press feedback — no overshoot, snappy return (fits a calm learning app). */
export const springPress: Transition = { type: "spring", duration: 0.24, bounce: 0 }

/** Softer spring for larger element / layout movement (sheets, drawers). */
export const springSoft: Transition = { type: "spring", duration: 0.5, bounce: 0.15 }

/** Ease-out for entrances/exits — under 300ms. */
export const easeOut: Transition = { duration: 0.26, ease: EASE_OUT }
export const easeOutFast: Transition = { duration: 0.16, ease: EASE_OUT }

/** Subtle fade + rise for section / element entrances (never scale from 0). */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: easeOut },
}

/** Stagger children as a group enters — 30–80ms between items; decorative, non-blocking. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.03 } },
}
