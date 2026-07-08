# Play Store listing — Sabeel (draft)

Draft copy + checklist for the Google Play listing. Review, tweak the voice, and fill the
placeholders before submitting. Character limits are Play Store maximums.

## App title (max 30 chars)
Pick one:
- `Sabeel — Qur'an Word by Word` (28)
- `Sabeel: Qur'an Reader` (21)
- `Sabeel — Learn the Qur'an` (25)

## Short description (max 80 chars)
`Read and hear the Qur'an with word-by-word highlighting — online or offline.` (75)

## Full description (max 4000 chars)
```
Sabeel is a calm, focused way to read and listen to the Qur'an — with every word
highlighted as it's recited, so you can follow along and learn.

• Word-by-word highlighting
Each word lights up in time with the recitation, making it easy to follow, memorise,
and improve your pronunciation.

• Beautiful, distraction-free reader
Clean Uthmani Arabic script with optional English translation and transliteration —
toggle whatever you want to see.

• Verse and segment navigation
Move verse by verse, or study longer verses broken into their natural waqf (pause)
segments.

• Listen online or offline
Surahs stream instantly when you're online. Tap "save for offline" to download a surah
to your device and listen anywhere — on a flight, on the metro, with no signal.

• Background & lock-screen playback
Keep listening with the screen off, and control playback right from your lock screen.

• Continue where you left off
Sabeel remembers your place and offers to resume.

• Private by design
No account, no ads, no tracking. Everything stays on your device.

Recitation by Mishary Rashid Alafasy.

May it be of benefit. 🤍
```

## Categorisation
- **Category:** Books & Reference (alt: Education)
- **Tags/keywords:** Quran, Qur'an, Koran, recitation, tajweed, word by word, offline Quran,
  Islam, Muslim, translation, transliteration
- **Content rating:** Everyone (complete the IARC questionnaire — no objectionable content)

## Data safety form (maps to docs/PRIVACY.md)
- **Does the app collect or share any user data?** No.
- **Data encrypted in transit?** Yes (audio is fetched over HTTPS).
- **Can users request data deletion?** N/A — no data is collected; users clear on-device data
  by clearing app storage / uninstalling.
- Note for the reviewer if asked: audio is served by a third-party CDN (jsDelivr) which may log
  standard request metadata (e.g. IP) to deliver files; the app itself collects nothing.

## Graphics assets to produce (before upload)
- [ ] **App icon** 512×512 (done — brand mark; export from `app/assets/icon-only.png`).
- [ ] **Feature graphic** 1024×500 (brand mark/wordmark on teal #042A2B).
- [ ] **Phone screenshots** ≥2 (recommended 4–8), e.g.: reader with word-highlight, the
      segment view, the Downloads screen, offline "Reading mode", lock-screen controls.
- [ ] (Optional) 7"/10" tablet screenshots if you list tablet support.

## Before submitting
- [ ] Host `docs/PRIVACY.md` at a public URL and paste it into the listing's Privacy Policy field.
- [ ] Fill the support email (listing + privacy policy).
- [ ] Confirm recitation + translation + Arabic-text **licensing/attribution** (see NEXT_STEPS.md §1).
- [ ] Upload the signed AAB (see `app/android/RELEASE.md`), start on the internal test track.
