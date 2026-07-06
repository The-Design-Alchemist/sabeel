import { MotionConfig } from "motion/react"
import Home from "@/pages/Home"

export default function App() {
  // reducedMotion="user" makes every animation honor the OS "reduce motion" setting.
  return (
    <MotionConfig reducedMotion="user">
      <Home />
    </MotionConfig>
  )
}
