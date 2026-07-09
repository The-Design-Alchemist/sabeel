import { useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react"
import { usePlayback } from "@/playback/PlaybackProvider"
import { springPress } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Floating "now playing" pill. Appears whenever a surah is loaded and the user has left the
 * reader — recitation keeps going, and this gives quick transport (prev / play-pause / next /
 * repeat) plus tap-to-return. Hidden on the reader itself (which has its own full controls).
 */
export function MiniPlayer() {
  const pb = usePlayback()
  const navigate = useNavigate()
  const location = useLocation()

  const onReader = location.pathname.startsWith("/surah/")
  const visible = pb.started && pb.surahId != null && !onReader

  const tap = { scale: 0.9, transition: springPress }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
          className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
        >
          <div className="flex items-center gap-1 rounded-full bg-teal-deep py-1.5 pl-1.5 pr-2 text-white shadow-[0_12px_34px_-8px_rgba(4,42,43,0.65)] ring-1 ring-white/10">
            {/* Play / Pause — primary */}
            <motion.button
              whileTap={tap}
              onClick={pb.togglePlay}
              aria-label={pb.playing ? "Pause recitation" : "Play recitation"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-teal-deep outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&_svg]:size-5"
            >
              {pb.playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </motion.button>

            {/* Title — tap to return to the reader */}
            <button
              onClick={() => navigate(`/surah/${pb.surahId}`)}
              aria-label={`Open ${pb.data?.englishName ?? "surah"}`}
              className="flex min-w-0 flex-col items-start px-2 text-left outline-none focus-visible:opacity-80"
            >
              <span className="max-w-[42vw] truncate text-[13px] font-semibold leading-tight sm:max-w-[220px]">
                {pb.data?.englishName ?? "Surah"}
              </span>
              <span className="text-[11px] leading-tight text-white/60 tabular-nums">
                Verse {pb.verseNum} of {pb.verses.length}
              </span>
            </button>

            {/* Transport */}
            <motion.button
              whileTap={tap}
              onClick={() => pb.goVerse(pb.verseIndex - 1)}
              disabled={pb.verseIndex === 0}
              aria-label="Previous verse"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-30 [&_svg]:size-[18px]"
            >
              <SkipBack className="fill-current" />
            </motion.button>
            <motion.button
              whileTap={tap}
              onClick={() => pb.goVerse(pb.verseIndex + 1)}
              disabled={pb.verseIndex >= pb.verses.length - 1}
              aria-label="Next verse"
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
