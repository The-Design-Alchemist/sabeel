# Sabeel — v2 app (React rebuild)

The production rebuild of Sabeel. Being ported screen-by-screen from the original
vanilla app at the repo root; the **home / surah-list screen** is the first slice.

## Stack
- **Vite + React + TypeScript** — bundled, typed, tree-shaken (retires the old
  global `window.*` script-tag architecture).
- **Tailwind CSS v4 + shadcn/ui (Radix)** — accessible primitives; Sabeel's design
  tokens live in `src/index.css` (`@theme`), so components adopt the teal palette.
- **Self-hosted fonts** (`@fontsource` Urbanist + Noto Naskh Arabic) — no external
  CDN, works offline and inside the native WebView.
- **Capacitor** — `capacitor.config.ts` wraps the `dist/` build as iOS/Android.

## Accessibility baseline (track B)
Cards are real `<button>`s (keyboard-focusable), every control has a visible
`:focus-visible` ring, `prefers-reduced-motion` is honored, pinch-zoom is enabled
(the old app disabled it), secondary text meets WCAG AA contrast, and the search has
a proper label + the recents carousel exposes `progressbar`/paging semantics.

## Commands
```bash
npm install
npm run dev       # dev server (HMR)
npm run build     # type-check + production build -> dist/
npm run preview   # serve the production build
```

## Mobile (next phase)
```bash
npm run build
npx cap add ios        # needs Xcode
npx cap add android    # needs Android Studio
npx cap sync
```
Haptics/notifications are wired via `src/hooks/useHaptics.ts` (no-ops on web, fires
the native Taptic engine on device) — extend with `@capacitor/local-notifications`
etc. in the mobile phase.

## Structure
- `src/data/surahs.ts` — all 114 surahs (generated from the original data)
- `src/pages/Home.tsx` — the home screen
- `src/components/` — `SurahCard`, `RecentCard`, `RecentSection`, `Logo`, `ui/*` (shadcn)
- `src/hooks/` — `useRecents`, `useHaptics`
