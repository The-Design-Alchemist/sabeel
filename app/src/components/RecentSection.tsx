import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { RecentCard } from "./RecentCard"
import type { RecentEntry } from "@/hooks/useRecents"
import { cn } from "@/lib/utils"
import { easeOut, springSnappy } from "@/lib/motion"

function usePerPage() {
  const [n, setN] = useState(() => (window.innerWidth <= 768 ? 1 : 3))
  useEffect(() => {
    const onResize = () => setN(window.innerWidth <= 768 ? 1 : 3)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return n
}

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 44 : -44 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -44 : 44 }),
}

type Props = {
  recents: RecentEntry[]
  onOpen: (id: number) => void
}

export function RecentSection({ recents, onOpen }: Props) {
  const perPage = usePerPage()
  // [page, direction] — direction drives the slide.
  const [[page, dir], setPage] = useState<[number, number]>([0, 0])
  const totalPages = Math.ceil(recents.length / perPage)
  const touchX = useRef<number | null>(null)

  useEffect(() => setPage([0, 0]), [perPage])
  const clampedPage = Math.min(page, totalPages - 1)
  const visible = recents.slice(clampedPage * perPage, clampedPage * perPage + perPage)

  const go = (target: number) => {
    if (target < 0 || target > totalPages - 1 || target === clampedPage) return
    setPage([target, target > clampedPage ? 1 : -1])
  }

  function onTouchEnd(endX: number) {
    if (touchX.current === null) return
    const dx = endX - touchX.current
    if (Math.abs(dx) > 50) go(clampedPage + (dx < 0 ? 1 : -1))
    touchX.current = null
  }

  return (
    <section
      aria-label="Continue reading"
      className="flex flex-col items-center gap-3 px-6 pb-10 md:px-10 xl:px-20"
    >
      <div
        className="w-full max-w-[1280px]"
        onTouchStart={(e) => (touchX.current = e.changedTouches[0].screenX)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].screenX)}
      >
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={clampedPage}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={easeOut}
            className="grid gap-6"
            style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}
          >
            {visible.map((e) => (
              <RecentCard key={e.surah.id} entry={e} onOpen={onOpen} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2.5" aria-label="Recent pages">
          {Array.from({ length: totalPages }).map((_, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show recent page ${i + 1} of ${totalPages}`}
              aria-current={i === clampedPage}
              animate={{
                scale: i === clampedPage ? 1.15 : 1,
                backgroundColor:
                  i === clampedPage ? "rgb(255 255 255)" : "rgba(255,255,255,0.3)",
              }}
              transition={springSnappy}
              className={cn("size-2.5 rounded-full")}
            />
          ))}
        </div>
      )}
    </section>
  )
}
