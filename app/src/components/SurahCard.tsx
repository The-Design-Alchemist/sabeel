import { motion } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { springSnappy, springPress } from "@/lib/motion"
import { useHasHover } from "@/hooks/useHasHover"
import type { Surah } from "@/data/surahs"

type Props = {
  surah: Surah
  onOpen: (id: number) => void
}

/** A surah tile in the browse grid. Rendered as a real <button> so it is
 *  keyboard-focusable and screen-reader friendly (the old app used a div+onclick). */
export function SurahCard({ surah, onOpen }: Props) {
  const hasHover = useHasHover()
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(surah.id)}
      aria-label={`Open Surah ${surah.id}, ${surah.englishName} — ${surah.englishMeaning}, ${surah.verses} verses, ${surah.revelation}`}
      whileHover={hasHover ? { y: -3, transition: springSnappy } : undefined}
      whileTap={{ scale: 0.97, transition: springPress }}
      className="group flex w-full flex-col gap-3 rounded-[12px] bg-surface p-3 text-left shadow-card transition-shadow duration-200 hover:shadow-card-hover"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-[29px] shrink-0 items-center justify-center rounded-full bg-teal-deep text-sm font-bold text-white">
            {surah.id}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[18px] font-semibold leading-tight text-ink">
              {surah.englishName}
            </span>
            <span className="truncate text-xs font-semibold text-muted-foreground">
              {surah.englishMeaning}
            </span>
          </div>
        </div>
        <span dir="rtl" className="shrink-0 font-arabic text-[20px] leading-none text-ink">
          {surah.arabicName}
        </span>
      </div>

      <div className="h-px w-full bg-line" />

      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
          <span className="flex items-center gap-0.5">
            <span>Chapter</span>
            <span>{surah.id}</span>
          </span>
          <span className="size-[3px] rounded-full bg-muted-foreground" aria-hidden="true" />
          <span className="flex items-center gap-0.5">
            <span>{surah.verses}</span>
            <span>Verses</span>
          </span>
        </div>
        <Badge variant="revelation">{surah.revelation}</Badge>
      </div>
    </motion.button>
  )
}
