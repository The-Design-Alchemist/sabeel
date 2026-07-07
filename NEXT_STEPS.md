# Next steps — resume here

_Snapshot: 2026-07-07 · branch `production-hardening` (local, **not pushed**). Full history: `PROJECT_STATUS.md`._

## Where we are
Sabeel runs **natively on Android**, and the audio is **live — hosted and streaming**:
- **Audio hosted:** all 6,236 verses (AAC-LC 64k mono, 852 MB) are in the public repo **`The-Design-Alchemist/sabeel-audio`**, served via the **jsDelivr CDN** (verified byte-exact across the corpus). `CDN_BASE` in `app/src/lib/downloads.ts` already points at it.
- **Streaming model:** open any surah → it **streams and plays immediately** when online; a **"save for offline" ⬇** button in the reader header downloads that surah to the device (then it plays locally / works offline). A Downloads screen handles bulk management. Offline + unsaved → reading mode.
- **Media notification + lock-screen controls + background audio** (`@capgo/capacitor-media-session`).
- Compression preserved timings (max **10.5 ms** drift → highlight/segmentation intact).

**Everything compiles + the APK builds (15 MB). The only remaining work is on-device testing.**

## ▶ Test on device (reconnect the phone via USB)
```bash
~/Library/Android/sdk/platform-tools/adb install -r \
  ~/Downloads/sabeel/app/android/app/build/outputs/apk/debug/app-debug.apk
```
(If you changed code first: `cd app && npm run build && npx cap sync android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" android/gradlew -p android :app:assembleDebug`)

Checklist:
- [ ] Open **Al-Baqarah** (or any non-Fatiha surah) while online → audio **streams + plays**, word-highlight tracks.
- [ ] Tap the **⬇ in the reader header** → downloads (progress) → becomes ✓. Then **airplane mode** → still plays (offline).
- [ ] **Lock screen** shows media controls; audio continues with the screen off.
- [ ] Al-Fatiha still works (bundled); haptics Light; repeat toggles gray↔teal.

## Known gaps / not done
- **iOS** not built (AAC was chosen for iOS compatibility).
- Android **hardware back button** doesn't map to router history.
- **App icon / splash** are Capacitor defaults.
- **jsDelivr** is great for small scale; if you outgrow it, migrate to **Cloudflare R2** (`tools/AUDIO_HOSTING.md`) — re-upload + change one line (`CDN_BASE`).
- Optional smaller **Opus** variant for Android (`compress_audio.py --codec opus --bitrate 32k --run`).

## Quick reference
| | |
|---|---|
| Audio repo | `github.com/The-Design-Alchemist/sabeel-audio` (public) |
| CDN URL | `https://cdn.jsdelivr.net/gh/The-Design-Alchemist/sabeel-audio@main/NNN/NNNVVV.m4a` |
| Change CDN | `app/src/lib/downloads.ts` → `CDN_BASE` |
| Device tested | Pixel 9a, Android 17 (`adb devices` for id) |
| JDK / SDK | Android Studio JBR · `~/Library/Android/sdk` |
| Re-compress audio | `python3 tools/pipeline/compress_audio.py --run` → `quran-data/audio-aac/` |
| Re-upload audio | push `quran-data/audio-aac` to the `sabeel-audio` repo |
| Push code branch | `git push -u origin production-hardening` |
