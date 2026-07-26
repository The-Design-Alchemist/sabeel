import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Check, Repeat, WifiOff } from "lucide-react"
import { setStatusBar } from "@/lib/native"
import { easeOut, springPress } from "@/lib/motion"
import { cn } from "@/lib/utils"
import fullLogo from "@/assets/sabeel-full-logo.png"

// Emil's strong ease-out. Onboarding is first-run only, so richer, staggered motion is warranted:
// each visual's parts "rise" in one after another so the slide reads as a small story, not a block.
const EASE = [0.23, 1, 0.32, 1] as const
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.42, ease: EASE },
})
const pop = (delay: number) => ({
  initial: { opacity: 0, scale: 0.5 }, // never from 0 — starts visible-ish, then springs to full
  animate: { opacity: 1, scale: 1 },
  transition: { delay, type: "spring" as const, duration: 0.5, bounce: 0.4 },
})

// --- slide 2 (the moat): Al-Baqarah 2:2, first waqf segment highlighted + looped ---
const WAQF_LEAD = "ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ"
const WAQF_REST = "ۛ هُدًى لِّلمُتَّقِينَ"

function WaqfDemo() {
  const reduce = useReducedMotion()
  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-4">
      <motion.span
        {...rise(0.05)}
        className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        Al-Baqarah · verse 2
      </motion.span>
      <motion.p
        {...rise(0.18)}
        dir="rtl"
        className="text-center font-arabic text-[21px] leading-[2.1] text-ink/30"
      >
        <span className="box-decoration-clone rounded-md bg-teal-deep px-1.5 py-1 text-white [-webkit-box-decoration-break:clone]">
          {WAQF_LEAD}
        </span>{" "}
        {WAQF_REST}
      </motion.p>
      <motion.div {...rise(0.34)} className="flex items-center gap-2 text-teal-deep">
        <motion.span
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="flex"
        >
          <Repeat className="size-4" />
        </motion.span>
        <span className="text-[12px] font-medium">Loop one waqf segment until it sticks</span>
      </motion.div>
    </div>
  )
}

// --- slide 3: word-by-word highlight ---
const DEMO_WORDS = ["بِسْمِ", "ٱللَّٰهِ", "ٱلرَّحْمَٰنِ", "ٱلرَّحِيمِ"]

function WordDemo() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setActive((a) => (a + 1) % DEMO_WORDS.length), 1050)
    return () => clearInterval(t)
  }, [reduce])
  return (
    <div dir="rtl" className="flex max-w-[300px] flex-wrap items-center justify-center gap-2.5">
      {DEMO_WORDS.map((w, idx) => (
        <motion.span
          key={idx}
          {...rise(0.1 + idx * 0.1)} // words appear one after another, then the highlight cycles
          className={cn(
            "rounded-xl px-3.5 py-2 font-arabic text-[28px] leading-[1.7] transition-colors duration-300",
            idx === active ? "bg-teal-deep text-white" : "text-ink/30"
          )}
        >
          {w}
        </motion.span>
      ))}
    </div>
  )
}

// --- slide 4: translation & transliteration (Arabic → sound → meaning, revealed in sequence) ---
function ReadingDemo() {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <motion.span
        {...rise(0.05)}
        dir="rtl"
        className="font-arabic text-[32px] leading-[1.7] text-ink"
      >
        ٱلْحَمْدُ لِلَّٰهِ
      </motion.span>
      <motion.span {...rise(0.4)} className="text-[15px] italic text-muted-foreground">
        al-ḥamdu lillāh
      </motion.span>
      <motion.span {...rise(0.72)} className="text-[15px] font-medium text-teal-deep">
        All praise is for Allah
      </motion.span>
    </div>
  )
}

