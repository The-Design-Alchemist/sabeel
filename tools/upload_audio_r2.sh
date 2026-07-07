#!/usr/bin/env bash
#
# upload_audio_r2.sh — push the compressed AAC corpus (quran-data/audio-aac, ~879 MB,
# 6,236 files) to a Cloudflare R2 bucket for the app's download-on-demand manager.
#
# Prereqs (one-time — see tools/AUDIO_HOSTING.md for the full walkthrough):
#   1. Create an R2 bucket (e.g. "sabeel-audio") in the Cloudflare dashboard.
#   2. R2 → Manage API Tokens → create a token → note the Access Key ID + Secret.
#   3. brew install rclone
#   4. export the four vars below, then run this script.
#
# Bucket layout after upload:  NNN/NNNVVV.m4a   (e.g. 002/002001.m4a)
# Served (via custom domain) at:  https://<your-domain>/NNN/NNNVVV.m4a
# → set CDN_BASE in app/src/lib/downloads.ts to  https://<your-domain>
#
set -euo pipefail

: "${R2_ACCOUNT_ID:?export R2_ACCOUNT_ID (Cloudflare account id)}"
: "${R2_ACCESS_KEY_ID:?export R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?export R2_SECRET_ACCESS_KEY}"
BUCKET="${R2_BUCKET:-sabeel-audio}"

SRC="$(cd "$(dirname "$0")/.." && pwd)/quran-data/audio-aac"
[ -d "$SRC" ] || { echo "✗ missing $SRC — run: python3 tools/pipeline/compress_audio.py --run"; exit 1; }

echo "Uploading $(find "$SRC" -name '*.m4a' | wc -l | tr -d ' ') files → r2://${BUCKET} …"
rclone copy "$SRC" ":s3:${BUCKET}" \
  --s3-provider Cloudflare \
  --s3-access-key-id "$R2_ACCESS_KEY_ID" \
  --s3-secret-access-key "$R2_SECRET_ACCESS_KEY" \
  --s3-endpoint "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --s3-no-check-bucket \
  --transfers 48 --checkers 48 --fast-list --progress

echo "✓ done. Files at r2://${BUCKET}/NNN/NNNVVV.m4a"
echo "  Next: connect a custom domain to the bucket, then set CDN_BASE in app/src/lib/downloads.ts"
