// Types + loader for the enhanced Qur'an data (quran-data/enhanced/NNN.json).

export interface EnhancedWord {
  arabic: string
  translation: string
  transliteration: string
}

export interface Segment {
  arabic: string
  translation: string
  transliteration?: string
  type: string
  waqfMark?: string | null
}

export interface WaqfMark {
  position: number
  character: string
  type: string
  wordIndex: number
}

export interface Verse {
  key: string
  arabic: string
  arabicSimple: string
  translation: string
  transliteration: string
  sajda: boolean
  waqfMarks: WaqfMark[]
  segments: Segment[] | null
  wordCount: number
  words: EnhancedWord[]
}

export interface SurahData {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelationType: string
  numberOfAyahs: number
  bismillahPre: boolean
  verses: Verse[]
}

// Resolves against the app base (Vite BASE_URL). In dev the data is symlinked into
// public/quran-data; in production it sits alongside the app under the same base.
const DATA_BASE = `${import.meta.env.BASE_URL}quran-data/`

export async function loadSurah(id: number): Promise<SurahData> {
  const num = String(id).padStart(3, "0")
  const res = await fetch(`${DATA_BASE}enhanced/${num}.json`)
  if (!res.ok) throw new Error(`Could not load Surah ${id} (${res.status})`)
  return res.json()
}

/** A verse is shown as multiple waqf segments only when it has 2+ of them. */
export function isSegmented(verse: Verse): boolean {
  return Array.isArray(verse.segments) && verse.segments.length > 1
}
