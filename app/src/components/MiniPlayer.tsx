import { useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react"
import { usePlayback } from "@/playback/PlaybackProvider"
import { springPress } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Floating "now playing" bar — full-width pill that spans the screen: play/pause + title on
 * the left, transport (prev / next / repeat) on the right. Appears whenever a surah or dua is
 * playing and the user has left its reader; recitation keeps going. Tap the title to return.
 */
export function MiniPlayer() {
  const pb = usePlayback()
  const navigate = useNavigate()
  const location = useLocation()

  const np = pb.nowPlaying
  // Hide on the reader that owns the current playback (it has its own full controls).
  const onOwnReader =
    !!np &&
    ((np.kind === "surah" && location.pathname.startsWith("/surah/")) ||
      (np.kind === "dua" && location.pathname.startsWith("/duas/")))
  const visible = !!np && !onOwnReader

  const tap = { scale: 0.9, transition: springPress }

  return (
    <AnimatePresence>
      {visible && np && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
          className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 px-3"
        >
          <div className="flex w-full items-center justify-between gap-2 rounded-full bg-teal-deep py-1.5 pl-1.5 pr-2 text-white shadow-[0_12px_34px_-8px_rgba(4,42,43,0.65)] ring-1 ring-white/10">
            {/* Left: play/pause + title (tap to return) */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <motion.button
                whileTap={tap}
                onClick={pb.togglePlay}
                aria-label={pb.playing ? "Pause" : "Play"}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-teal-deep outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-5"
              >
                {pb.playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
              </motion.button>

              <button
                onClick={() => navigate(np.route)}
                aria-label={`Open ${np.title}`}
                className="flex min-w-0 flex-1 flex-col items-start px-1 text-left outline-none focus-visible:opacity-80"
              >
                <span className="w-full truncate text-[13px] font-semibold leading-tight">{np.title}</span>
                <span className="text-[11px] leading-tight text-white/60 tabular-nums">{np.subtitle}</span>
              </button>
            </div>

            {/* Right: transport */}
            <div className="flex shrink-0 items-center gap-0.5">
              <motion.button
                whileTap={tap}
                onClick={pb.prev}
                disabled={np.atStart}
                aria-label="Previous"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30 [&_svg]:size-[18px]"
              >
                <SkipBack className="fill-current" />
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={pb.next}
                disabled={np.atEnd}
                aria-label="Next"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30 [&_svg]:size-[18px]"
              >
                <SkipForward className="fill-current" />
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={pb.toggleRepeat}
                aria-pressed={pb.repeat}
                aria-label="Repeat"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-[18px]",
                  pb.repeat ? "bg-white text-teal-deep" : "text-white/90 hover:bg-white/10"
                )}
              >
                <Repeat />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
