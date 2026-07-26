import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, X } from "lucide-react"
import { DUA_CATEGORIES, loadDuaCategory, type DuaTopic } from "@/data/duas"
import { easeOut } from "@/lib/motion"
import { cn } from "@/lib/utils"

const OPEN_KEY = "sabeel.duaOpenCat"

/**
 * The Dua tab of Home: the five thematic categories as stacked pastel cards that expand
 * (accordion) to reveal their topics as white cards. Tapping a topic opens the dua reader.
 * Content loads from the category's bundled JSON only when the card is first opened.
 */
export function DuaCategories() {
  const navigate = useNavigate()
  // Remember which card was open for this session, so returning from a dua re-opens it.
  const [expanded, setExpanded] = useState<string | null>(() => sessionStorage.getItem(OPEN_KEY))
  const [topics, setTopics] = useState<Record<string, DuaTopic[]>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const loadTopics = useCallback((id: string) => {
    if (!DUA_CATEGORIES.find((c) => c.id === id)?.available) return
    setLoading(id)
    loadDuaCategory(id)
      .then((d) => setTopics((t) => ({ ...t, [id]: d.topics })))
      .catch(() => setTopics((t) => ({ ...t, [id]: [] })))
      .finally(() => setLoading(null))
  }, [])

  // Load topics whenever a card is open without them (fresh toggle or a restored card).
  useEffect(() => {
    if (expanded && !topics[expanded]) loadTopics(expanded)
  }, [expanded, topics, loadTopics])

  // Warm every category once when the Dua tab mounts, so opening a card is instant (tiny JSON).
  useEffect(() => {
    DUA_CATEGORIES.forEach((c) => {
      if (c.available) loadTopics(c.id)
    })
  }, [loadTopics])

  const toggle = (id: string) => {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) sessionStorage.setItem(OPEN_KEY, next)
    else sessionStorage.removeItem(OPEN_KEY)
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-2 pb-4 pt-6">
      {DUA_CATEGORIES.map((cat, i) => {
        const isOpen = expanded === cat.id
        const cardTopics = topics[cat.id]
        return (
          <div
            key={cat.id}
            // Natural stacking (each later card sits ON TOP), so the next card's rounded top
            // shows over an expanded one. Open cards get extra bottom room for breathing space.
            style={{ backgroundColor: cat.color, zIndex: i, marginTop: i === 0 ? 0 : -22 }}
            className={cn(
              "relative rounded-t-[24px] border-2 border-white px-6 pt-5 shadow-[0_-5px_14px_-6px_rgba(0,0,0,0.17)] last:rounded-b-[24px]",
              isOpen ? "pb-12" : "pb-7"
            )}
          >
            <button
              onClick={() => toggle(cat.id)}
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
                      <div className="flex animate-pulse flex-col gap-2.5" aria-hidden="true">
                        {[0, 1, 2].map((k) => (
                          <div key={k} className="flex items-center gap-3 rounded-2xl bg-white p-4">
                            <div className="flex flex-1 flex-col gap-1.5">
                              <div className="h-3.5 w-2/3 rounded bg-black/[0.07]" />
                              <div className="h-2.5 w-2/5 rounded bg-black/[0.05]" />
                            </div>
                            <div className="size-9 rounded-xl bg-black/[0.06]" />
                          </div>
                        ))}
                      </div>
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
