import { motion } from "motion/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { springSnappy, springPress } from "@/lib/motion"

type Props = {
  total: number
  index: number
  onSelect: (i: number) => void
  onPrev: () => void
  onNext: () => void
}

const pill =
  "flex h-10 min-w-[100px] items-center justify-center gap-0.5 rounded-[30px] bg-white px-3 text-[15px] font-medium text-teal-deep outline-none transition-colors hover:bg-ground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5"

export function SegmentNav({ total, index, onSelect, onPrev, onNext }: Props) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-6 bg-ground px-6 py-4 sm:gap-10">
      <motion.button
        whileTap={{ scale: 0.97, transition: springPress }}
        onClick={onPrev}
        disabled={index === 0}
        className={pill}
      >
        <ArrowLeft />
        <span className="hidden sm:inline">Previous</span>
      </motion.button>

      <div className="flex flex-col items-center gap-2">
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          Part <b className="font-bold text-ink">{index + 1}</b> of{" "}
          <b className="font-bold text-ink">{total}</b>
        </span>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Part ${i + 1} of ${total}`}
              aria-current={i === index}
              whileHover={{ scale: 1.2 }}
              animate={{ backgroundColor: i === index ? "#2b2b2b" : "rgba(0,0,0,0)" }}
              transition={springSnappy}
              className="size-2 rounded-full border-2 border-[#2b2b2b]"
            />
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97, transition: springPress }}
        onClick={onNext}
        disabled={index === total - 1}
        className={pill}
      >
        <span className="hidden sm:inline">Next</span>
        <ArrowRight />
      </motion.button>
    </div>
  )
}
