# Audio hosting — Cloudflare R2 (download-on-demand)

The app bundles only Al-Fatiha; every other surah is streamed or downloaded on demand from a CDN.
We host the compressed AAC corpus (`quran-data/audio-aac`, **838 MB**, 6,236 `.m4a` files) on
**Cloudflare R2**.

> **Why not jsDelivr.** The app shipped on jsDelivr first because it needed no setup. But
> jsDelivr's terms discourage using it as bulk file storage, and a traffic spike can get a repo
> throttled or blocked — which breaks streaming *and* downloads for every user at once. Worse,
> `CDN_BASE` is compiled into the app, so shipped builds keep pointing at the dead URL until users
> update. There is no fix that reaches existing installs. R2 is purpose-built for this.

## What it costs

R2's free tier is permanent and monthly: **10 GB storage, 1M Class A (write) ops, 10M Class B
(read) ops, and $0.00 egress at any volume.** Against this corpus:

| | Sabeel uses | Free allowance |
|---|---|---|
| Storage | 838 MB | 10 GB (8% used) |
| Initial upload | 6,236 writes, one time | 1M/month |
| Playback | 1 read per verse fetched | 10M/month |

10M reads/month is roughly **1,600 complete Qur'an downloads** or **~180,000 surah listens**.
Past that, reads are $0.36/million — ~38M requests in a month to reach $10. Egress stays $0
regardless, which is the whole point: 838 GB of transfer costs ~$75 on S3 and nothing here.

> ⚠️ Cloudflare asks for a payment method to enable R2 even when you stay inside the free tier.
> Set a billing alert once it's on.

## 1. Build the corpus (if not already)
```bash
python3 tools/pipeline/compress_audio.py --run     # → quran-data/audio-aac (838 MB)
```

## 2. Create the bucket + API token (Cloudflare dashboard)
1. **R2 → Create bucket** → name it `sabeel-audio` (any name; the script defaults to this).
   Location **Automatic** is right — a custom domain serves through Cloudflare's edge anyway.
2. **R2 → Manage R2 API Tokens → Create API token** → permission **Object Read & Write**.
   Scope it to just this bucket rather than the whole account.
   Copy the **Access Key ID** and **Secret Access Key** — the secret is shown *once* — plus your
   **Account ID** from the R2 overview page.

## 3. Upload
```bash
brew install rclone
export R2_ACCOUNT_ID=xxxxxxxx
export R2_ACCESS_KEY_ID=xxxxxxxx
export R2_SECRET_ACCESS_KEY=xxxxxxxx
# export R2_BUCKET=sabeel-audio   # only if you named it differently
tools/upload_audio_r2.sh
```
Uploads `NNN/NNNVVV.m4a` to the bucket root, 48 parallel transfers. Expect 10–30 minutes
depending on your upload bandwidth. The script is resumable — rerun it and rclone skips files
already present, so an interrupted upload is not a restart.

## 4. Connect a custom domain (required for production)
R2 bucket → **Settings → Public access → Custom Domains → Connect Domain** → e.g.
`audio.yourdomain.com`. The domain must be on your Cloudflare account; Cloudflare creates the DNS
record for you. Serves at `https://audio.yourdomain.com/NNN/NNNVVV.m4a`, CDN-cached, no egress fee.

> The managed `*.r2.dev` URL needs no domain but is **rate-limited and explicitly not for
> production** — using it at launch recreates the same fragility as jsDelivr. Fine for a first
> smoke test only.

## 5. CORS — REQUIRED, not optional
An earlier version of this doc called CORS optional. It isn't. The app **streams** by setting
`<audio src>` to the CDN URL from inside the WebView, which is a cross-origin request. Native
downloads via `@capacitor/filesystem` bypass CORS, so a missing rule fails in a confusing way:
saved surahs play, streaming silently doesn't.

R2 bucket → **Settings → CORS Policy → Edit**:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["range", "content-type"],
    "ExposeHeaders": ["content-length", "content-range", "accept-ranges", "content-type"],
    "MaxAgeSeconds": 86400
  }
]
```

`"*"` is appropriate here: the bucket is public, read-only Qur'an audio with nothing sensitive in
it, and pinning exact origins across the Android WebView (`https://localhost`), iOS
(`capacitor://localhost`) and the Vite dev server is a recurring source of breakage.

**The `ExposeHeaders` entries are load-bearing.** Word-level seeking and waqf-segment looping issue
HTTP range requests; without `content-range` and `accept-ranges` exposed, the browser can't seek
and playback restarts from zero instead of jumping to the tapped word.

## 6. Point the app at it
In `app/src/lib/downloads.ts`:
```ts
export const CDN_BASE = "https://audio.yourdomain.com"  // no trailing slash, no /audio
```
Files resolve as `${CDN_BASE}/NNN/NNNVVV.m4a`. Then:
```bash
cd app && npm run build && npx cap sync android
```
and re-test on device: **stream** a surah you haven't saved, **download** one, then turn wifi off
(not just airplane mode) and confirm it still plays.

## 7. After cutover
Leave the `sabeel-audio` GitHub repo up for a while — it costs nothing and is a one-line rollback
if anything is wrong with the R2 setup. Retire it once a release has been live and healthy.

Also update the jsDelivr references in `NEXT_STEPS.md`, `PROJECT_STATUS.md`, `docs/PRIVACY.md`
(the "Network use" section names the CDN provider) and `docs/STORE_LISTING.md` (the data-safety
notes).

## Notes
- License: the EveryAyah Alafasy audio is **CC-BY-NC** — fine to self-host for a free app *with
  attribution*; re-license before monetizing.
- To also serve a smaller **Opus** variant for Android later:
  `python3 tools/pipeline/compress_audio.py --codec opus --bitrate 32k --run` → upload
  `quran-data/audio-opus` under an `opus/` prefix and branch on `Capacitor.getPlatform()`.
