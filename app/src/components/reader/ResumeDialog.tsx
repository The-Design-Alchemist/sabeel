import { PlayCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatTimeAgo } from "@/lib/utils"

type Props = {
  open: boolean
  verse: number
  lastPlayed: number
  onContinue: () => void
  onStartOver: () => void
}

export function ResumeDialog({ open, verse, lastPlayed, onContinue, onStartOver }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onStartOver()}>
      <DialogContent className="text-center">
        <DialogHeader className="items-center">
          <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-ground text-teal">
            <PlayCircle className="size-7" />
          </div>
          <DialogTitle>Continue where you left off?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You were at <b className="text-ink">Verse {verse}</b> · {formatTimeAgo(lastPlayed)}
        </p>
        <div className="mt-2 flex gap-3">
          <Button variant="outline" className="h-11 flex-1 rounded-[14px]" onClick={onStartOver}>
            Start Over
          </Button>
          <Button className="h-11 flex-1 rounded-[14px]" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
