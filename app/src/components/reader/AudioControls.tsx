import { motion } from "motion/react"
import { RotateCcw, Play, Pause, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"
import { springPress } from "@/lib/motion"

type Props = {
  playing: boolean
  repeat: boolean
  onTogglePlay: () => void
  onStartOver: () => void
  onToggleRepeat: () => void
}

const tap = { scale: 0.97, transition: springPress }

// Circle on mobile, labelled pill on >= sm.
const circleOrPill =
  "flex size-[60px] shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-6 sm:h-12 sm:w-[160px] sm:gap-1.5 sm:rounded-[30px] sm:px-4 sm:text-[15px] sm:font-medium sm:uppercase sm:tracking-[0.3px] sm:[&_svg]:size-5"

export function AudioControls({
  playing,
  repeat,
  onTogglePlay,
  onStartOver,
  onToggleRepeat,
}: Props) {
  return (
    <div className="flex w-full shrink-0 items-center justify-center gap-3 border-b border-line bg-white px-4 py-4 sm:gap-6 sm:px-6 sm:py-5">
      <motion.button
        whileTap={tap}
        onClick={onStartOver}
        aria-label="Start over"
        className={cn(circleOrPill, "bg-ground text-ink hover:bg-[#ececec]")}
      >
        <RotateCcw />
        <span className="hidden sm:inline">Start Over</span>
      </motion.button>

      {/* Play/Pause keeps its label on mobile too (the primary action) */}
      <motion.button
        whileTap={tap}
        onClick={onTogglePlay}
        aria-label={playing ? "Pause recitation" : "Play recitation"}
        className="flex h-[60px] flex-1 items-center justify-center gap-1.5 rounded-[30px] bg-teal-deep px-4 text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:h-12 sm:w-[239px] sm:flex-none [&_svg]:size-5"
      >
        {playing ? <Pause /> : <Play />}
        {playing ? "Pause Recitation" : "Play Recitation"}
      </motion.button>

      <motion.button
        whileTap={tap}
        onClick={onToggleRepeat}
        aria-pressed={repeat}
        aria-label="Repeat"
        className={cn(
          circleOrPill,
          // ON: teal "selected" gradient. OFF: neutral — identical to the Start Over button.
          repeat
            ? "bg-gradient-to-br from-teal to-teal-deep text-white"
            : "bg-ground text-ink hover:bg-[#ececec]"
        )}
      >
        <Repeat />
        <span className="hidden sm:inline">Repeat</span>
      </motion.button>
    </div>
  )
}
