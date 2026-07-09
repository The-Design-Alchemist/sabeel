#!/usr/bin/env python3
"""
fix_schema.py — repair the catalogued waqf-timing schema defects (deterministic, no audio).

Fixes, per verse, in both quran-data/complete-timings/surah_NNN_complete.json (T) and
quran-data/enhanced/NNN.json (E) where segments must stay in sync:
  1. word overlaps        next word starts before prev ends  -> next.start = prev.end
  2. tiny tail overrun    word.end just past duration (<=0.1s) -> clamp to duration
  3. degenerate segment   endWord < startWord (zero-width)    -> delete from T and E, renumber
  4. missing seg keys     no waqfMark/type                    -> backfill from the enhanced segment
  5. wordCount            two conventions mixed corpus-wide    -> recompute inclusive (ew-sw+1)
  6. seg.end past dur      -> clamp to duration
  7. seg.start resync      -> = words[startWord].start (keeps intentional seg.end gaps intact)

Verses whose alignment is badly broken (word/seg end > duration by > 0.1s) are LEFT ALONE and
FLAGGED for re-alignment — clamping them to zero-width would only hide the problem.

Dry-run by default; pass --apply to write.
"""
import argparse
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TDIR = os.path.join(ROOT, "quran-data", "complete-timings")
EDIR = os.path.join(ROOT, "quran-data", "enhanced")
BIG = 0.10  # overrun beyond this (seconds) = broken alignment, flag not clamp


def floor3(x):
    """Round DOWN to 3 decimals so a clamp never lands past the true duration."""
    return int(x * 1000) / 1000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write the fixes (default: dry-run)")
    args = ap.parse_args()

    changes = {k: 0 for k in
               ("word_overlap", "tail_clamp", "degenerate_del", "key_backfill",
                "wordcount", "segend_clamp", "segstart_resync")}
    realign_flags = []
    touched_T = touched_E = 0

    for tf in sorted(glob.glob(os.path.join(TDIR, "surah_*_complete.json"))):
        s = int(os.path.basename(tf).split("_")[1])
        T = json.load(open(tf))
        ef = os.path.join(EDIR, f"{s:03d}.json")
        E = json.load(open(ef))
        Ev = {int(x["key"].split(":")[1]): x for x in E["verses"]}
        tdirty = edirty = False

        for v in T:
            ref = f"{s}:{v['verseNumber']}"
            dur = v["duration"]
            words = v["words"]
            ev = Ev[v["verseNumber"]]

            # (1) word overlaps
            for i in range(len(words) - 1):
                if words[i + 1]["start"] < words[i]["end"] - 1e-6:
                    words[i + 1]["start"] = round(words[i]["end"], 3)
                    changes["word_overlap"] += 1
                    tdirty = True

            # (2) tiny tail overrun / flag big misalignment
            for w in words:
                if w["end"] > dur + 1e-6:
                    if w["end"] - dur <= BIG:
                        w["end"] = floor3(dur)
                        if w["start"] > dur:
                            w["start"] = floor3(dur)
                        changes["tail_clamp"] += 1
                        tdirty = True
                    else:
                        realign_flags.append((ref, f"word '{w['word']}' end {w['end']} vs dur {dur:.3f}"))

            segs = v.get("segments")
            if segs and len(segs) > 1:
                esegs = ev.get("segments") or []
                # (3) delete degenerate segments from T and E
                keep_t, keep_e = [], []
                for i, sg in enumerate(segs):
                    if sg["endWord"] < sg["startWord"]:
                        changes["degenerate_del"] += 1
                        tdirty = edirty = True
                        continue  # drop from both
                    keep_t.append(sg)
                    if i < len(esegs):
                        keep_e.append(esegs[i])
                if len(keep_t) != len(segs):
                    v["segments"] = keep_t
                    ev["segments"] = keep_e
                    segs = keep_t

                for i, sg in enumerate(segs):
                    # (4) backfill missing keys from the parallel enhanced segment
                    esg = ev["segments"][i] if i < len(ev["segments"]) else {}
                    for k in ("waqfMark", "type"):
                        if k not in sg:
                            sg[k] = esg.get(k)
                            changes["key_backfill"] += 1
                            tdirty = True
                    # (7) resync seg.start to the (possibly overlap-fixed) word start
                    ws = words[sg["startWord"]]["start"]
                    if abs(sg["start"] - ws) > 1e-6:
                        sg["start"] = round(ws, 3)
                        changes["segstart_resync"] += 1
                        tdirty = True
                    # (6) clamp seg.end to duration
                    if sg["end"] > dur + 1e-6:
                        sg["end"] = floor3(dur)
                        changes["segend_clamp"] += 1
                        tdirty = True
                    # renumber + (5) recompute inclusive wordCount
                    if sg.get("segmentNumber") != i + 1:
                        sg["segmentNumber"] = i + 1
                        tdirty = True
                    wc = sg["endWord"] - sg["startWord"] + 1
                    if sg.get("wordCount") != wc:
                        sg["wordCount"] = wc
                        changes["wordcount"] += 1
                        tdirty = True

        if tdirty:
            touched_T += 1
            if args.apply:
                json.dump(T, open(tf, "w"), ensure_ascii=False, indent=2)
        if edirty:
            touched_E += 1
            if args.apply:
                json.dump(E, open(ef, "w"), ensure_ascii=False, indent=2)

    print(("APPLIED" if args.apply else "DRY-RUN") + " — changes:")
    for k, n in changes.items():
        print(f"  {k:18} {n}")
    print(f"  files: {touched_T} timing, {touched_E} enhanced")
    print(f"\nFLAGGED for re-alignment ({len(realign_flags)}) — left untouched:")
    for ref, note in realign_flags:
        print(f"  {ref:10} {note}")


if __name__ == "__main__":
    main()
