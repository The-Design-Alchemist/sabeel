# Next steps — resume here

_Snapshot: 2026-07-07 · branch `production-hardening` (local, **not pushed**). Full history: `PROJECT_STATUS.md`._

## Where we are
Sabeel runs **natively on Android** (built + launched on a Pixel 9a this session). What's new:
- Audio **compressed** to AAC-LC 64 kbps mono: **1.7 GB → 879 MB** (`quran-data/audio-aac/`, git-ignored). Durations preserved — max **10.5 ms** drift → word-timings/waqf segmentation stay locked.
- App switched to `.m4a`; **Al-Fatiha is bundled**, every other surah is **download-on-demand**.
- **Media notification + lock-screen controls + background audio** via `@capgo/capacitor-media-session`.
- **Download manager** built — `app/src/lib/downloads.ts` + Downloads screen (⬇ on Home; the reader's reading-mode strip links there). Compiles + builds into the APK, but **UNTESTED**: needs the CDN live + a device.

## ▶ Step 1 — host the audio on Cloudflare R2 (~15 min)
Full walkthrough: `tools/AUDIO_HOSTING.md`. Short version:
```bash
# In the Cloudflare dashboard: create R2 bucket "sabeel-audio" + an API token (Object Read & Write).
brew install rclone
export R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...
tools/upload_audio_r2.sh                      # uploads 879 MB → r2://sabeel-audio/NNN/NNNVVV.m4a
# Then: R2 → Settings → Public access → connect a custom domain (e.g. audio.sabeel.app).
# Finally set it in app/src/lib/downloads.ts:
#   export const CDN_BASE = "https://audio.sabeel.app"      // no trailing slash, no /audio
```

## ▶ Step 2 — rebuild + test on device
```bash
cd app
npm run build && npx cap sync android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  android/gradlew -p android :app:assembleDebug
~/Library/Android/sdk/platform-tools/adb install -r \
  android/app/build/outputs/apk/debug/app-debug.apk
```
Test checklist:
- [ ] Al-Fatiha plays and the **word-highlight still tracks** (validates the `.m4a` compression on-device).
- [ ] Downloads screen → **download a surah** → play it in **airplane mode** (offline).
- [ ] **Lock screen** shows media controls; audio continues with the screen off.
- [ ] Delete a downloaded surah → frees space + reverts to reading mode.
- [ ] Haptics feel Light; repeat button toggles gray↔teal (from earlier).

## Known gaps / not done
- Download manager is **untested** — the first real download may surface path / `convertFileSrc` / CORS issues to iron out.
- **iOS** not built yet (AAC was chosen specifically for iOS compatibility).
- Android **hardware back button** doesn't map to router history.
- **App icon / splash** are still the Capacitor defaults.
- Optional: a smaller **Opus** variant for Android — `python3 tools/pipeline/compress_audio.py --codec opus --bitrate 32k --run`, upload under an `opus/` prefix, branch on `Capacitor.getPlatform()`.

## Quick reference
| | |
|---|---|
| Device tested | **Pixel 9a, Android 17** (`adb devices` for the id) |
| JDK | Android Studio JBR: `/Applications/Android Studio.app/Contents/jbr/Contents/Home` |
| Android SDK | `~/Library/Android/sdk` (adb at `platform-tools/adb`) |
| Re-compress audio | `python3 tools/pipeline/compress_audio.py --run` → `quran-data/audio-aac/` |
| Set CDN URL | `app/src/lib/downloads.ts` → `CDN_BASE` |
| Push when ready | `git push -u origin production-hardening` |
| Plugins | `@capgo/capacitor-media-session`, `@capacitor/filesystem`, `@capacitor/{app,haptics,splash-screen,status-bar,android}` |
