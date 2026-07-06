import { motion } from "motion/react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { springSnappy } from "@/lib/motion"

type Props = {
  total: number
  index: number
  onSelect: (i: number) => void
  onPrev: () => void
  onNext: () => void
}

export function SegmentNav({ total, index, onSelect, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button variant="ghost" size="sm" onClick={onPrev} disabled={index === 0}>
        <ArrowLeft />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2" role="group" aria-label="Verse parts">
          {Array.from({ length: total }).map((_, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Part ${i + 1} of ${total}`}
              aria-current={i === index}
              animate={{
                scale: i === index ? 1.15 : 1,
                backgroundColor: i === index ? "#0d8e91" : "#e1e5e6",
              }}
              transition={springSnappy}
              className="size-2.5 rounded-full"
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Part {index + 1} of {total}
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={onNext} disabled={index === total - 1}>
        <span className="hidden sm:inline">Next</span>
        <ArrowRight />
      </Button>
    </div>
  )
}
