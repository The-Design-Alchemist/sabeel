import { motion } from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { springPress } from "@/lib/motion"

type Props = {
  dir: "prev" | "next"
  label: string
  onClick: () => void
  disabled?: boolean
}

// The teal-deep transport pill shared by the Surah and Dua readers: a circle on mobile,
// a labelled pill from `sm` up. aria-label carries the name on mobile, where only the
// chevron shows.
const cls =
  "flex size-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-teal-deep text-[15px] font-medium uppercase tracking-[0.3px] text-white outline-none transition-colors hover:bg-teal-deep-hover focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-disabled [&_svg]:size-6 sm:h-12 sm:w-[200px] sm:flex-none sm:gap-1 sm:rounded-[30px] sm:px-3 sm:[&_svg]:size-5"

export function NavButton({ dir, label, onClick, disabled }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97, transition: springPress }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cls}
    >
      {dir === "prev" && <ChevronLeft />}
      <span className="hidden sm:inline">{label}</span>
      {dir === "next" && <ChevronRight />}
    </motion.button>
  )
}
