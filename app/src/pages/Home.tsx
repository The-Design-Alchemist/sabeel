import { type PointerEvent, type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Download, Info, Search, X } from "lucide-react"
import { SURAHS, type Surah } from "@/data/surahs"
import { Logo } from "@/components/Logo"
import { SurahCard } from "@/components/SurahCard"
import { DuaCategories } from "@/components/DuaCategories"
import { MakerDialog } from "@/components/MakerDialog"
import { RecentSection } from "@/components/RecentSection"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useRecents } from "@/hooks/useRecents"
import { easeOut, fadeRise, springPress, springSnappy, staggerContainer } from "@/lib/motion"
import { usePlayback } from "@/playback/PlaybackProvider"

function filterSurahs(list: Surah[], q: string): Surah[] {
  const term = q.toLowerCase().trim()
  if (!term) return list
  const norm = term.replace(/[^a-z0-9]/g, "")
  return list.filter((s) => {
    const name = s.englishName.toLowerCase()
    const meaning = s.englishMeaning.toLowerCase()
    return (
      name.includes(term) ||
      meaning.includes(term) ||
      name.replace(/[^a-z0-9]/g, "").includes(norm) ||
      meaning.replace(/[^a-z0-9]/g, "").includes(norm) ||
      s.arabicName.includes(term) ||
      String(s.id).includes(term)
    )
  })
}

type HomeTab = "surah" | "dua"

// The two tabs slide together like a carousel: dir=+1 (Surah→Dua) pushes left, dir=-1 pushes
// right. Percentages are of the section's own width, so it travels exactly one screen.
const sectionSlide = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%" }),
}

