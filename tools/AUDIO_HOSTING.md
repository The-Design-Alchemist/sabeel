# Audio hosting — Cloudflare R2 (download-on-demand)

The app bundles only Al-Fatiha; every other surah is downloaded on demand from a CDN.
We host the compressed AAC corpus (`quran-data/audio-aac`, ~879 MB, 6,236 `.m4a` files)
on **Cloudflare R2** (free tier: 10 GB storage, and **zero egress fees**).

## 1. Build the corpus (if not already)
```bash
python3 tools/pipeline/compress_audio.py --run     # → quran-data/audio-aac (~879 MB)
```

## 2. Create the bucket + API token (Cloudflare dashboard)
1. **R2 → Create bucket** → name it `sabeel-audio` (any name; the script defaults to this).
2. **R2 → Manage R2 API Tokens → Create API token** → *Object Read & Write* → create.
   Copy the **Access Key ID**, **Secret Access Key**, and your **Account ID** (in the R2 URL / overview).

## 3. Upload
```bash
brew install rclone
export R2_ACCOUNT_ID=xxxxxxxx
export R2_ACCESS_KEY_ID=xxxxxxxx
export R2_SECRET_ACCESS_KEY=xxxxxxxx
# export R2_BUCKET=sabeel-audio   # only if you named it differently
tools/upload_audio_r2.sh
```
Uploads `NNN/NNNVVV.m4a` to the bucket root (48 parallel transfers; a few minutes).

## 4. Make it publicly readable
Two options:
- **Custom domain (recommended, production):** R2 bucket → *Settings → Public access → Connect
  Domain* → e.g. `audio.sabeel.app` (must be a domain on your Cloudflare account). Gives a clean,
  CDN-cached, unmetered URL: `https://audio.sabeel.app/NNN/NNNVVV.m4a`.
- **r2.dev URL (quick, dev only):** enable the managed `*.r2.dev` public URL. Rate-limited and
  not meant for production, but fine for first tests.

## 5. CORS (only needed for browser *streaming*, not native download)
Native downloads (`@capacitor/filesystem`) don't hit CORS. If you later stream from the WebView
(`<audio src>` = the CDN URL), add a bucket CORS rule allowing `GET` from `https://localhost`
(Android) / `capacitor://localhost` (iOS), or `*` for the audio bucket.

## 6. Point the app at it
In `app/src/lib/downloads.ts`:
```ts
export const CDN_BASE = "https://audio.sabeel.app"   // ← your R2 domain (no trailing slash, no /audio)
```
Files resolve as `${CDN_BASE}/NNN/NNNVVV.m4a`. Rebuild (`npm run build && npx cap sync android`) and test a download on device.

## Notes
- License: the EveryAyah Alafasy audio is **CC-BY-NC** — fine to self-host for a free app *with
  attribution*; re-license before monetizing.
- To also serve a smaller **Opus** variant for Android later:
  `python3 tools/pipeline/compress_audio.py --codec opus --bitrate 32k --run` → upload
  `quran-data/audio-opus` under an `opus/` prefix and branch on `Capacitor.getPlatform()`.
