import { motion } from "motion/react"
import { Link } from "react-router-dom"
import { ArrowLeft, Mail, Shield, ExternalLink } from "lucide-react"
import { fadeRise, staggerContainer } from "@/lib/motion"

// ─── Fill in before publishing ──────────────────────────────────────────────
// A public support inbox and the hosted privacy-policy URL. The email is a mailto
// (opens the mail app); the two external links open in the system browser.
const SUPPORT_EMAIL = "aaqil.jamal98@gmail.com"
const PRIVACY_URL = "https://the-design-alchemist.github.io/sabeel/privacy"
// ────────────────────────────────────────────────────────────────────────────

const APP_VERSION = "2.0"

type Credit = { role: string; name: string; detail?: string; href?: string }

// Attributions for the licensed source material. The cpfair timings are CC BY 4.0,
// which *requires* this credit; the rest are here out of correctness and adab.
const CREDITS: Credit[] = [
  {
    role: "Recitation",
    name: "Mishary Rashid Alafasy",
    detail: "Audio courtesy of EveryAyah.com",
    href: "https://everyayah.com",
  },
  {
    role: "Arabic text",
    name: "Uthmani script — Tanzil",
    detail: "King Fahd Glorious Qur'an Printing Complex orthography",
    href: "https://tanzil.net",
  },
  {
    role: "English translation",
    name: "Saheeh International",
  },
  {
    role: "Word-by-word timing",
    name: "quran-align — Collin Fair",
    detail: "Licensed under CC BY 4.0",
    href: "https://github.com/cpfair/quran-align",
  },
]

function Row({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls =
    "flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-ink outline-none transition-colors hover:bg-ground focus-visible:bg-ground"
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <div className={cls}>{children}</div>
  )
}

export default function About() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex h-dvh flex-col overflow-hidden bg-teal-deep"
    >
      <header className="relative flex shrink-0 items-center justify-center px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <Link
          to="/"
          aria-label="Back to Home"
          className="absolute left-3 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <ArrowLeft className="size-5" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="text-base font-semibold">About</span>
      </header>

      <motion.main variants={fadeRise} className="flex-1 overflow-y-auto rounded-t-[40px] bg-ground">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          {/* Identity */}
          <section className="flex flex-col items-center gap-3 text-center">
            <span dir="rtl" lang="ar" className="font-arabic text-5xl leading-none text-teal-deep">
              سبيل
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-ink">Sabeel</h1>
              <p className="mx-auto mt-1.5 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
                A calm, word-by-word Qur&rsquo;an reader — recitation, translation, and waqf-segment
                memorization, fully offline.
              </p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
              Version {APP_VERSION}
            </span>
          </section>

          {/* Sources & Credits */}
          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Sources &amp; Credits
            </h2>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-surface">
              {CREDITS.map((c) => (
                <li key={c.role} className="flex flex-col gap-0.5 px-4 py-3.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-teal">
                    {c.role}
                  </span>
                  <span className="text-[15px] font-medium text-ink">{c.name}</span>
                  {c.detail && <span className="text-[13px] text-muted-foreground">{c.detail}</span>}
                  {c.href && (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex w-fit items-center gap-1 text-[13px] text-teal underline-offset-2 hover:underline"
                    >
                      {c.href.replace(/^https?:\/\//, "")}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
              Every effort has been made toward accuracy, and the Arabic text is under scholarly
              review. If you notice any error in the text, translation, or timing, please tell us —
              it will be corrected promptly.
            </p>
          </section>

          {/* Privacy & Contact */}
          <section className="flex flex-col gap-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Privacy &amp; Contact
            </h2>
            <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-surface">
              <p className="px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
                Sabeel has no account and collects no personal data. Your reading progress, settings,
                and downloads stay on your device.
              </p>
              <Row href={PRIVACY_URL}>
                <Shield className="size-[18px] shrink-0 text-teal" />
                Privacy Policy
                <ExternalLink className="ml-auto size-4 text-muted-foreground" />
              </Row>
              <Row href={`mailto:${SUPPORT_EMAIL}?subject=Sabeel%20feedback`}>
                <Mail className="size-[18px] shrink-0 text-teal" />
                Report an error &middot; Contact
                <ExternalLink className="ml-auto size-4 text-muted-foreground" />
              </Row>
            </div>
          </section>

          <footer className="flex flex-col items-center gap-1 pt-2 text-center text-[13px] text-muted-foreground">
            <span>
              Designed &amp; developed by <span className="text-ink">Aaqil Jamal</span>
            </span>
            <span className="text-teal">May it be of benefit. 🤍</span>
          </footer>
        </div>
      </motion.main>
    </motion.div>
  )
}
