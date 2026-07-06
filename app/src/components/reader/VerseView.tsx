import { Divider } from "./Divider"

type Props = {
  arabic: string
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
      className="mx-1 inline-flex size-8 select-none items-center justify-center rounded-full border border-teal/40 align-middle font-sans text-sm font-semibold text-teal"
      aria-label={`Verse ${n}`}
    >
      {n}
    </span>
  )
}

/** Renders one unit of scripture — a whole verse or a single waqf segment. */
export function VerseView({
  arabic,
  transliteration,
  translation,
  verseNumber,
  showTranslation,
  showTransliteration,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p
        dir="rtl"
        lang="ar"
        className="font-arabic text-[clamp(26px,5vw,40px)] leading-[1.7] text-ink"
      >
        {arabic}
        {verseNumber != null && <VerseEndMark n={verseNumber} />}
      </p>

      {showTransliteration && transliteration && (
        <>
          <Divider />
          <p className="max-w-[60ch] text-[clamp(15px,2vw,18px)] italic leading-relaxed text-muted-foreground">
            {transliteration}
          </p>
        </>
      )}

      {showTranslation && translation && (
        <>
          <Divider />
          <p className="max-w-[60ch] text-[clamp(15px,2vw,18px)] leading-relaxed text-ink/90">
            {translation}
          </p>
        </>
      )}
    </div>
  )
}