export default function Home() {
  const [query, setQuery] = useState("")
  // Remember the tab for this session, so returning from a dua lands back on the Dua tab.
  const [tab, setTab] = useState<HomeTab>(() => {
    return sessionStorage.getItem("sabeel.homeTab") === "dua" ? "dua" : "surah"
  })
  const [dir, setDir] = useState(0)
  // No haptic on the tab switch: the panel slides and the pill moves, so the change is already
  // unmissable — and this is the most-repeated interaction on the screen.
  const selectTab = (t: HomeTab) => {
    if (t === tab) return
    setDir(t === "dua" ? 1 : -1)
    sessionStorage.setItem("sabeel.homeTab", t)
    setTab(t)
  }

  // Horizontal swipe between tabs — reads the gesture start/end without capturing the pointer,
  // so vertical scrolling inside each section is untouched.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      selectTab(dx < 0 ? "dua" : "surah")
    }
  }

  // Preserve each tab's scroll position across the remount a tab switch causes.
  const tabRef = useRef(tab)
  tabRef.current = tab
  const scrollPos = useRef<Record<HomeTab, number>>({ surah: 0, dua: 0 })
  const attachScroll = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollTop = scrollPos.current[tabRef.current]
  }, [])
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    scrollPos.current[tabRef.current] = e.currentTarget.scrollTop
  }, [])

  const recents = useRecents()
  const navigate = useNavigate()
  const pb = usePlayback()
  const pillVisible = !!pb.nowPlaying // reserve bottom room so the last card clears the floating pill
  const results = useMemo(() => filterSurahs(SURAHS, query), [query])

  // Navigation only — the page transition is the feedback. (Shared by SurahCard and RecentCard.)
  const openSurah = (id: number) => {
    navigate(`/surah/${id}`)
  }

  // The one-time "about the maker" note — held back to the SECOND app launch so the first
  // session (onboarding just ran) goes straight to the content.
  const [makerOpen, setMakerOpen] = useState(false)
  useEffect(() => {
    let acked = true
    let launches = 1
    try {
      acked = localStorage.getItem("sabeel_maker_ack") === "1"
      // Count launches once per app process (sessionStorage guards in-app navigations).
      if (!sessionStorage.getItem("sabeel_launch_counted")) {
        launches = Number(localStorage.getItem("sabeel_launches") || "0") + 1
        localStorage.setItem("sabeel_launches", String(launches))
        sessionStorage.setItem("sabeel_launch_counted", "1")
      } else {
        launches = Number(localStorage.getItem("sabeel_launches") || "1")
      }
    } catch {
      /* ignore */
    }
    if (acked || launches < 2) return
    const t = setTimeout(() => setMakerOpen(true), 450)
    return () => clearTimeout(t)
  }, [])
  const closeMaker = () => {
    try {
      localStorage.setItem("sabeel_maker_ack", "1")
    } catch {
      /* ignore */
    }
    setMakerOpen(false)
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex h-dvh flex-col overflow-hidden bg-teal-deep"
    >
      <motion.header
        variants={fadeRise}
        className="relative flex shrink-0 items-center justify-center px-2.5 pb-5 pt-[max(2.5rem,env(safe-area-inset-top))]"
      >
        <Logo className="h-[51px] w-[167px]" />
        <Link
          to="/about"
          aria-label="About Sabeel"
          className="absolute left-3 top-[max(2.5rem,env(safe-area-inset-top))] inline-flex size-11 items-center justify-center rounded-full text-white/90 outline-none transition hover:bg-white/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Info className="size-5" />
        </Link>
        <Link
          to="/downloads"
          aria-label="Downloads"
          className="absolute right-3 top-[max(2.5rem,env(safe-area-inset-top))] inline-flex size-11 items-center justify-center rounded-full text-white/90 outline-none transition hover:bg-white/10 active:scale-90 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Download className="size-5" />
        </Link>
      </motion.header>

      {recents.length > 0 && (
        <motion.div variants={fadeRise} className="shrink-0">
          <RecentSection recents={recents} onOpen={openSurah} />
        </motion.div>
      )}

      <motion.main
        variants={fadeRise}
        className="flex flex-1 flex-col overflow-hidden rounded-t-[40px] bg-ground px-6 md:px-10 xl:px-20"
      >
        {/* Surah / Dua toggle — a shared-layout pill glides between the two, reinforcing the swipe */}
        <div
          role="tablist"
          aria-label="Browse Surahs or Duas"
          className="mx-auto flex w-full max-w-[340px] shrink-0 items-center gap-3 pt-8"
        >
          {(["surah", "dua"] as const).map((t) => {
            const selected = tab === t
            return (
              <motion.button
                key={t}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(t)}
                whileTap={{ scale: 0.97, transition: springPress }}
                className={cn(
                  "relative flex-1 rounded-full py-2.5 text-center text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-teal-deep/30",
                  selected ? "font-semibold text-white" : "bg-white font-medium text-teal-deep"
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="homeTabPill"
                    transition={springSnappy}
                    className="absolute inset-0 rounded-full bg-teal-deep"
                  />
                )}
                <span className="relative z-10">{t === "surah" ? "Surah" : "Dua"}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Swipeable Surah / Dua sections — tap a tab or swipe horizontally to switch. */}
        <div
          className="relative flex-1 overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipe.current = null)}
        >
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={tab}
              custom={dir}
              variants={sectionSlide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={easeOut}
              className="absolute inset-0 flex flex-col"
            >
              {tab === "surah" ? (
                <>
                  {/* Search — fixed */}
                  <div className="mx-auto w-full max-w-[1280px] shrink-0 pb-6 pt-6">
                    <label htmlFor="surah-search" className="sr-only">
                      Search for a surah by name, number, or meaning
                    </label>
                    <div className="relative">
                      <Input
                        id="surah-search"
                        type="search"
                        inputMode="search"
                        placeholder="Search for Surah"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        // ring-inset: the tab-swipe wrapper is overflow-hidden, so an outset
                        // focus ring would be clipped left/right — draw it inside instead.
                        className="h-12 rounded-[12px] border-input pr-12 text-base font-medium focus-visible:ring-inset"
                      />
                      {query ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("")
                            document.getElementById("surah-search")?.focus()
                          }}
                          aria-label="Clear search"
                          className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-black/5 active:scale-90 focus-visible:ring-2 focus-visible:ring-teal-deep/30"
                        >
                          <X className="size-5" />
                        </button>
                      ) : (
                        <Search
                          className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>

                  {/* Scrollable: cards + footer */}
                  <div
                    ref={attachScroll}
                    onScroll={handleScroll}
                    className={cn(
                      "flex flex-1 flex-col gap-10 overflow-y-auto overscroll-contain transition-[padding] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      pillVisible ? "pb-[calc(env(safe-area-inset-bottom)+6.5rem)]" : "pb-10"
                    )}
                  >
                    {/* Grid / empty state */}
                    <div className="mx-auto w-full max-w-[1280px] flex-1">
                      {results.length === 0 ? (
                        <div
                          className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
                          role="status"
                        >
                          <p className="max-w-[350px] text-sm font-medium text-ink">
                            Hmm, we couldn't find that surah.
                            <br />
                            Try searching by surah name, number, or meaning.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                          {results.map((s) => (
                            <SurahCard key={s.id} surah={s} onOpen={openSurah} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <footer className="mx-auto mt-auto flex w-full max-w-[1280px] items-center justify-between text-xs text-muted-foreground">
                      <span>v2.0</span>
                      <span>
                        Design &amp; Developed by <span className="text-ink">Aaqil Jamal</span>
                      </span>
                    </footer>
                  </div>
                </>
              ) : (
                <div
                  ref={attachScroll}
                  onScroll={handleScroll}
                  className={cn(
                    "flex flex-1 flex-col overflow-y-auto overscroll-contain transition-[padding] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    pillVisible ? "pb-[calc(env(safe-area-inset-bottom)+6.5rem)]" : "pb-10"
                  )}
                >
                  <DuaCategories />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <MakerDialog open={makerOpen} onClose={closeMaker} />
    </motion.div>
  )
}
