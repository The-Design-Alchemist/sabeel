#!/usr/bin/env python3
"""
polish_timings.py — two safe, audio-grounded timing polishes surfaced by verify_audio.py.

FIX 1 — final madd tail (~214 verses): cpfair labels the last word's end at its phonetic
  end, but Alafasy holds the closing elongation longer. Extend the last spoken word's end
  (and the last segment's end) to where the recitation actually stops. Safe: nothing follows
  the last word, so extending it can't clip anything — it only lets the loop/highlight cover
  the full madd. Never shortens; never exceeds duration.

FIX 2 — opening qul (4 verses: 6:12, 6:56, 6:145, 24:30): "qul" is recited in wasl with the
  next word, so cpfair gave it ~0 duration in the pre-roll. Re-seat it at the audio onset with
  a short real window and push the next word's start.

Parallel audio analysis; segment start resynced, last-segment end extended, no intentional
inter-segment gaps touched. Dry-run by default; --apply writes. Re-run verify_audio after.
"""
import argparse
import glob
import json
import os
import re
import subprocess
from concurrent.futures import ProcessPoolExecutor

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TDIR = os.path.join(ROOT, "quran-data", "complete-timings")
AUDIO = os.path.join(ROOT, "quran-data", "audio")
SR = 16000
AR_LETTER = re.compile(r'[ء-يٱ-ۓۺ-ۿ]')
END_TOL = 0.6
QUL_LEN = 0.20
OFF_DB = 18.0  # a qul window quieter than vmed-OFF_DB (or zero-width) = genuinely on silence


def floor3(x):
    return int(x * 1000) / 1000


def analyze(args):
    surah, vn = args
    v = next(x for x in json.load(open(os.path.join(TDIR, f"surah_{surah:03d}_complete.json")))
             if x["verseNumber"] == vn)
    mp3 = os.path.join(AUDIO, f"{surah:03d}", f"{surah:03d}{vn:03d}.mp3")
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "1", "-ar", str(SR),
                        "-f", "s16le", "-"], capture_output=True)
    if r.returncode or not r.stdout:
        return (f"{surah}:{vn}", None, {})
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    hop, win = 160, 400
    n = 1 + (len(x) - win) // hop
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    st = np.arange(n) * hop
    db = 10 * np.log10((c[st + win] - c[st]) / win + 1e-12)
    tc = (st + win / 2) / SR
    vmed = float(np.median(db[db > db.max() - 25]))
    voiced = np.where(db > vmed - 15)[0]
    true_end = float(tc[voiced[-1]]) if len(voiced) else None
    # local onset for each "qul" that is genuinely on silence (off-audio window or zero-width)
    onsets = {}
    for i, w in enumerate(v["words"]):
        if not w["word"].strip().startswith("قُل"):
            continue
        lo, hi = int(np.searchsorted(tc, w["start"])), int(np.searchsorted(tc, w["end"]))
        off = w["end"] <= w["start"] or (hi > lo and float(db[lo:hi + 1].max()) < vmed - OFF_DB)
        if off:
            idx = np.where((tc >= max(0.0, w["start"] - 0.15)) & (db > vmed - 12))[0]
            onsets[i] = round(float(tc[idx[0]]), 3) if len(idx) else round(w["start"], 3)
    return (f"{surah}:{vn}", true_end, onsets)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    tasks = []
    for f in sorted(glob.glob(os.path.join(TDIR, "surah_*_complete.json"))):
        s = int(os.path.basename(f).split("_")[1])
        for v in json.load(open(f)):
            tasks.append((s, v["verseNumber"]))
    ac = {}
    with ProcessPoolExecutor() as ex:
        for ref, te, onsets in ex.map(analyze, tasks, chunksize=8):
            ac[ref] = (te, onsets)

    n_madd = n_qul = 0
    qul_detail = []
    madd_examples = []
    for f in sorted(glob.glob(os.path.join(TDIR, "surah_*_complete.json"))):
        s = int(os.path.basename(f).split("_")[1])
        T = json.load(open(f))
        dirty = False
        for v in T:
            ref = f"{s}:{v['verseNumber']}"
            dur, words, segs = v["duration"], v["words"], (v.get("segments") or [])
            true_end, onsets = ac.get(ref, (None, {}))
            spoken = [i for i, w in enumerate(words) if AR_LETTER.search(w["word"])]
            if not spoken:
                continue

            # FIX 1 — extend last word + last segment into the madd tail
            if true_end is not None:
                li = spoken[-1]
                w = words[li]
                if w["end"] < true_end - END_TOL:
                    new_end = min(round(true_end, 3), floor3(dur))
                    if new_end > w["end"]:
                        if len(madd_examples) < 8:
                            madd_examples.append(f"{ref} {w['word']} {w['end']:.2f}->{new_end:.2f}")
                        w["end"] = new_end
                        for j in range(li + 1, len(words)):   # trailing mark tokens
                            words[j]["start"] = words[j]["end"] = new_end
                        for sg in segs:                        # only the segment ending here
                            if sg["endWord"] == li:
                                sg["end"] = new_end
                        n_madd += 1
                        dirty = True

            # FIX 2 — re-seat every on-silence "qul" (opening or mid-verse) at its local onset
            for i in sorted(onsets):
                w = words[i]
                ns = round(onsets[i], 3)
                if i > 0:
                    ns = max(ns, round(words[i - 1]["end"], 3))  # stay monotonic
                w["start"] = ns
                w["end"] = round(ns + QUL_LEN, 3)
                if i + 1 < len(words) and words[i + 1]["start"] < w["end"]:
                    words[i + 1]["start"] = w["end"]
                qul_detail.append(f"{ref} w{i} qul->[{w['start']:.2f}-{w['end']:.2f}]")
                n_qul += 1
                dirty = True

            # resync every segment's start to its (possibly moved) start word
            for sg in segs:
                ws = words[sg["startWord"]]["start"]
                if abs(sg["start"] - ws) > 1e-6:
                    sg["start"] = round(ws, 3)
                    dirty = True

        if dirty and args.apply:
            json.dump(T, open(f, "w"), ensure_ascii=False, indent=2)

    print(("APPLIED" if args.apply else "DRY-RUN"))
    print(f"  FIX 1 madd-tail extensions: {n_madd}")
    for e in madd_examples:
        print(f"      {e}")
    print(f"  FIX 2 opening-qul reseats:  {n_qul}")
    for e in qul_detail:
        print(f"      {e}")
    if not args.apply:
        print("  (dry-run — pass --apply to write)")


if __name__ == "__main__":
    main()
