import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, X } from "lucide-react"
import { DUA_CATEGORIES, loadDuaCategory, type DuaTopic } from "@/data/duas"
import { useHaptics } from "@/hooks/useHaptics"
import { easeOut } from "@/lib/motion"

/**
 * The Dua tab of Home: the five thematic categories as stacked pastel cards that expand
 * (accordion) to reveal their topics as white cards. Tapping a topic opens the dua reader.
 * Content loads from the category's bundled JSON only when the card is first opened.
 */
export function DuaCategories() {
  const navigate = useNavigate()
  const haptics = useHaptics()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [topics, setTopics] = useState<Record<string, DuaTopic[]>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const toggle = (id: string, available: boolean) => {
    haptics.tap()
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next && available && !topics[next]) {
      setLoading(next)
      loadDuaCategory(next)
        .then((d) => setTopics((t) => ({ ...t, [next]: d.topics })))
        .catch(() => setTopics((t) => ({ ...t, [next]: [] })))
        .finally(() => setLoading(null))
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-4 pt-4">
      {DUA_CATEGORIES.map((cat, i) => {
        const isOpen = expanded === cat.id
        const cardTopics = topics[cat.id]
        return (
          <div
            key={cat.id}
            style={{ backgroundColor: cat.color, zIndex: isOpen ? 50 : i, marginTop: i === 0 ? 0 : -20 }}
            className="relative rounded-t-[24px] border-2 border-white px-6 pb-7 pt-5 shadow-[0_-2px_24px_rgba(0,0,0,0.12)] last:rounded-b-[24px]"
          >
            <button
              onClick={() => toggle(cat.id, cat.available)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-deep/30"
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[18px] font-semibold text-ink">{cat.name}</span>
                <span className="text-[12px] font-medium leading-snug text-ink/70">{cat.description}</span>
              </span>
              <span className="flex size-[29px] shrink-0 items-center justify-center rounded-full bg-white text-teal-deep">
                {isOpen ? <X className="size-[18px]" /> : <ArrowRight className="size-[18px]" />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={easeOut}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex flex-col gap-2.5">
                    {!cat.available ? (
                      <p className="rounded-2xl bg-white/70 px-4 py-4 text-[13px] text-ink/60">
                        Duas for this section are coming soon, in shā&rsquo; Allah.
                      </p>
                    ) : loading === cat.id ? (
                      <p className="px-1 py-3 text-[13px] text-ink/60">Loading&hellip;</p>
                    ) : (
                      (cardTopics ?? []).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => navigate(`/duas/${cat.id}/${t.id}`)}
                          className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] outline-none transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-teal-deep/30"
                        >
                          <span className="flex flex-1 flex-col">
                            <span className="text-[15px] font-semibold leading-snug text-ink">{t.name}</span>
                            <span className="text-[12px] text-ink/55">{t.arabicName}</span>
                          </span>
                          <span className="flex flex-col items-center rounded-xl bg-black/[0.04] px-3.5 py-1.5">
                            <span className="text-[16px] font-bold leading-none tabular-nums text-teal-deep">{t.duas.length}</span>
                            <span className="text-[10px] text-ink/50">Duas</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
