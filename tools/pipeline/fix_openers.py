#!/usr/bin/env python3
"""
fix_openers.py — repair the 21 surah-opening verses whose waqf-segment word indices are
shifted one word early.

These verse-1's have an empty leading token at words[0]; the segmentation was computed
without accounting for it, so every segment's startWord/endWord is 1 too low. The effect:
each internal boundary lands one word BEFORE its waqf mark (so the pre-mark word leaks into
the next segment — the "nisāʾā ends up in segment 2" bug in 4:1) and the last segment drops
the verse's final word. All 21 are a clean, uniform -1 offset (verified against the waqf-mark
positions), so the fix is a +1 shift of every endWord and of every non-first startWord, then
recompute each segment's start/end (from the corrected word times) and wordCount.

Only the timing file changes — enhanced segment TEXT is already correct and count-synced.
Dry-run by default; --apply writes. Re-run verify_audio + the boundary scan after.
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TDIR = os.path.join(ROOT, "quran-data", "complete-timings")

OPENERS = [4, 5, 6, 8, 13, 16, 17, 22, 33, 34, 35, 49, 57, 58, 59, 60, 61, 63, 64, 65, 66]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    for s in OPENERS:
        p = os.path.join(TDIR, f"surah_{s:03d}_complete.json")
        data = json.load(open(p))
        v = next(x for x in data if x["verseNumber"] == 1)
        words, segs, dur = v["words"], v["segments"], v["duration"]
        before = [(g["startWord"], g["endWord"]) for g in segs]

        for i, g in enumerate(segs):
            if i > 0:
                g["startWord"] += 1
            g["endWord"] += 1
        # recompute times + wordCount from the corrected word indices (match word values exactly)
        for g in segs:
            assert 0 <= g["startWord"] <= g["endWord"] < len(words), f"{s}:1 index out of range: {g}"
            g["start"] = words[g["startWord"]]["start"]
            g["end"] = min(words[g["endWord"]]["end"], dur)
            g["wordCount"] = g["endWord"] - g["startWord"] + 1
        after = [(g["startWord"], g["endWord"]) for g in segs]
        # sanity: last segment now covers the final word
        assert segs[-1]["endWord"] == len(words) - 1, f"{s}:1 last segment still drops a word"
        print(f"{s}:1  {before}  ->  {after}   last word now covered ✓")

        if args.apply:
            json.dump(data, open(p, "w"), ensure_ascii=False, indent=2)

    print(("\nAPPLIED — wrote 21 surah files." if args.apply else "\n(dry-run — pass --apply to write)"))


if __name__ == "__main__":
    main()
