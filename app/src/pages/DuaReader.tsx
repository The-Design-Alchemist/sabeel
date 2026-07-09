import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { duaCategory, loadDuaCategory, type DuaTopic } from "@/data/duas"
import { useHaptics } from "@/hooks/useHaptics"
import { easeOut } from "@/lib/motion"

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -28 : 28 }),
}

/** A small tajwīd-style divider between the dua's Arabic, transliteration, and translation. */
function Ornament() {
  return (
    <div className="flex items-center gap-2 text-teal/40" aria-hidden="true">
      <span className="h-px w-10 bg-current" />
      <span className="size-2 rotate-45 rounded-[2px] border border-current" />
      <span className="h-px w-10 bg-current" />
    </div>
  )
}

export default function DuaReader() {
  const { categoryId = "", topicId = "" } = useParams()
  const cat = duaCategory(categoryId)
  const haptics = useHaptics()
  const [topic, setTopic] = useState<DuaTopic | null>(null)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(0)

  useEffect(() => {
    let alive = true
    setTopic(null)
    setError(false)
    setIndex(0)
    loadDuaCategory(categoryId)
      .then((d) => {
        if (!alive) return
        const t = d.topics.find((x) => x.id === topicId)
        if (t) setTopic(t)
        else setError(true)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [categoryId, topicId])

  const total = topic?.duas.length ?? 0
  const dua = topic?.duas[index]
  const go = (delta: number) => {
    if (!topic) return
    const n = Math.max(0, Math.min(total - 1, index + delta))
    if (n === index) return
    haptics.tap()
    setDir(delta)
    setIndex(n)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ground">
      <header className="flex shrink-0 flex-col gap-2.5 bg-[#eef4ea] px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-full py-1 text-sm font-medium text-teal-deep outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-teal-deep/30"
        >
          <ArrowLeft className="size-4" />
          Back to List
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-ink">{topic?.name ?? cat?.name ?? "Duas"}</h1>
          {topic && <p className="text-[13px] text-ink/55">{topic.arabicName}</p>}
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto">
        {error ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Couldn&rsquo;t load these duas.
          </div>
        ) : !dua ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading&hellip;</div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-8">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={index}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={easeOut}
                className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 text-center"
              >
                <span className="text-xs font-medium uppercase tracking-[0.06em] text-teal">{dua.reference}</span>
                <p dir="rtl" lang="ar" className="font-arabic text-[30px] leading-[2] text-ink">
                  {dua.arabic}
                </p>
                <Ornament />
                <p className="text-[15px] italic leading-relaxed text-ink/70">{dua.transliteration}</p>
                <Ornament />
                <p className="text-[15px] leading-relaxed text-ink">&ldquo;{dua.translation}&rdquo;</p>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous dua"
          className="flex size-12 items-center justify-center rounded-full bg-ground text-ink outline-none transition-colors hover:bg-[#ececec] focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 [&_svg]:size-6"
        >
          <ChevronLeft />
        </button>
        <span className="text-sm font-medium tabular-nums text-ink">
          Dua {total ? index + 1 : 0} of {total}
        </span>
        <button
          onClick={() => go(1)}
          disabled={total === 0 || index >= total - 1}
          aria-label="Next dua"
          className="flex size-12 items-center justify-center rounded-full bg-teal-deep text-white outline-none transition-colors hover:bg-[#063a3c] focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 [&_svg]:size-6"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}
