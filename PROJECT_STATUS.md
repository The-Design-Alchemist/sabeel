# Sabeel — Project Status & Work Log

_Last updated: 2026-07-07 · Branch: `production-hardening` (24 commits, **not** merged to `main`)_

Sabeel is a Qur'an learning app whose core idea is breaking recitation into **waqf**
(pause) segments — Surah → Verse → Waqf segment — with word-by-word audio highlighting.

This document records everything done in this effort: a full audit, a repair of the
data foundation, critical fixes to the original app, and a v2 rebuild in React that is
heading to native iOS/Android.

---

## 1. TL;DR — where things stand

- **Original app** (`/`): a vanilla HTML/CSS/JS PWA on GitHub Pages. Still the live site; untouched on `main`.
- **This effort**, all on branch `production-hardening`:
  1. **Audited** the whole product (code + data + domain research).
  2. **Repaired the data foundation** — real audio timings, complete waqf segmentation, fixed text corruption. This data is shared by both the old and new app.
  3. **Fixed the original app's P0 bugs** (offline install, crashes, broken play button).
  4. **Started the v2 rebuild** in `app/` — a React app. **Home and Reader screens are done**, with word-by-word highlighting, segment navigation, audio, and the native device foundation.
- **Direction:** ship as a **native iOS/Android app via Capacitor** (no PWA). Audio will be **download-on-demand** for offline use.
- Nothing is deployed/merged yet — all work is on the branch for review.

**Audit report (visual):** the strategic audit + roadmap lives in its own report — see the Claude artifact titled _"Sabeel: from prototype to a production Qur'an app."_

---

## 2. The audit (what we found)

Verified against the code and data (not inferred):

- **Word timings were 100% fake** — every verse's per-word times were `duration ÷ wordCount`, evenly spaced. Highlighting drifted from the recitation; segmentation had to be ear-tuned. → **Fixed** (§3).
- **Segmentation was ~41% done**, but the "remaining 59%" was mostly an illusion: short verses need no split, and Sabeel's waqf marks are **identical to the canonical Tanzil text** (4,366 = 4,366), so the "1,444 verses need a source" premise was wrong. Only 69 verses genuinely needed segmenting. → **Fixed** (§3).
- **The offline layer was silently broken** — the service worker never installed. → **Fixed** (§4).
- **Text corruption** — 56 Qur'an words had a letter replaced by a `U+FFFD` replacement box from a bad encoding round-trip. → **Fixed** (§3).
- **Prototype-grade architecture** — global `window.*` singletons, no build/tests, duplicate script tags. → Addressed by the **v2 rebuild** (§5).

Domain research (adversarially fact-checked) confirmed: Capacitor is the right mobile path; `cpfair/quran-align` (CC-BY 4.0) has real timings for Sabeel's exact recitation; the EveryAyah audio is **CC-BY-NC** (re-license before monetising); Malaysia legally requires Qur'an-app certification.

---

## 3. Data foundation fixes (`quran-data/`, shared by both apps)

All reproducible via scripts in **`tools/pipeline/`**.

| Fix | What | Result |
| --- | --- | --- |
| **Real timings** | Imported `cpfair/quran-align` (CC-BY 4.0) per-word timings for the Alafasy recitation Sabeel ships | **6,227 / 6,236** verses now have real alignment (was 0); 2,564 segment boundaries recomputed. `import_timings.py` |
| **Segmentation complete** | Segmented the 69 remaining pause-marked verses; verified Sabeel's marks == Tanzil's | **All 2,640 pause-marked verses** are segmented. `derive_segments.py`, `merge_segments.py` |
| **Corruption repair** | Restored 56 `U+FFFD`-corrupted words using Sabeel's own clean lexicon + Tanzil verification | **0** corrupt chars remain; all 228 JSON files valid. `repair_corruption.py` |
| **Consistency** | Reconciled dropped waqf marks, over-split verses (2:19), null-timing mismatches (18:1, 69:28), embedded-saktah words (2:245, 7:69) | Corpus validates with **0** inconsistencies. `normalize_segments.py` |

**Pipeline tools** (`tools/pipeline/`, dry-run by default, validated): `import_timings.py`,
`derive_segments.py`, `merge_segments.py`, `repair_corruption.py`, `normalize_segments.py`.

