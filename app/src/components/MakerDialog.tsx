import { Heart, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/** One-time "about the maker" note, shown as a settings-style dialog the first time the user
 *  lands on Home (after onboarding). Any dismissal marks it acknowledged. */
export function MakerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[300px]">
        <DialogHeader>
          <span className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10">
            <Heart className="size-6 fill-red-500 text-red-500" />
          </span>
          <DialogTitle className="mt-1">A note from the maker</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Sabeel is built and maintained by one person. Every effort has gone toward accuracy, and
          the text is under scholarly review — but if you ever notice an error in a surah,
          translation, or timing, please tell me and it&rsquo;ll be fixed promptly.
        </p>
        <div className="rounded-xl bg-ground px-3.5 py-2.5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            For sources, credits, and how to get in touch, tap the{" "}
            <Info className="inline size-4 -translate-y-px text-teal" aria-label="info" /> icon at
            the top-left anytime.
          </p>
        </div>
        <Button onClick={onClose} className="mt-1 w-full">
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  )
}
