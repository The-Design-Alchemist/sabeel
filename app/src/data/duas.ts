// Types + loader for the Duas section. Same shape as the Qur'an data: static category
// metadata here, dua bodies fetched from bundled JSON under public/dua-data/ (offline).

export interface Dua {
  id: string
  /** Human-readable source, e.g. "Sūrah al-Aʿrāf · 7:23" or "Ṣaḥīḥ al-Bukhārī 6306". */
  reference: string
  arabic: string
  transliteration: string
  translation: string
  /** How many times it is recited, when the source specifies it. */
  repeat?: number
  /** Optional per-dua audio URL (fast-follow; unused at launch). */
  audio?: string
  source?: "quran" | "sunnah"
}

export interface DuaTopic {
  id: string
  name: string
  /** Romanized Arabic label, e.g. "Istighfār & Tawbah". */
  arabicName: string
  duas: Dua[]
}

export interface DuaCategory {
  id: string
  name: string
  description: string
  /** Pastel card colour from the design. */
  color: string
  /** Whether curated content ships for this category yet. */
  available: boolean
}

// The five thematic categories (names, blurbs, and card colours per the Figma design).
export const DUA_CATEGORIES: DuaCategory[] = [
  {
    id: "connection-with-allah",
    name: "Connection with Allah",
    description: "Seeking forgiveness, faith, guidance, gratitude, and sincerity.",
    color: "#d7e8cc",
    available: true,
  },
  {
    id: "inner-peace-strength",
    name: "Inner Peace & Strength",
    description: "Emotional balance, patience, and courage through hardship.",
    color: "#e3dbf6",
    available: false,
  },
  {
    id: "protection-safety",
    name: "Protection & Safety",
    description: "Seeking Allah's shield from harm — physical, spiritual, and unseen.",
    color: "#bfd9f2",
    available: false,
  },
  {
    id: "provision-success",
    name: "Provision & Success",
    description: "For sustenance, work, studies, wisdom, and blessings in daily life.",
    color: "#fff3c9",
    available: false,
  },
  {
    id: "daily-life-routine",
    name: "Daily Life & Routine",
    description: "Everyday duas that bring mindfulness into daily habits.",
    color: "#c8f1ed",
    available: false,
  },
]

export function duaCategory(id: string): DuaCategory | undefined {
  return DUA_CATEGORIES.find((c) => c.id === id)
}

const DATA_BASE = `${import.meta.env.BASE_URL}dua-data/`

/** Load a category's topics + duas from its bundled JSON. */
export async function loadDuaCategory(id: string): Promise<{ topics: DuaTopic[] }> {
  const res = await fetch(`${DATA_BASE}${id}.json`)
  if (!res.ok) throw new Error(`Could not load duas for ${id} (${res.status})`)
  return res.json()
}
