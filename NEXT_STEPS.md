# Next steps — production-readiness roadmap

_Snapshot: 2026-07-08 · branch `production-hardening`. Full history: `PROJECT_STATUS.md`._

## Where we are
Sabeel runs natively on Android and the **offline audio pipeline is verified end-to-end on a real device** (Pixel 9a, Android 17):
- **Streaming** — open any surah online → streams + plays immediately; word-highlight tracks.
- **Save for offline** — the ⬇ in the reader (and the Downloads screen) saves a surah to the device (verified byte-exact on disk). Interrupted downloads now **resume** — a re-tap skips verses already saved instead of restarting.
- **Offline playback** — saved surahs play from local storage with the network fully off; word-highlight still works (timings are bundled).
- **Reading mode** — an offline + unsaved surah shows the "Reading mode" banner. Offline detection uses `@capacitor/network` (`navigator.onLine` is unreliable in the Android WebView — it stays `true` with the network down).
- **Lock screen / background audio** — media controls + background playback verified.

Audio is hosted (all 6,236 verses, AAC-LC 64k mono, 852 MB) in the public repo `The-Design-Alchemist/sabeel-audio` via jsDelivr; `CDN_BASE` lives in `app/src/lib/downloads.ts`.

Everything compiles; the **debug** APK builds (~15 MB) and is installed on the test device.

## ▶ Build / install
```bash
# install the current debug APK on a connected device
~/Library/Android/sdk/platform-tools/adb install -r \
  ~/Downloads/sabeel/app/android/app/build/outputs/apk/debug/app-debug.apk

# after changing code:
cd app && npm run build && npx cap sync android && \
  JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  android/gradlew -p android :app:assembleDebug
```

---

## What's left for production

### 1 · Release blockers — required to publish
- [ ] **Signed release build (AAB).** Today only a *debug* APK exists. Create a release keystore, add a signing config, enable R8/minify, bump `versionCode`, and build an Android App Bundle for the Play Store.
- [ ] **App icon + splash screen.** Both are Capacitor defaults — need a branded adaptive icon + splash.
- [ ] **Play Store listing.** Name, description, screenshots, feature graphic, content rating, and the Data-safety form.
- [ ] **Privacy policy.** Required (the app uses the network + on-device storage).
- [ ] **Content licensing & accuracy (Qur'an-specific — do not skip):**
  - [ ] Confirm redistribution rights + attribution for the **recitation** (Mishary Rashid Alafasy).
  - [ ] Confirm license + attribution for the **English translation**.
  - [ ] Confirm the **Arabic (Uthmani) text** source/license (e.g. Tanzil / KFGQPC) and get a scholarly **accuracy review** — text errors are unacceptable in a Qur'an app.

### 2 · Android quality — should fix before launch
- [ ] **Hardware back button** doesn't map to router history (back can exit the app instead of going Home). Wire `@capacitor/app` `backButton` to the router.
- [ ] **Test on more devices / OS versions.** Only verified on Pixel 9a / Android 17 — check `minSdkVersion`, older Android, smaller screens & densities.
- [ ] **Route restoration** is inconsistent (reopens to `/downloads` vs Home). Decide the intended cold-start screen.

### 3 · iOS — if targeting iOS (separate track)
- [ ] Not built. `npx cap add ios`, signing/provisioning, TestFlight, App Store review. (AAC was chosen for iOS audio compatibility, so the media path should port.)

### 4 · Post-launch polish — not blockers
- [ ] **Storage management** — show total space used + a "delete all"/manage view (currently per-surah delete only).
- [ ] **Robust bulk download** — a "download all" and/or background download (WorkManager / foreground service) so large saves survive the app being killed. (Re-tap resume already exists.)
- [ ] **Waqf segmentation coverage** — ~41% of verses are segmented; more strengthens the core segment-by-segment learning.
- [ ] **Analytics + crash reporting** (optional).
- [ ] jsDelivr → Cloudflare R2 if you outgrow CDN limits (`tools/AUDIO_HOSTING.md`).

## Quick reference
| | |
|---|---|
| Audio repo | `github.com/The-Design-Alchemist/sabeel-audio` (public) |
| CDN URL | `https://cdn.jsdelivr.net/gh/The-Design-Alchemist/sabeel-audio@main/NNN/NNNVVV.m4a` |
| Change CDN | `app/src/lib/downloads.ts` → `CDN_BASE` |
| Offline detection | `app/src/hooks/useOnline.ts` (uses `@capacitor/network`) |
| Device tested | Pixel 9a, Android 17 (`adb devices` for id) |
| JDK / SDK | Android Studio JBR · `~/Library/Android/sdk` |
| Re-compress audio | `python3 tools/pipeline/compress_audio.py --run` → `quran-data/audio-aac/` |
| Re-upload audio | push `quran-data/audio-aac` to the `sabeel-audio` repo |
| Push code branch | `git push origin production-hardening` |
