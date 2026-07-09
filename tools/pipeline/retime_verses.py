#!/usr/bin/env python3
"""
retime_verses.py — targeted re-timing of the 2 verses whose cpfair word times are corrupt
(both flagged by fix_schema; QUL/Quran.com have the SAME bug, so there's nothing to import).

37:152 — all 4 words offset ~+12.6s into a 6.74s clip. Re-placed onto the real audio: the
  inter-word gaps detected acoustically at 1.63s and 3.50s, matching a proportional remap.
4:103  — words 0-9 (first breath) are correct; the second breath (words 10-21, recited
  continuously 10.21→20.77) is stretched so cpfair runs 3.67s past the audio. Rescale just
  that breath into [10.3, 20.77], keeping cpfair's within-breath proportions, then re-derive
  the segment start/end from the new word times.

Dry-run by default; --apply writes. Verifies monotonic + in-bounds before writing.
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TDIR = os.path.join(ROOT, "quran-data", "complete-timings")

# 37:152 — four words on the real audio (onset 0.01, gaps at 1.63 & 3.50, last sound ends 6.39)
RETIME_37_152 = [(0.01, 0.88), (0.89, 1.63), (1.64, 3.50), (3.51, 6.39)]

# 4:103 — rescale the 2nd breath (word index 10..21) from cpfair [10.30, 24.84] into [10.30, 20.77]
V4103_BREATH_START_IDX = 10
V4103_OLD_LO, V4103_OLD_HI = 10.30, 24.84
V4103_NEW_LO, V4103_NEW_HI = 10.30, 20.77


def load(surah):
    p = os.path.join(TDIR, f"surah_{surah:03d}_complete.json")
    return p, json.load(open(p))


def verse(data, vn):
    return next(v for v in data if v["verseNumber"] == vn)


def check(v, label):
    dur = v["duration"]
    ws = v["words"]
    for i, w in enumerate(ws):
        assert 0 <= w["start"] <= w["end"] <= dur + 1e-6, f"{label} word {i} out of range: {w}"
        if i and w["start"] < ws[i - 1]["end"] - 1e-6:
            raise AssertionError(f"{label} non-monotonic at word {i}: {ws[i-1]['end']} -> {w['start']}")
    for s in (v.get("segments") or []):
        assert 0 <= s["start"] <= s["end"] <= dur + 1e-6, f"{label} seg out of range: {s}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    # ---- 37:152 ----
    p37, d37 = load(37)
    v = verse(d37, 152)
    print(f"37:152 (dur {v['duration']:.3f}) — {len(v['words'])} words")
    for w, (s, e) in zip(v["words"], RETIME_37_152):
        print(f"  {w['word']:12} {w['start']:.2f}-{w['end']:.2f}  ->  {s:.2f}-{e:.2f}")
        w["start"], w["end"] = s, e
    check(v, "37:152")

    # ---- 4:103 ----
    p4, d4 = load(4)
    v = verse(d4, 103)
    scale = (V4103_NEW_HI - V4103_NEW_LO) / (V4103_OLD_HI - V4103_OLD_LO)
    print(f"\n4:103 (dur {v['duration']:.3f}) — rescale breath-2 words[{V4103_BREATH_START_IDX}:] "
          f"scale={scale:.4f}")
    for i, w in enumerate(v["words"]):
        if i >= V4103_BREATH_START_IDX:
            ns = round(V4103_NEW_LO + (w["start"] - V4103_OLD_LO) * scale, 3)
            ne = round(V4103_NEW_LO + (w["end"] - V4103_OLD_LO) * scale, 3)
            print(f"  w{i:<2} {w['word']:14} {w['start']:.2f}-{w['end']:.2f}  ->  {ns:.2f}-{ne:.2f}")
            w["start"], w["end"] = ns, ne
    # re-derive segment start/end from the new word times (structure unchanged)
    for s in v["segments"]:
        s["start"] = round(v["words"][s["startWord"]]["start"], 3)
        s["end"] = round(v["words"][s["endWord"]]["end"], 3)
        print(f"  seg{s['segmentNumber']} -> {s['start']:.2f}-{s['end']:.2f} w[{s['startWord']}..{s['endWord']}]")
    check(v, "4:103")

    if args.apply:
        json.dump(d37, open(p37, "w"), ensure_ascii=False, indent=2)
        json.dump(d4, open(p4, "w"), ensure_ascii=False, indent=2)
        print("\nAPPLIED — wrote surah 037 + 004.")
    else:
        print("\n(dry-run — pass --apply to write)")


if __name__ == "__main__":
    main()
