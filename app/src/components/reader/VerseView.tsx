import { Divider } from "./Divider"
import { cn } from "@/lib/utils"

type Props = {
  arabic: string
  /** When highlighting is on, render these word tokens as spans (synced to audio). */
  words?: string[]
  activeWord?: number
  onWordClick?: (i: number) => void
  highlight?: boolean
  transliteration?: string
  translation?: string
  /** Show the ayah-end number ornament (full verse, or the final segment). */
  verseNumber?: number | null
  showTranslation: boolean
  showTransliteration: boolean
}

function VerseEndMark({ n }: { n: number }) {
  return (
    <span
      dir="ltr"
      className="mx-1.5 inline-flex size-7 select-none items-center justify-center rounded-full border border-teal/40 align-middle font-sans text-sm font-semibold text-teal"
      aria-label={`Verse ${n}`}
    >
      {n}
    </span>
  )
}

/** Renders one unit of scripture — a whole verse or a single waqf segment. */
export function VerseView({
  arabic,
  words,
  activeWord = -1,
  onWordClick,
  highlight = false,
  transliteration,
  translation,
  verseNumber,
  showTranslation,
  showTransliteration,
}: Props) {
  const arabicCls = "font-arabic text-[clamp(26px,5vw,40px)] leading-[1.7] text-ink"

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {highlight && words && words.length ? (
        <p dir="rtl" lang="ar" className={arabicCls}>
          {words.map((w, i) => (
            <span
              key={i}
              onClick={() => onWordClick?.(i)}
              className={cn(
                "cursor-pointer rounded-md px-0.5 transition-colors duration-150 hover:bg-teal/10 motion-reduce:transition-none",
                i === activeWord ? "text-teal" : "text-ink"
              )}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
          {verseNumber != null && <VerseEndMark n={verseNumber} />}
        </p>
      ) : (
        <p dir="rtl" lang="ar" className={arabicCls}>
          {arabic}
          {verseNumber != null && <VerseEndMark n={verseNumber} />}
        </p>
      )}

      {showTransliteration && transliteration && (
        <>
          <Divider />
          <p className="max-w-[60ch] text-[clamp(15px,2vw,18px)] font-medium leading-relaxed text-teal-deep">
            {transliteration}
          </p>
        </>
      )}

      {showTranslation && translation && (
        <>
          <Divider />
          <p className="max-w-[60ch] text-[clamp(15px,2vw,18px)] font-medium leading-relaxed text-muted-foreground">
            {translation}
          </p>
        </>
      )}
    </div>
  )
}
