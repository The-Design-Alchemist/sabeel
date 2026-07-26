import { Settings } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ReaderSettings = {
  translation: boolean
  transliteration: boolean
  highlighting: boolean
}

type Props = {
  settings: ReaderSettings
  onChange: (patch: Partial<ReaderSettings>) => void
  /** Trigger button styling — defaults to white-on-dark (Qur'an reader header). */
  triggerClassName?: string
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = "setting-" + label.replace(/\s+/g, "-").toLowerCase()
  return (
    <div className="flex items-center justify-between py-3.5">
      <label htmlFor={id} className="text-[15px] font-medium text-ink">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function SettingsDialog({ settings, onChange, triggerClassName }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className={cn("text-white hover:bg-white/10", triggerClassName)}
        >
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-line">
          <Row
            label="English Translation"
            checked={settings.translation}
            onChange={(v) => onChange({ translation: v })}
          />
          <Row
            label="Transliteration"
            checked={settings.transliteration}
            onChange={(v) => onChange({ transliteration: v })}
          />
          <Row
            label="Word Highlighting"
            checked={settings.highlighting}
            onChange={(v) => onChange({ highlighting: v })}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
