import { motion } from "motion/react"
import { Divider } from "./Divider"
import { springPress } from "@/lib/motion"

type Props = { onStart: () => void }

export function BismillahScreen({ onStart }: Props) {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden rounded-t-[40px] bg-ground p-6 sm:p-10">
      <div className="flex w-full flex-1 items-center justify-center rounded-[24px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          <p
            dir="rtl"
            lang="ar"
            className="font-arabic text-[clamp(30px,5vw,40px)] leading-[1.6] text-teal-deep"
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
          <Divider />
          <p className="text-lg font-medium text-teal-deep">Bismillah ir-Rahman ir-Raheem</p>
          <Divider />
          <p className="max-w-[42ch] text-lg font-medium text-muted-foreground">
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
        </div>
      </div>

      {/* Signature half-circle CTA (pulse pauses under reduced motion via MotionConfig) */}
      <motion.button
        onClick={onStart}
        style={{ left: "50%", x: "-50%" }}
        whileTap={{ scale: 0.98, transition: springPress }}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-0 z-40 flex h-[150px] w-[300px] max-w-[86vw] flex-col items-center justify-start gap-1 rounded-t-[300px] bg-gradient-to-b from-teal to-teal-deep pt-12 uppercase tracking-[0.5px] text-white shadow-[0_-8px_32px_rgba(13,142,145,0.35)]"
      >
        <span className="text-2xl font-bold leading-tight">Start</span>
        <span className="text-2xl font-bold leading-tight">Recitation</span>
      </motion.button>
    </div>
  )
}
