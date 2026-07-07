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

// ---- audio timing data (complete-timings/surah_NNN_complete.json) ----
// Real per-word start/end seconds (cpfair alignment) + per-segment ranges.

export interface TimingWord {
  word: string
  start: number
  end: number
}

export interface TimingSegment {
  segmentNumber: number
  start: number
  end: number
  startWord: number
  endWord: number
  wordCount: number
  type: string
  waqfMark: string | null
}

export interface TimingVerse {
  surahNumber: number
  verseNumber: number
  duration: number
  words: TimingWord[]
  segments: TimingSegment[] | null
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

export async function loadTimings(id: number): Promise<TimingVerse[]> {
  const num = String(id).padStart(3, "0")
  const res = await fetch(`${DATA_BASE}complete-timings/surah_${num}_complete.json`)
  if (!res.ok) throw new Error(`Could not load timings for Surah ${id} (${res.status})`)
  return res.json()
}

export function audioUrl(surah: number, verse: number): string {
  const sss = String(surah).padStart(3, "0")
  const aaa = String(verse).padStart(3, "0")
  return `${DATA_BASE}audio/${sss}/${sss}${aaa}.m4a`
}

// Which surahs' recitation audio ships INSIDE the app bundle. Only Al-Fatiha is bundled
// (the full corpus can't be); the rest are download-on-demand. Keep in sync with
// BUNDLED_SURAHS in vite.config.ts. Offline availability = bundled ∪ downloaded-to-device —
// see isAvailableOffline() in lib/downloads.ts.
const BUNDLED_AUDIO = new Set([1])

/** True when this surah's audio ships inside the app bundle (currently just Al-Fatiha). */
export function isBundledAudio(surah: number): boolean {
  return BUNDLED_AUDIO.has(surah)
}

/** A verse is shown as multiple waqf segments only when it has 2+ of them. */
export function isSegmented(verse: Verse): boolean {
  return Array.isArray(verse.segments) && verse.segments.length > 1
}
