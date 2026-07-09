#!/usr/bin/env python3
"""
detect_clips.py — find waqf-segment boundaries that cut WHILE the last word is still
being recited (the 2:44 "al-kitaab gets chopped" class). These only hurt repeat/segment
isolation (linear playback flows across the cut).

Signal (from the owner's ear-test): a cut where the word merely *fades* is tolerable
(2:5); a cut where energy *stays high past* the boundary is a real clip (2:44). So we
measure the MINIMUM energy in the 120 ms AFTER the cut, relative to the verse's own
speech level. If it never dips even ~10 dB below speech, the word is clearly still going.

Scans all segmented verses in parallel. Prints a severity histogram + worst offenders.
"""
import glob
import json
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TDIR = os.path.join(ROOT, "quran-data", "complete-timings")
AUDIO = os.path.join(ROOT, "quran-data", "audio")
SR, HOP, WIN = 16000, 0.010, 0.025
AFTER = 0.12  # window after the cut to test for continued voicing


def envelope(x):
    hop, win = int(SR * HOP), int(SR * WIN)
    if len(x) < win:
        return np.array([-120.0]), np.array([0.0])
    n = 1 + (len(x) - win) // hop
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    st = np.arange(n) * hop
    db = 10 * np.log10((c[st + win] - c[st]) / win + 1e-12)
    return db, (st + win / 2) / SR


def scan_verse(args):
    surah, vn = args
    f = os.path.join(TDIR, f"surah_{surah:03d}_complete.json")
    v = next(x for x in json.load(open(f)) if x["verseNumber"] == vn)
    segs = v["segments"]
    mp3 = os.path.join(AUDIO, f"{surah:03d}", f"{surah:03d}{vn:03d}.mp3")
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "1", "-ar", str(SR),
                        "-f", "s16le", "-"], capture_output=True)
    if r.returncode or not r.stdout:
        return []
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    db, tc = envelope(x)
    voiced = db[db > db.max() - 25]
    vmed = float(np.median(voiced)) if voiced.size else float(np.median(db))
    out = []
    for i in range(len(segs) - 1):  # internal boundaries only
        b = segs[i]["end"]
        lo, hi = int(np.searchsorted(tc, b)), int(np.searchsorted(tc, b + AFTER))
        lo, hi = max(lo, 0), min(hi, len(db) - 1)
        if hi <= lo:
            continue
        min_after = float(db[lo:hi + 1].min())
        sev = round(min_after - vmed, 1)  # high (near 0) = word still going past cut = clip
        lastword = v["words"][segs[i]["endWord"]]["word"]
        out.append((f"{surah}:{vn}", i, sev, round(b, 2), lastword))
    return out


def main():
    tasks = []
    for f in sorted(glob.glob(os.path.join(TDIR, "surah_*_complete.json"))):
        s = int(os.path.basename(f).split("_")[1])
        for v in json.load(open(f)):
            if v.get("segments") and len(v["segments"]) > 1:
                tasks.append((s, v["verseNumber"]))

    results = []
    with ProcessPoolExecutor() as ex:
        for r in ex.map(scan_verse, tasks, chunksize=8):
            results.extend(r)

    results.sort(key=lambda r: r[2], reverse=True)  # worst (highest severity) first
    n = len(results)
    buckets = {">-4 (severe clip)": 0, "-4..-8 (clip)": 0, "-8..-12 (mild)": 0, "<-12 (clean)": 0}
    for _, _, sev, _, _ in results:
        if sev > -4:
            buckets[">-4 (severe clip)"] += 1
        elif sev > -8:
            buckets["-4..-8 (clip)"] += 1
        elif sev > -12:
            buckets["-8..-12 (mild)"] += 1
        else:
            buckets["<-12 (clean)"] += 1

    print(f"scanned {len(tasks)} segmented verses, {n} internal boundaries\n")
    print("severity = min energy 120ms AFTER the cut, minus verse speech level (dB)")
    print("higher = word still loud past the cut = worse clip\n")
    for k, c in buckets.items():
        print(f"  {k:22} {c:5}  ({100*c/n:.1f}%)")
    print("\nworst 25:")
    for ref, bi, sev, b, w in results[:25]:
        print(f"  {ref:9} b{bi} sev={sev:+.1f}dB @ {b:.2f}s  last word: {w}")


if __name__ == "__main__":
    main()