---

## 4. Original app P0 fixes (`/`, on the branch)

The old vanilla app was repaired so it works if kept as the web version:

- **Service worker now installs** — relocated to app root, computed `BASE_PATH`, resilient precache (was 404-ing and aborting).
- Removed **duplicate `<script>` tags / double-init** in `index.html`.
- Fixed the **`showFullVerse` crash** + double-render.
- Fixed the **Start button** (it called an undefined `playRecitation()` and threw).
- Made manifest + asset paths **portable** (not pinned to `/sabeel/`).
- Added a **data-version cache check** so redeploys aren't masked by stale `localStorage`.

All verified in-browser: 0 console errors on a clean load.

---

## 5. The v2 app (`app/`)

A ground-up React rebuild. **34 files, ~3,000 lines.**

### Stack
- **Vite + React + TypeScript** (bundled, typed; retires the `window.*` globals).
- **Tailwind CSS v4 + shadcn/ui (Radix)** — design tokens mapped to Sabeel's teal palette in `src/index.css`.
- **Motion** (the library) — a principled motion system following **Emil Kowalski's** design-engineering skill (installed under `.claude/skills/`).
- **Self-hosted fonts** (Urbanist + Noto Naskh Arabic) — bundled, offline-ready.
- **Capacitor** — configured (`capacitor.config.ts`, appId `in.sabeel.app`) for the native build.
- **HashRouter** — works on any host + inside the native WebView.

### Screens

**Home** (`src/pages/Home.tsx`)
- All 114 surahs in a searchable grid (by name / number / meaning), recents carousel with reading progress, the Sabeel wordmark.
- Cards are real `<button>`s (keyboard-accessible); springy hover/press motion; staggered entrance.

**Reader** (`src/pages/Reader.tsx`) — feature-complete for the core experience:
- **Bismillah start screen** with the signature pulsing half-circle "Start Recitation" button.
- **Lean centered header** — `سُورَة {name} │ English / meaning`, back, settings.
- **Audio controls** — Start Over / Play-Pause / Repeat; labelled pills on desktop, **circular icon buttons on mobile**.
- **Verse display** — RTL Noto Naskh Arabic, the traditional `۝` **ayah-rosette** with Arabic-Indic digits, ornamental dividers, transliteration + translation.
- **Word-by-word highlighting** synced to the real audio timings via a `requestAnimationFrame` loop, with a smooth color glide + **click-a-word-to-seek**.
- **Waqf segment navigation** — Part x/y dots; auto-advances as playback crosses boundaries.
- **Verse navigation** — prev/next + an accessible Radix verse picker.
- **Settings** — translation / transliteration / word-highlighting toggles (persisted).
- **Media Session** — lock-screen / headphone / notification transport controls + now-playing metadata.
- **Resume prompt** — "Continue where you left off?" with the saved verse + time.
- **Repeat mode** with a "Repeat mode on/off" notification strip.

### Accessibility baseline
Real `<button>`s, visible focus rings, ARIA labels + progressbar/paging semantics, `prefers-reduced-motion` honored (via `<MotionConfig reducedMotion="user">`), pinch-zoom enabled, secondary text darkened to WCAG AA.

### Native device foundation
- `src/lib/native.ts` — tints the status bar to the teal header + hides the splash on native (no-op on web).
- **Haptics** wired into verse/segment/play interactions (`useHaptics`, fires the Taptic engine on device).
- **Safe-area insets** for notch + home indicator.

### How to run it (dev)
```bash
cd app
npm install
npm run dev      # http://localhost:5173  (add --host to reach it from your phone on the same Wi-Fi)
npm run build    # type-check + production build → dist/
```
_Dev note: the app reads data from `app/public/quran-data` which is **symlinked** to the repo's `quran-data` (JSON + audio) and gitignored. For a real deploy the data must be hosted (see §6)._

---

## 6. What's next

**Mobile / native (chosen direction — download-on-demand audio, no PWA):**

