#!/usr/bin/env python3
"""
compress_audio.py — re-encode the recitation corpus to a smaller, timing-safe format for
download-on-demand hosting (Cloudflare R2) + the bundled Al-Fatiha.

Source: quran-data/audio/NNN/NNNVVV.mp3   (MP3 44.1k STEREO ~128 kbps, ~1.6 GB)
Output: quran-data/audio-<codec>/NNN/NNNVVV.<ext>

Default target: AAC-LC 64 kbps MONO (.m4a) — universal on iOS + Android, transparent for a
single voice, and DURATION-PRESERVING so the cpfair word-timings and waqf segmentation still
line up. This script re-verifies that: for every file it compares source vs output duration
and FLAGS anything drifting past --drift-ms, so a bad encode can't silently desync the
highlighting.

Dry-run by default; pass --run to encode. Examples:
  python3 tools/pipeline/compress_audio.py --surah 1 --run          # just Al-Fatiha (sample)
  python3 tools/pipeline/compress_audio.py --run                    # whole corpus
  python3 tools/pipeline/compress_audio.py --codec opus --bitrate 32k --run   # Android-only variant
"""
import argparse
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC_DIR = os.path.join(ROOT, "quran-data", "audio")

# -movflags +faststart puts the moov atom up front so the CDN can stream/progressive-download.
CODECS = {
    "aac": {"enc": "aac", "ext": "m4a", "extra": ["-movflags", "+faststart"]},
    "opus": {"enc": "libopus", "ext": "opus", "extra": []},
    "mp3": {"enc": "libmp3lame", "ext": "mp3", "extra": []},
}


def duration(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nk=1:nw=1", path],
            capture_output=True, text=True,
        )
        return float(out.stdout.strip())
    except (ValueError, subprocess.SubprocessError):
        return None


def encode(job):
    src, dst, enc, bitrate, extra = job
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src, "-ac", "1",
           "-c:a", enc, "-b:a", bitrate, *extra, dst]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return (src, "ENCODE_FAIL", r.stderr.strip()[:160], 0, 0)
    ds, dd = duration(src), duration(dst)
    drift_ms = abs((ds or 0) - (dd or 0)) * 1000
    return (src, "OK", drift_ms, os.path.getsize(src), os.path.getsize(dst))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--codec", default="aac", choices=CODECS.keys())
    ap.add_argument("--bitrate", default="64k")
    ap.add_argument("--surah", type=int, help="only this surah (1-114); default = all")
    ap.add_argument("--run", action="store_true", help="actually encode (else dry-run)")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    ap.add_argument("--drift-ms", type=float, default=50.0,
                    help="flag a file if |src-dst duration| exceeds this (timing safety)")
    args = ap.parse_args()

    c = CODECS[args.codec]
    out_dir = os.path.join(ROOT, "quran-data", f"audio-{args.codec}")
    surahs = [f"{args.surah:03d}"] if args.surah else sorted(os.listdir(SRC_DIR))

    jobs = []
    for s in surahs:
        sdir = os.path.join(SRC_DIR, s)
        if not os.path.isdir(sdir):
            continue
        for fn in sorted(os.listdir(sdir)):
            if fn.endswith(".mp3"):
                src = os.path.join(sdir, fn)
                dst = os.path.join(out_dir, s, fn[:-4] + "." + c["ext"])
                jobs.append((src, dst, c["enc"], args.bitrate, c["extra"]))

    print(f"codec={args.codec} bitrate={args.bitrate} mono  →  {os.path.relpath(out_dir, ROOT)}")
    print(f"files={len(jobs)}  jobs={args.jobs}  mode={'RUN' if args.run else 'DRY-RUN'}")
    if not args.run:
        print("(dry-run — pass --run to encode)")
        return

    src_total = dst_total = done = 0
    flagged = []
    max_drift = 0.0
    with ProcessPoolExecutor(max_workers=args.jobs) as ex:
        for fut in as_completed([ex.submit(encode, j) for j in jobs]):
            src, status, note, ssz, dsz = fut.result()
            done += 1
            src_total += ssz
            dst_total += dsz
            if status != "OK":
                flagged.append((src, status, str(note)))
            else:
                max_drift = max(max_drift, note)
                if note > args.drift_ms:
                    flagged.append((src, "DRIFT", f"{note:.1f}ms"))
            if done % 250 == 0:
                print(f"  {done}/{len(jobs)}…")

    print(f"\ndone: {done} files")
    if src_total:
        print(f"size: {src_total/1e6:.1f} MB → {dst_total/1e6:.1f} MB  "
              f"(-{100 - dst_total/src_total*100:.0f}%)")
    print(f"max duration drift: {max_drift:.1f} ms")
    if flagged:
        print(f"\n⚠ {len(flagged)} flagged (encode fail or >{args.drift_ms}ms drift):")
        for s, st, n in flagged[:20]:
            print(f"   {st}  {os.path.relpath(s, ROOT)}  {n}")
    else:
        print("✓ all durations preserved within tolerance — timings/segmentation safe")


if __name__ == "__main__":
    main()
