#!/usr/bin/env python3
"""
make_demo.py — render before/after audio clips for a refined boundary so you can
A/B it by ear. Pulls OLD boundaries from the source timings and NEW boundaries
from a refine_boundaries.py --json report, then cuts clips from the .m4a the app
actually streams.

Per boundary i (between segment A=i and B=i+1) it writes, into --outdir:
  vNNN_bI_segA_OLD.wav      segment A, current cut (ends on the tail / mid-pause)
  vNNN_bI_segA_NEW.wav      segment A, refined  (ends in the real silence)
  vNNN_bI_segB_OLD.wav      segment B, current start (carries prev word's leftover)
  vNNN_bI_segB_NEW.wav      segment B, refined start (clean onset)
  vNNN_bI_segA_loop3_OLD.wav   segment A looped 3x, current  (the "repeat" feel)
  vNNN_bI_segA_loop3_NEW.wav   segment A looped 3x, refined

Usage:
  python3 tools/pipeline/make_demo.py --surah 2 --report /tmp/rep.json \
      --pairs 5:0,2:0,7:0 --outdir /tmp/clips
"""
import argparse
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TIMINGS_DIR = os.path.join(ROOT, "quran-data", "complete-timings")
M4A_DIR = os.path.join(ROOT, "quran-data", "audio-aac")


def m4a(surah, verse):
    return os.path.join(M4A_DIR, f"{surah:03d}", f"{surah:03d}{verse:03d}.m4a")


def cut(src, s, e, dst):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", src, "-ss", f"{s:.3f}", "-to", f"{e:.3f}",
         "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", dst],
        check=True,
    )


def loop3(seg_wav, dst):
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-stream_loop", "2", "-i", seg_wav, "-c", "copy", dst],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--surah", type=int, required=True)
    ap.add_argument("--report", required=True, help="refine_boundaries --json output")
    ap.add_argument("--pairs", required=True, help="verse:boundary list, e.g. 5:0,2:0,7:1")
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    src = json.load(open(os.path.join(TIMINGS_DIR, f"surah_{args.surah:03d}_complete.json")))
    by_verse = {v["verseNumber"]: v for v in src}
    report = {(r["verse"], r["boundary"]): r for r in json.load(open(args.report))}

    guide = []
    for pair in args.pairs.split(","):
        vn, bi = (int(x) for x in pair.split(":"))
        v = by_verse[vn]
        segs = v["segments"]
        A, B = segs[bi], segs[bi + 1]
        r = report[(vn, bi)]
        boundary = round(A["end"], 3)          # OLD shared cut
        new_end, new_start = r["new_end"], r["new_start"]
        af = m4a(args.surah, vn)
        pre = f"v{vn:03d}_b{bi}"

        segA_old = os.path.join(args.outdir, f"{pre}_segA_OLD.wav")
        segA_new = os.path.join(args.outdir, f"{pre}_segA_NEW.wav")
        cut(af, A["start"], boundary, segA_old)
        cut(af, A["start"], new_end, segA_new)
        cut(af, boundary, B["end"], os.path.join(args.outdir, f"{pre}_segB_OLD.wav"))
        cut(af, new_start, B["end"], os.path.join(args.outdir, f"{pre}_segB_NEW.wav"))
        loop3(segA_old, os.path.join(args.outdir, f"{pre}_segA_loop3_OLD.wav"))
        loop3(segA_new, os.path.join(args.outdir, f"{pre}_segA_loop3_NEW.wav"))

        guide.append(
            f"  {args.surah}:{vn} boundary {bi}  waqf {r.get('waqf') or '-'}  "
            f"[{r['status']}]  old={boundary}  new_end={new_end} new_start={new_start} "
            f"gap={r.get('gap_ms','-')}ms")

    print(f"clips → {args.outdir}\n")
    print("Listen guide (compare OLD vs NEW):")
    print("\n".join(guide))
    print("\n  segB_OLD vs segB_NEW  → is the previous word's tail gone from the start?")
    print("  segA_loop3_OLD vs _NEW → does the repeat loop seam sound clean?")


if __name__ == "__main__":
    main()
