import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { Download, Info, Search } from "lucide-react"
import { SURAHS, type Surah } from "@/data/surahs"
import { Logo } from "@/components/Logo"
import { SurahCard } from "@/components/SurahCard"
import { Sheen } from "@/components/motion/Sheen"
import { DuaCategories } from "@/components/DuaCategories"
import { RecentSection } from "@/components/RecentSection"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useRecents } from "@/hooks/useRecents"
import { fadeRise, staggerContainer } from "@/lib/motion"

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

export default function Home() {
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"surah" | "dua">("surah")
  const recents = useRecents()
  const navigate = useNavigate()
  const results = useMemo(() => filterSurahs(SURAHS, query), [query])

  const openSurah = (id: number) => navigate(`/surah/${id}`)

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
        <Sheen>
          <Logo className="h-[51px] w-[167px]" />
        </Sheen>
        <Link
          to="/about"
          aria-label="About Sabeel"
          className="absolute left-3 top-[max(2.5rem,env(safe-area-inset-top))] inline-flex size-11 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Info className="size-5" />
        </Link>
        <Link
          to="/downloads"
          aria-label="Downloads"
          className="absolute right-3 top-[max(2.5rem,env(safe-area-inset-top))] inline-flex size-11 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
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
        {/* Surah / Dua toggle */}
        <div className="mx-auto flex w-full max-w-[340px] shrink-0 items-center gap-3 pt-8">
          {(["surah", "dua"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                "flex-1 rounded-full py-2.5 text-center text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-deep/30",
                tab === t
                  ? "bg-teal-deep font-semibold text-white"
                  : "bg-white font-medium text-teal-deep"
              )}
            >
              {t === "surah" ? "Surah" : "Dua"}
            </button>
          ))}
        </div>

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
              className="h-12 rounded-[12px] border-input pr-12 text-base font-medium"
            />
            <Search
              className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Scrollable: cards + footer */}
        <div className="flex flex-1 flex-col gap-10 overflow-y-auto pb-10">
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
          <div className="flex flex-1 flex-col overflow-y-auto pb-10">
            <DuaCategories />
          </div>
        )}
      </motion.main>
    </motion.div>
  )
}
