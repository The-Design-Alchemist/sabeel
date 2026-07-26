import { useEffect, useRef } from "react"
import { useReducedMotion } from "motion/react"
import { Divider } from "./Divider"
import { cn } from "@/lib/utils"

type Props = {
  arabic: string
  /** When highlighting is on, render these word tokens as spans (synced to audio). */
  words?: string[]
  activeWord?: number
  onWordClick?: (i: number) => void
  /** Whether tapping a word seeks to it. False while a segment loop is running (tap is a
   *  no-op then), so we don't advertise a dead pointer/hover affordance. */
  interactive?: boolean
  highlight?: boolean
  transliteration?: string
  translation?: string
  /** Show the ayah-end number ornament (full verse, or the final segment). */
  verseNumber?: number | null
  showTranslation: boolean
  showTransliteration: boolean
}

const ARABIC_INDIC = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
function toArabicIndic(n: number): string {
  return String(n)
    .split("")
    .map((d) => ARABIC_INDIC[+d] ?? d)
    .join("")
}

/** Traditional ayah-end rosette: U+06DD (End of Ayah) enclosing the verse number
 *  in Arabic-Indic digits, rendered in the Arabic face (teal). */
function VerseEndMark({ n }: { n: number }) {
  return (
    <span
      dir="rtl"
      lang="ar"
      className="mx-1 select-none align-baseline font-arabic text-[0.9em] text-teal"
      aria-label={`Verse ${n}`}
    >
      {"۝" + toArabicIndic(n)}
    </span>
  )
}

/** Renders one unit of scripture — a whole verse or a single waqf segment. */
export function VerseView({
  arabic,
  words,
  activeWord = -1,
  onWordClick,
  interactive = true,
  highlight = false,
  transliteration,
  translation,
  verseNumber,
  showTranslation,
  showTransliteration,
}: Props) {
  const arabicCls = "font-arabic text-[clamp(32px,7vw,48px)] leading-[1.7] text-ink"
  // Words seek-on-tap only when a handler exists AND we're not mid-loop (tap would no-op).
  const clickable = interactive && !!onWordClick
  const reduce = useReducedMotion()
  const activeRef = useRef<HTMLElement | null>(null)
  const setActiveRef = (el: HTMLElement | null) => {
    activeRef.current = el
  }

  // Keep the recited word in view on long verses. block:'nearest' is inert when it already
  // fits on screen, so short verses never jump.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
  }, [activeWord, reduce])

  const wordCls = (active: boolean) =>
    cn(
      "inline rounded-md px-0.5 align-baseline transition-colors duration-150 outline-none motion-reduce:transition-none",
      clickable && "cursor-pointer hover:bg-teal/10 focus-visible:bg-teal/10",
      active ? "bg-teal/10 text-teal" : "text-ink"
    )

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {highlight && words && words.length ? (
        <p dir="rtl" lang="ar" className={arabicCls}>
          {words.map((w, i) => {
            const active = i === activeWord
            const space = i < words.length - 1 ? " " : ""
            return (
              <span key={i}>
                {clickable ? (
                  <button
                    type="button"
                    ref={active ? setActiveRef : undefined}
                    onClick={() => onWordClick?.(i)}
                    aria-label={`Play from “${w}”`}
                    aria-current={active ? "true" : undefined}
                    className={wordCls(active)}
                  >
                    {w}
                  </button>
                ) : (
                  <span
                    ref={active ? setActiveRef : undefined}
                    aria-current={active ? "true" : undefined}
                    className={wordCls(active)}
                  >
                    {w}
                  </span>
                )}
                {space}
              </span>
            )
          })}
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
          <p className="max-w-[60ch] text-[clamp(18px,2.5vw,20px)] font-medium leading-relaxed text-teal-deep">
            {transliteration}
          </p>
        </>
      )}

      {showTranslation && translation && (
        <>
          <Divider />
          <p className="max-w-[60ch] text-[clamp(18px,2.5vw,20px)] font-medium leading-relaxed text-muted-foreground">
            {translation}
          </p>
        </>
      )}
    </div>
  )
}
