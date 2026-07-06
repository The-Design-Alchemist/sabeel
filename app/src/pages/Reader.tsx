import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { useSurah } from "@/hooks/useSurah"
import { isSegmented } from "@/data/quran"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VerseView } from "@/components/reader/VerseView"
import { SegmentNav } from "@/components/reader/SegmentNav"
import { SettingsDialog, type ReaderSettings } from "@/components/reader/SettingsDialog"
import { easeOut } from "@/lib/motion"

const DEFAULT_SETTINGS: ReaderSettings = {
  translation: true,
  transliteration: true,
  highlighting: true,
}

function loadSettings(): ReaderSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("sabeel_settings") || "{}") }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -28 : 28 }),
}

export default function Reader() {
  const { id } = useParams()
  const surahId = Number(id)
  const { data, loading, error } = useSurah(surahId)

  const [verseIndex, setVerseIndex] = useState(0)
  const [segmentIndex, setSegmentIndex] = useState(0)
  const [dir, setDir] = useState(0)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)

  const updateSettings = (patch: Partial<ReaderSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      localStorage.setItem("sabeel_settings", JSON.stringify(next))
      return next
    })
  }

  const verses = data?.verses ?? []
  const verse = verses[verseIndex]
  const segmented = verse ? isSegmented(verse) : false
  const segments = verse?.segments ?? []

  // Reset to the top when the surah changes.
  useEffect(() => {
    setVerseIndex(0)
    setSegmentIndex(0)
    setDir(0)
  }, [surahId])

  // Persist reading progress + mark this surah as recent (drives the Home cards).
  useEffect(() => {
    if (!verse) return
    const verseNum = Number(verse.key.split(":")[1])
    localStorage.setItem(
      `progress_${surahId}`,
      JSON.stringify({ lastVerse: verseNum, lastPlayed: Date.now() })
    )
    try {
      const recents: number[] = JSON.parse(localStorage.getItem("recentSurahs") || "[]")
      const next = [surahId, ...recents.filter((x) => x !== surahId)].slice(0, 6)
      localStorage.setItem("recentSurahs", JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [surahId, verseIndex, verse])

  const goVerse = (i: number) => {
    if (!verses.length) return
    const clamped = Math.max(0, Math.min(verses.length - 1, i))
    if (clamped === verseIndex) return
    setDir(clamped > verseIndex ? 1 : -1)
    setVerseIndex(clamped)
    setSegmentIndex(0)
  }
  const goSegment = (i: number) => {
    const clamped = Math.max(0, Math.min(segments.length - 1, i))
    setDir(clamped >= segmentIndex ? 1 : -1)
    setSegmentIndex(clamped)
  }

  // The unit currently shown: a whole verse or one waqf segment.
  const view = useMemo(() => {
    if (!verse) return null
    const verseNum = Number(verse.key.split(":")[1])
    if (segmented) {
      const seg = segments[segmentIndex]
      const isLast = segmentIndex === segments.length - 1
      return {
        arabic: seg.arabic,
        transliteration: seg.transliteration,
        translation: seg.translation,
        verseNumber: isLast ? verseNum : null,
      }
    }
    return {
      arabic: verse.arabic,
      transliteration: verse.transliteration,
      translation: verse.translation,
      verseNumber: verseNum,
    }
  }, [verse, segmented, segments, segmentIndex])

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-teal-deep">
      {/* Header */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 py-4 text-white sm:px-6">
        <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
          <Link to="/">
            <ArrowLeft />
            <span className="hidden sm:inline">Back to List</span>
          </Link>
        </Button>
        <div className="flex flex-col items-center">
          {data && (
            <>
              <span className="font-arabic text-lg leading-tight">سُورَة {data.name}</span>
              <span className="text-sm font-semibold">{data.englishName}</span>
              <span className="text-xs text-white/70">{data.englishNameTranslation}</span>
            </>
          )}
        </div>
        <SettingsDialog settings={settings} onChange={updateSettings} />
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col rounded-t-[40px] bg-ground px-6 py-10 md:px-10">
        {loading && (
          <p className="m-auto text-sm text-muted-foreground">Loading surah…</p>
        )}
        {error && (
          <div className="m-auto flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-ink">Couldn't load this surah. {error}</p>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        )}

        {view && (
          <>
            <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col justify-center py-6">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={`${verseIndex}:${segmentIndex}`}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={easeOut}
                >
                  <VerseView
                    arabic={view.arabic}
                    transliteration={view.transliteration}
                    translation={view.translation}
                    verseNumber={view.verseNumber}
                    showTranslation={settings.translation}
                    showTransliteration={settings.transliteration}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Segment (waqf) navigation */}
            {segmented && (
              <div className="mx-auto w-full max-w-[820px] py-4">
                <SegmentNav
                  total={segments.length}
                  index={segmentIndex}
                  onSelect={goSegment}
                  onPrev={() => goSegment(segmentIndex - 1)}
                  onNext={() => goSegment(segmentIndex + 1)}
                />
              </div>
            )}

            {/* Verse navigation */}
            <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 border-t border-line pt-5">
              <Button
                variant="outline"
                onClick={() => goVerse(verseIndex - 1)}
                disabled={verseIndex === 0}
              >
                <ChevronLeft />
                <span className="hidden sm:inline">Previous Verse</span>
              </Button>

              <Select value={String(verseIndex)} onValueChange={(v) => goVerse(Number(v))}>
                <SelectTrigger aria-label="Jump to verse">
                  <SelectValue>
                    Verse {verse ? verse.key.split(":")[1] : ""} of {verses.length}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {verses.map((v, i) => (
                    <SelectItem key={v.key} value={String(i)}>
                      Verse {v.key.split(":")[1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => goVerse(verseIndex + 1)}
                disabled={verseIndex === verses.length - 1}
              >
                <span className="hidden sm:inline">Next Verse</span>
                <ChevronRight />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
