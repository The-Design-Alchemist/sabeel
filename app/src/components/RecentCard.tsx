import type { RecentEntry } from "@/hooks/useRecents"
import { formatTimeAgo } from "@/lib/utils"

type Props = {
  entry: RecentEntry
  onOpen: (id: number) => void
}

/** A "continue where you left off" card with a reading-progress bar. */
export function RecentCard({ entry, onOpen }: Props) {
  const { surah, currentVerse, progressPercent, lastPlayed } = entry
  return (
    <button
      type="button"
      onClick={() => onOpen(surah.id)}
      aria-label={`Continue Surah ${surah.id}, ${surah.englishName}, verse ${currentVerse} of ${surah.verses}`}
      className="flex w-full flex-col gap-3 rounded-[12px] bg-surface p-3 text-left shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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

      <div className="flex flex-col gap-2">
        <div
          className="h-1.5 w-full overflow-hidden rounded-[3px] bg-line"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-[3px] bg-gradient-to-r from-teal to-teal-deep transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-ink/80">
          <span>Current Verse: {currentVerse} of {surah.verses}</span>
          <span>Last Played: {formatTimeAgo(lastPlayed)}</span>
        </div>
      </div>
    </button>
  )
}
