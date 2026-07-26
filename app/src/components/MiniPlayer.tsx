import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion, type PanInfo } from "motion/react"
import { Loader2, Pause, Play, Repeat, SkipBack, SkipForward, X } from "lucide-react"
import { usePlayback } from "@/playback/PlaybackProvider"
import { useHaptics } from "@/hooks/useHaptics"
import { useDelayedFlag } from "@/hooks/useDelayedFlag"
import { springPress, springSoft } from "@/lib/motion"
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
  const haptics = useHaptics()

  const np = pb.nowPlaying
  const buffering = useDelayedFlag(pb.pending)
  // Hide on the reader that owns the current playback (it has its own full controls).
  const onOwnReader =
    !!np &&
    ((np.kind === "surah" && location.pathname.startsWith("/surah/")) ||
      (np.kind === "dua" && location.pathname.startsWith("/duas/")))
  const visible = !!np && !onOwnReader

  const tap = { scale: 0.9, transition: springPress }

  // Thin progress track — driven locally (never re-renders the tree). getProgress() gives the
  // position through the verse, or through the looping waqf segment (fills, resets, fills).
  const { getProgress } = pb
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!visible) {
      if (barRef.current) barRef.current.style.transform = "scaleX(0)"
      return
    }
    let raf = 0
    const tick = () => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${getProgress()})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, getProgress])

  // Publish the pill's footprint so any screen can reserve bottom room for it.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty(
      "--miniplayer-clearance",
      visible ? "calc(env(safe-area-inset-bottom) + 6.5rem)" : "0px"
    )
    return () => root.style.setProperty("--miniplayer-clearance", "0px")
  }, [visible])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Fling or drag the pill down far enough to dismiss; otherwise it snaps back.
    // Kept haptic: a gesture threshold is the one thing you genuinely can't see coming —
    // the tap confirms the fling took before the pill has finished animating away.
    if (info.offset.y > 56 || info.velocity.y > 500) {
      haptics.tap()
      pb.dismiss()
    }
  }

  return (
    <AnimatePresence>
      {visible && np && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={springSoft}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          dragSnapToOrigin
          onDragEnd={onDragEnd}
          // px matches Home's content container (px-6 md:px-10 xl:px-20) so the pill's
          // edges line up with the surah cards instead of overhanging them.
          className="fixed inset-x-0 bottom-[max(2rem,calc(env(safe-area-inset-bottom)_+_1.25rem))] z-50 px-6 md:px-10 xl:px-20"
        >
          <div className="flex w-full items-center justify-between gap-2 rounded-full bg-teal-deep py-1.5 pl-1.5 pr-2 text-white shadow-[0_12px_34px_-8px_rgba(4,42,43,0.65)] ring-1 ring-white/10">
            {/* Left: play/pause + title (tap to return) */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <motion.button
                whileTap={tap}
                onClick={pb.togglePlay}
                aria-busy={buffering}
                aria-label={buffering ? "Loading" : pb.playing ? "Pause" : "Play"}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-teal-deep outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-5"
              >
                {buffering ? (
                  <Loader2 className="animate-spin" />
                ) : pb.playing ? (
                  <Pause className="fill-current" />
                ) : (
                  <Play className="fill-current" />
                )}
              </motion.button>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <button
                  onClick={() => navigate(np.route)}
                  aria-label={`Open ${np.title}`}
                  className="flex min-w-0 flex-col items-start px-1 text-left outline-none focus-visible:opacity-80"
                >
                  <span className="w-full truncate text-[13px] font-semibold leading-tight">{np.title}</span>
                  <span className="text-[11px] leading-tight text-white/60 tabular-nums">{np.subtitle}</span>
                </button>
                {/* Playback progress — sits under the title, clear of the pill's rounded edges */}
                <div className="mx-1 h-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    ref={barRef}
                    className="h-full w-full origin-left rounded-full bg-white/50"
                    style={{ transform: "scaleX(0)" }}
                  />
                </div>
              </div>
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
              <motion.button
                whileTap={tap}
                onClick={pb.dismiss}
                aria-label="Close player"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/50 outline-none transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-4"
              >
                <X />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
