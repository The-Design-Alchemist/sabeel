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

const base =
  "inline-flex h-12 items-center justify-center gap-1.5 rounded-[30px] px-4 text-[15px] font-medium uppercase tracking-[0.3px] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-5 [&_svg]:shrink-0"

const tap = { scale: 0.97, transition: springPress }

export function AudioControls({
  playing,
  repeat,
  onTogglePlay,
  onStartOver,
  onToggleRepeat,
}: Props) {
  return (
    <div className="flex w-full shrink-0 items-center justify-center gap-3 border-b border-line bg-white px-4 py-5 sm:gap-6 sm:px-6">
      <motion.button
        whileTap={tap}
        onClick={onStartOver}
        className={cn(base, "flex-1 bg-ground text-ink hover:bg-[#ececec] sm:w-[180px] sm:flex-none")}
      >
        <RotateCcw />
        <span className="hidden sm:inline">Start Over</span>
      </motion.button>

      <motion.button
        whileTap={tap}
        onClick={onTogglePlay}
        aria-label={playing ? "Pause recitation" : "Play recitation"}
        className={cn(base, "flex-[1.4] bg-teal-deep text-white hover:bg-[#063a3c] sm:w-[239px] sm:flex-none")}
      >
        {playing ? <Pause /> : <Play />}
        {playing ? "Pause Recitation" : "Play Recitation"}
      </motion.button>

      <motion.button
        whileTap={tap}
        onClick={onToggleRepeat}
        aria-pressed={repeat}
        className={cn(
          base,
          "flex-1 border-2 sm:w-[180px] sm:flex-none",
          repeat
            ? "border-transparent bg-gradient-to-br from-teal to-teal-deep text-white"
            : "border-teal-deep bg-white text-teal-deep hover:bg-teal-deep/5"
        )}
      >
        <Repeat />
        <span className="hidden sm:inline">Repeat</span>
      </motion.button>
    </div>
  )
}
