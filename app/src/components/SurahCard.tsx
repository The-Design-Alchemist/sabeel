import { Badge } from "@/components/ui/badge"
import type { Surah } from "@/data/surahs"

type Props = {
  surah: Surah
  onOpen: (id: number) => void
}

/** A surah tile in the browse grid. Rendered as a real <button> so it is
 *  keyboard-focusable and screen-reader friendly (the old app used a div+onclick). */
export function SurahCard({ surah, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(surah.id)}
      aria-label={`Open Surah ${surah.id}, ${surah.englishName} — ${surah.englishMeaning}, ${surah.verses} verses, ${surah.revelation}`}
      className="group flex w-full flex-col gap-3 rounded-[12px] bg-surface p-3 text-left shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
    </button>
  )
}
