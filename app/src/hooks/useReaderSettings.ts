import { useState } from "react"
import type { ReaderSettings } from "@/components/reader/SettingsDialog"

const KEY = "sabeel_settings"

export const DEFAULT_SETTINGS: ReaderSettings = {
  translation: true,
  transliteration: true,
  highlighting: true,
}

function load(): ReaderSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/**
 * Reader display preferences (translation / transliteration / word highlighting), persisted
 * to localStorage and shared between the Qur'an reader and the Dua reader.
 */
export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(load)
  const update = (patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable — keep in-memory only */
      }
      return next
    })
  }
  return [settings, update] as const
}