// --- slide 5: offline (saved → works without a connection) ---
function OfflineDemo() {
  return (
    <div className="relative flex size-28 items-center justify-center rounded-[28px] bg-teal-deep/10">
      <motion.span {...rise(0.1)} className="text-teal-deep">
        <Check className="size-14" strokeWidth={2.25} />
      </motion.span>
      <motion.span
        {...pop(0.5)}
        className="absolute -bottom-2 -right-2 flex size-11 items-center justify-center rounded-full border-4 border-ground bg-teal-deep text-white"
      >
        <WifiOff className="size-5" />
      </motion.span>
    </div>
  )
}

type Slide = { visual: ReactNode; title: string; body: string }

const SLIDES: Slide[] = [
  {
    visual: (
      <motion.img
        src={fullLogo}
        alt=""
        className="size-32"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      />
    ),
    title: "Welcome to Sabeel",
    body: "A calmer way to read, listen to, and memorize the Qur'an.",
  },
  {
    visual: <WaqfDemo />,
    title: "Memorise at waqf",
    body: "Loop a single waqf segment on repeat until it sticks, then move to the next — the natural way to commit a verse to memory.",
  },
  {
    visual: <WordDemo />,
    title: "Follow every word",
    body: "Every word lights up exactly as it's recited, so your eyes never lose the place.",
  },
  {
    visual: <ReadingDemo />,
    title: "Read with meaning",
    body: "Toggle English translation and transliteration on or off — read for understanding, or focus purely on the Arabic.",
  },
  {
    visual: <OfflineDemo />,
    title: "Yours, fully offline",
    body: "Save any surah and use everything with no account and no connection.",
  },
]

const slide = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -24 : 24 }),
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const total = SLIDES.length
  const last = i === total - 1

  // Light top section → dark status-bar icons; restore the app's teal on the way out.
  useEffect(() => {
    setStatusBar("#f6f6f6", false)
  }, [])

  // No haptics anywhere in onboarding. Every step already animates visibly, and buzzing on each
  // of the five advances — then twice more on "Get started" — was the loudest offender.
  const go = (n: number) => {
    const c = Math.max(0, Math.min(total - 1, n))
    if (c === i) return
    setDir(c > i ? 1 : -1)
    setI(c)
  }
  const finish = () => {
    setStatusBar("#042a2b", true)
    onDone()
  }
  const next = () => (last ? finish() : go(i + 1))

  // Horizontal swipe between steps (same lightweight pattern as the Home tabs).
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? i + 1 : i - 1)
  }

  return (
    <div
      className="flex h-dvh flex-col bg-ground"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      {/* Top — light visual area (status bar sits over it) */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 justify-end px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {!last && (
            <button
              onClick={finish}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-teal-deep/30"
            >
              Skip
            </button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center px-8 pb-4">
          {/* Quick crossfade on swap; each visual's own parts do the storytelling entrance. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex items-center justify-center"
            >
              {SLIDES[i].visual}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom — teal panel with the curved top edge */}
      <div className="shrink-0 rounded-t-[40px] bg-teal-deep px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-9 text-white">
        {/* Fixed min-height reserves room for the tallest (headline + 3-line) copy, so the top
            visual never shifts as body length changes between slides. */}
        <div className="min-h-[7.5rem]">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={i}
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={easeOut}
              className="flex flex-col gap-3"
            >
              <h2 className="text-[26px] font-semibold leading-tight">{SLIDES[i].title}</h2>
              <p className="text-[15px] leading-relaxed text-white/65">{SLIDES[i].body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: total }).map((_, d) => (
            <button
              key={d}
              onClick={() => go(d)}
              aria-label={`Go to step ${d + 1} of ${total}`}
              aria-current={d === i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                d === i ? "w-6 bg-white" : "w-1.5 bg-white/30"
              )}
            />
          ))}
        </div>

        {/* Primary action */}
        <motion.button
          whileTap={{ scale: 0.97, transition: springPress }}
          onClick={next}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-[16px] font-semibold text-teal-deep outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {last ? "Get started" : "Continue"}
          {!last && <ArrowRight className="size-5" />}
        </motion.button>
      </div>
    </div>
  )
}
