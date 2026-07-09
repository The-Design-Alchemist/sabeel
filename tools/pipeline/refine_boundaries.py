#!/usr/bin/env python3
"""
refine_boundaries.py — snap waqf-segment cut points into the real inter-word silence.

The cpfair forced-alignment timings butt segments together with ZERO gap
(seg[i].end === seg[i+1].start === words[endWord].end), and that shared instant
usually sits on the decaying tail of the last word or a few hundred ms into the
pause — never on the true silence edges. Result: the held note / next word bleeds
across the cut in both linear playback and repeat.

This pass, per internal boundary, decodes the verse audio, finds the genuine pause
trough near the boundary (relative to THIS verse's own loudness — the pauses are
shallow, ~5-8 dB below speech, so a fixed dB floor misses them), and moves:
    seg[i].end     -> start of the pause   (where the last word's sound stops)
    seg[i+1].start -> end of the pause      (onset of the next word)
exposing the reciter's real breath as a real gap. Boundaries where the reciter
genuinely does NOT pause (no trough) are FLAGGED and left untouched.

Reads/writes only quran-data/complete-timings/surah_NNN_complete.json.
Dry-run + report by default. Writes refined JSON only with --write (to --outdir,
never clobbering the source unless --outdir points back at it).

Usage:
  python3 tools/pipeline/refine_boundaries.py --surah 2 --verses 2,5,7,25
  python3 tools/pipeline/refine_boundaries.py --surah 2 --write --outdir /tmp/refined
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TIMINGS_DIR = os.path.join(ROOT, "quran-data", "complete-timings")
AUDIO_DIR = os.path.join(ROOT, "quran-data", "audio")  # mp3 originals (timing-aligned)

SR = 16000
HOP = 0.010          # 10 ms envelope hop
WIN = 0.025          # 25 ms RMS window


def audio_path(surah, verse):
    return os.path.join(AUDIO_DIR, f"{surah:03d}", f"{surah:03d}{verse:03d}.mp3")


def decode_mono(path):
    """Decode to mono float32 @ SR via ffmpeg."""
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
        capture_output=True,
    )
    if r.returncode != 0 or not r.stdout:
        return None
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def envelope(x):
    """dBFS RMS envelope; returns (db[], frame_center_times[])."""
    hop, win = int(SR * HOP), int(SR * WIN)
    if len(x) < win:
        return np.array([-120.0]), np.array([0.0])
    n = 1 + (len(x) - win) // hop
    csum = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    starts = np.arange(n) * hop
    ms = (csum[starts + win] - csum[starts]) / win
    db = 10.0 * np.log10(ms + 1e-12)
    tc = (starts + win / 2) / SR
    return db, tc


def voiced_median(db):
    """Median level of the voiced frames (ignore leading/trailing silence)."""
    voiced = db[db > (db.max() - 25.0)]
    return float(np.median(voiced)) if voiced.size else float(np.median(db))


def silence_regions(db, tc, sil_db, min_ms):
    """All contiguous runs where energy stays below `sil_db` for >= min_ms.
    Returns [(t_start, t_end, min_db), ...] — these are GENUINE breaths/stops."""
    below = db <= sil_db
    regions, i, n = [], 0, len(db)
    while i < n:
        if below[i]:
            j = i
            while j < n and below[j]:
                j += 1
            if (tc[j - 1] - tc[i]) * 1000 >= min_ms:
                regions.append((float(tc[i]), float(tc[j - 1]), float(db[i:j].min())))
            i = j
        else:
            i += 1
    return regions


def refine_boundary(db, tc, vmed, b, w_end_start, w_next_end,
                    back=0.15, fwd=0.40, sil_rel=18.0, min_ms=70.0):
    """
    Anchor the cut on a GENUINE silence region (a real breath), not the nearest dip.
    A boundary is only moved when a deep (>= sil_rel dB below this verse's speech level),
    wide (>= min_ms) silence sits within [b-back, b+fwd] — forward-biased so a word whose
    alignment ends early (its madd tail spills past `b`) extends into segment i instead of
    being clipped. No qualifying silence -> LEAVE the cut exactly as-is (status 'no_pause').
        seg[i].end     -> start of the silence (where the last word's sound stops)
        seg[i+1].start -> end of the silence   (onset of the next word)
    """
    sil_db = vmed - sil_rel
    regions = silence_regions(db, tc, sil_db, min_ms)
    lo, hi = b - back, b + fwd
    cands = [r for r in regions if r[1] >= lo and r[0] <= hi]
    if not cands:
        # report how deep the best local dip was, for triage
        i0 = max(int(np.searchsorted(tc, lo)), 0)
        i1 = min(int(np.searchsorted(tc, hi)), len(db) - 1)
        trough = float(db[i0:i1 + 1].min()) if i1 > i0 else 0.0
        return b, b, {"status": "no_pause", "trough_db": round(trough, 1),
                      "drop_db": round(vmed - trough, 1), "sil_db": round(sil_db, 1)}

    def dist(r):
        s, e, _ = r
        return 0.0 if s <= b <= e else min(abs(s - b), abs(e - b))

    s, e, mn = min(cands, key=dist)
    new_end = max(s, w_end_start + 0.02)      # never cut into the last word's body
    new_start = max(e, new_end)               # monotonic
    return round(new_end, 3), round(new_start, 3), {
        "status": "refined",
        "trough_db": round(mn, 1),
        "drop_db": round(vmed - mn, 1),
        "sil_db": round(sil_db, 1),
        "gap_ms": round((new_start - new_end) * 1000),
    }


def process_verse(v, back, fwd, sil_rel, min_ms):
    segs = v.get("segments")
    if not segs or len(segs) < 2:
        return []
    x = decode_mono(audio_path(v["surahNumber"], v["verseNumber"]))
    if x is None:
        return [{"boundary": i, "status": "no_audio"} for i in range(len(segs) - 1)]
    db, tc = envelope(x)
    vmed = voiced_median(db)
    words = v["words"]
    out = []
    for i in range(len(segs) - 1):
        cur, nxt = segs[i], segs[i + 1]
        b = cur["end"]
        w_end_start = words[cur["endWord"]]["start"] if cur["endWord"] < len(words) else b
        w_next_end = words[nxt["startWord"]]["end"] if nxt["startWord"] < len(words) else None
        new_end, new_start, info = refine_boundary(
            db, tc, vmed, b, w_end_start, w_next_end, back, fwd, sil_rel, min_ms)
        rec = {
            "verse": v["verseNumber"], "boundary": i,
            "old": round(b, 3), "new_end": new_end, "new_start": new_start,
            "waqf": cur.get("waqfMark"), **info,
        }
        out.append(rec)
        if info["status"] == "refined":
            cur["end"] = new_end
            nxt["start"] = new_start
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--surah", type=int, required=True)
    ap.add_argument("--verses", type=str, help="comma list, e.g. 2,5,7 (default: all segmented)")
    ap.add_argument("--back", type=float, default=0.15, help="search window BEFORE the boundary (s)")
    ap.add_argument("--fwd", type=float, default=0.40, help="search window AFTER the boundary (s) — forward-biased for spilled madd tails")
    ap.add_argument("--sil-rel", type=float, default=18.0, help="a real silence is this many dB below the verse's speech level")
    ap.add_argument("--min-ms", type=float, default=70.0, help="min duration (ms) of a genuine breath/stop")
    ap.add_argument("--write", action="store_true", help="write refined JSON")
    ap.add_argument("--outdir", type=str, help="dir to write refined JSON (default: complete-timings, in place)")
    ap.add_argument("--json", type=str, help="also dump the per-boundary report to this JSON path")
    args = ap.parse_args()

    src = os.path.join(TIMINGS_DIR, f"surah_{args.surah:03d}_complete.json")
    data = json.load(open(src))
    want = set(int(x) for x in args.verses.split(",")) if args.verses else None

    report, n_ref, n_nopause, n_seg = [], 0, 0, 0
    for v in data:
        if want is not None and v["verseNumber"] not in want:
            continue
        if not v.get("segments") or len(v["segments"]) < 2:
            continue
        n_seg += 1
        recs = process_verse(v, args.back, args.fwd, args.sil_rel, args.min_ms)
        for r in recs:
            report.append(r)
            n_ref += r["status"] == "refined"
            n_nopause += r["status"] == "no_pause"

    # print a compact table
    print(f"surah {args.surah}: {n_seg} segmented verse(s), {len(report)} boundaries "
          f"→ {n_ref} refined, {n_nopause} no-pause(left as-is)\n")
    print(f"{'verse:b':>9} {'waqf':>5} {'old':>7} {'new_end':>7} {'new_start':>9} {'gap':>5} "
          f"{'trough':>7} {'drop':>5}  status")
    for r in report:
        gap = f"{r.get('gap_ms','-')}" if r.get("gap_ms") is not None else "-"
        print(f"{str(r['verse'])+':'+str(r['boundary']):>9} {str(r.get('waqf') or ''):>5} "
              f"{r.get('old','-'):>7} {r.get('new_end','-'):>7} {r.get('new_start','-'):>9} "
              f"{gap:>5} {str(r.get('trough_db') or '-'):>7} {str(r.get('drop_db') or '-'):>5}  {r['status']}")

    if args.write:
        outdir = args.outdir or TIMINGS_DIR
        os.makedirs(outdir, exist_ok=True)
        dst = os.path.join(outdir, f"surah_{args.surah:03d}_complete.json")
        json.dump(data, open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
        print(f"\nwrote {dst}")

    if args.json:
        json.dump(report, open(args.json, "w"), ensure_ascii=False, indent=2)
        print(f"wrote report → {args.json}")

    # emit machine-readable report to stderr-free stdout tail
    return report


if __name__ == "__main__":
    main()