_Done (2026-07-07 session):_
- ✅ **Native Android app** — `app/android/` (Capacitor, appId `in.sabeel.app`); built & run on device (Pixel 9a, Android 17). ~15 MB APK.
- ✅ **Media notification + lock-screen controls + background audio** — `@capgo/capacitor-media-session` (`mediaPlayback` foreground service); replaces the web MediaSession API, which the Android WebView does **not** surface as a system notification.
- ✅ **Audio compressed** — AAC-LC 64 kbps mono, **1.7 GB → 879 MB (−48%)**, durations preserved (max drift 10.5 ms → word-timings/waqf segmentation intact). `tools/pipeline/compress_audio.py`.
- ✅ **Audio hosted + streaming** — corpus pushed to the public repo `The-Design-Alchemist/sabeel-audio`, served via **jsDelivr** (`CDN_BASE` set, verified byte-exact). App **streams by default** when online, with **save-for-offline** per surah (`@capacitor/filesystem`) + a Downloads screen; offline+unsaved → reading mode. _Pending on-device validation._

_Remaining:_
- **On-device validation:** streaming playback + `.m4a` highlight sync, save-for-offline then airplane-mode playback, background audio, notification controls.
- **iOS** build (AAC was chosen for iOS compatibility); Android hardware back-button → router history; custom app icon/splash (currently Capacitor defaults).
- **Local notifications** — reading / memorization reminders. Store compliance (Apple 4.2, signing).
- If it outgrows jsDelivr: migrate hosting to **Cloudflare R2** (`tools/AUDIO_HOSTING.md`) — re-upload + change `CDN_BASE`.

**App completeness:**
- The **cutover** — deploy `app/` as the site + host the data for real (retire the dev symlink); decide the old vanilla app's fate.
- Reciter / font settings; Surah 9 (no-bismillah) edge case.

**Product (later):** memorization (spaced repetition over waqf segments, hide-and-reveal, A–B loop), accounts + cross-device sync, multi-reciter / translation / tafsir.

**Housekeeping:** push the branch to the remote (back up); tests + CI; re-license the audio before monetising (EveryAyah is CC-BY-NC).

---

## 7. Key decisions

- **Native, not PWA** — ship iOS/Android via Capacitor; skip service worker / web-install / web-offline. The offline-audio need is met by a native download manager instead.
- **Download-on-demand audio** — best native offline UX; download per surah to device storage.
- **Rebuild in React** (Vite + TS + Tailwind + shadcn/Radix + Motion + Capacitor) rather than patch the vanilla app — better foundation for mobile + maintainability.
- **Motion** follows Emil Kowalski's principles (fast, spring-based, transform-only, interruptible, reduced-motion-aware).

---

## 8. Commit ledger (this session, on `production-hardening`)

| # | Commit | |
| --- | --- | --- |
| 1 | `336a326` | data: real cpfair word timings (replace fabricated) |
| 2 | `1f9b610` | fix(P0): PWA install, double-render, verse crash, play action |
| 3 | `abe4818` | data: segment the 69 remaining pause-marked verses |
| 4 | `db0eb12` | data: repair U+FFFD text corruption (56 words) |
| 5 | `0a70368` | data: reconcile pre-existing segment inconsistencies |
| 6 | `c56c753` | fix: version-check the localStorage data cache |
| 7 | `6000f7f` | data: keep words whole at embedded saktah (2:245, 7:69) |
| 8 | `4bbdfb1` | feat(app): v2 React rebuild — home/surah-list slice |
| 9 | `4c666ec` | feat(app): principled motion system (Motion) |
| 10 | `d63b741` | feat(app): install Emil Kowalski motion skill + apply review |
| 11 | `5e7ea7b` | feat(app): port the reader screen |
| 12 | `cff116a` | fix(app): rebuild the reader to match the original design |
| 13 | `cf95c2f` | feat(app): word-by-word highlighting synced to audio |
| 14 | `d41ffd2` | polish(app): lean reader header + bismillah wrap fix |
| 15 | `75e32f7` | polish(app): center title, ayah rosette, bismillah spacing |
| 16 | `8c81027` | feat(app): Media Session + resume prompt |
| 17 | `25e6265` | polish(app): mobile reader layout + repeat notification |
| 18 | `4f65283` | feat(app): native device foundation (status bar/splash, haptics, safe areas) |
