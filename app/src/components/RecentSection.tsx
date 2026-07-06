import { useEffect, useRef, useState } from "react"
import { RecentCard } from "./RecentCard"
import type { RecentEntry } from "@/hooks/useRecents"
import { cn } from "@/lib/utils"

function usePerPage() {
  const [n, setN] = useState(() => (window.innerWidth <= 768 ? 1 : 3))
  useEffect(() => {
    const onResize = () => setN(window.innerWidth <= 768 ? 1 : 3)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return n
}

type Props = {
  recents: RecentEntry[]
  onOpen: (id: number) => void
}

export function RecentSection({ recents, onOpen }: Props) {
  const perPage = usePerPage()
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(recents.length / perPage)
  const touchX = useRef<number | null>(null)

  useEffect(() => setPage(0), [perPage])
  const clampedPage = Math.min(page, totalPages - 1)
  const visible = recents.slice(clampedPage * perPage, clampedPage * perPage + perPage)

  function onTouchEnd(endX: number) {
    if (touchX.current === null) return
    const dx = endX - touchX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0 && clampedPage < totalPages - 1) setPage(clampedPage + 1)
      else if (dx > 0 && clampedPage > 0) setPage(clampedPage - 1)
    }
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
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}
        >
          {visible.map((e) => (
            <RecentCard key={e.surah.id} entry={e} onOpen={onOpen} />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2.5" aria-label="Recent pages">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Show recent page ${i + 1} of ${totalPages}`}
              aria-current={i === clampedPage}
              className={cn(
                "size-2.5 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                i === clampedPage ? "bg-white" : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
