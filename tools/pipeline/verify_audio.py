#!/usr/bin/env python3
"""
verify_audio.py — does the timing data actually match the audio? Corpus-wide health check.

Two layers:
  STRUCTURAL (no audio): every word/segment in-bounds, monotonic, no overlaps, no degenerate
    segments, no missing keys, wordCount = endWord-startWord+1, timing↔enhanced segment counts synced.
  ACOUSTIC (vs mp3, parallel): every spoken word's [start,end] window contains real sound (a word
    placed on silence = misalignment); and the last word ends near where the recitation actually
    stops. Catches gross alignment errors like the old 37:152 (words parked in silence).

Prints a PASS/FAIL summary + the worst verses to eyeball. Run after any timing change.

  python3 tools/pipeline/verify_audio.py           # full corpus
  python3 tools/pipeline/verify_audio.py --sample 300
"""
import argparse
import glob
import json
import os
import subprocess
from concurrent.futures import ProcessPoolExecutor

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TDIR = os.path.join(ROOT, "quran-data", "complete-timings")
EDIR = os.path.join(ROOT, "quran-data", "enhanced")
AUDIO = os.path.join(ROOT, "quran-data", "audio")
SR = 16000
import re
AR_LETTER = re.compile(r'[ء-يٱ-ۓۺ-ۿ]')  # matches import_timings.is_spoken
OFF_DB = 18.0   # a word window quieter than vmed-OFF_DB everywhere = "off-audio"
END_TOL = 0.6   # last word must end within this many seconds of the recitation's true end


def envelope(x):
    hop, win = 160, 400
    if len(x) < win:
        return np.array([-120.0]), np.array([0.0])
    n = 1 + (len(x) - win) // hop
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64) ** 2)])
    st = np.arange(n) * hop
    db = 10 * np.log10((c[st + win] - c[st]) / win + 1e-12)
    return db, (st + win / 2) / SR


def acoustic(args):
    surah, vn = args
    f = os.path.join(TDIR, f"surah_{surah:03d}_complete.json")
    v = next(x for x in json.load(open(f)) if x["verseNumber"] == vn)
    mp3 = os.path.join(AUDIO, f"{surah:03d}", f"{surah:03d}{vn:03d}.mp3")
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-ac", "1", "-ar", str(SR),
                        "-f", "s16le", "-"], capture_output=True)
    if r.returncode or not r.stdout:
        return {"ref": f"{surah}:{vn}", "no_audio": True}
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    db, tc = envelope(x)
    vmed = float(np.median(db[db > db.max() - 25]))
    floor = vmed - OFF_DB
    off = []
    last_spoken_end = None
    for w in v["words"]:
        if not AR_LETTER.search(w["word"]) or w["end"] <= w["start"]:
            continue
        last_spoken_end = w["end"]
        lo, hi = int(np.searchsorted(tc, w["start"])), int(np.searchsorted(tc, w["end"]))
        lo, hi = max(lo, 0), min(hi, len(db) - 1)
        if hi <= lo:
            continue
        if float(db[lo:hi + 1].max()) < floor:          # whole window is silence
            off.append(w["word"])
    # true end of recitation = last frame above vmed-15
    voiced_frames = np.where(db > vmed - 15)[0]
    true_end = float(tc[voiced_frames[-1]]) if len(voiced_frames) else 0.0
    end_delta = round(last_spoken_end - true_end, 2) if last_spoken_end is not None else None
    return {"ref": f"{surah}:{vn}", "off_words": off,
            "end_delta": end_delta, "bad_end": end_delta is not None and abs(end_delta) > END_TOL}


def structural():
    issues = {"oob": [], "nonmono": [], "overlap": [], "degenerate": [], "missing_key": [],
              "bad_wc": [], "count_desync": []}
    for f in sorted(glob.glob(os.path.join(TDIR, "surah_*_complete.json"))):
        s = int(os.path.basename(f).split("_")[1])
        T = json.load(open(f))
        E = {int(x["key"].split(":")[1]): x for x in json.load(open(os.path.join(EDIR, f"{s:03d}.json")))["verses"]}
        for v in T:
            ref = f"{s}:{v['verseNumber']}"
            dur, words = v["duration"], v["words"]
            for i, w in enumerate(words):
                if not (0 <= w["start"] <= w["end"] <= dur + 1e-6):
                    issues["oob"].append(ref)
                if i and w["start"] < words[i - 1]["end"] - 1e-6:
                    issues["nonmono"].append(ref)
                if i and w["start"] < words[i - 1]["end"] - 1e-6:
                    issues["overlap"].append(ref)
            segs = v.get("segments") or []
            if len(segs) < 2:
                continue
            if len(segs) != len(E[v["verseNumber"]].get("segments") or []):
                issues["count_desync"].append(ref)
            for sg in segs:
                if sg["endWord"] < sg["startWord"]:
                    issues["degenerate"].append(ref)
                if sg["end"] > dur + 1e-6:
                    issues["oob"].append(ref)
                if any(k not in sg for k in ("waqfMark", "type", "wordCount")):
                    issues["missing_key"].append(ref)
                elif sg["wordCount"] != sg["endWord"] - sg["startWord"] + 1:
                    issues["bad_wc"].append(ref)
    return {k: sorted(set(v)) for k, v in issues.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, help="only check the first N verses (quick)")
    args = ap.parse_args()

    print("═══ STRUCTURAL ═══")
    st = structural()
    st_ok = all(not v for v in st.values())
    for k, v in st.items():
        mark = "✓" if not v else "✗"
        print(f"  {mark} {k:14} {len(v)}" + (f"  {v[:8]}" if v else ""))
    print(f"  → {'PASS' if st_ok else 'FAIL'}")

    tasks = []
    for f in sorted(glob.glob(os.path.join(TDIR, "surah_*_complete.json"))):
        s = int(os.path.basename(f).split("_")[1])
        for v in json.load(open(f)):
            tasks.append((s, v["verseNumber"]))
    if args.sample:
        tasks = tasks[:args.sample]

    print(f"\n═══ ACOUSTIC (vs audio) — {len(tasks)} verses ═══")
    res = []
    with ProcessPoolExecutor() as ex:
        for r in ex.map(acoustic, tasks, chunksize=8):
            res.append(r)
    no_audio = [r["ref"] for r in res if r.get("no_audio")]
    res = [r for r in res if not r.get("no_audio")]
    off_verses = [(r["ref"], r["off_words"]) for r in res if r.get("off_words")]
    bad_end = [(r["ref"], r["end_delta"]) for r in res if r.get("bad_end")]
    clean = len(res) - len({r for r, _ in off_verses} | {r for r, _ in bad_end})
    print(f"  words land on real audio: {len(res)-len(off_verses)}/{len(res)} verses fully clean "
          f"({100*(len(res)-len(off_verses))/max(len(res),1):.1f}%)")
    print(f"  end-of-recitation aligned: {len(res)-len(bad_end)}/{len(res)} within {END_TOL}s")
    if no_audio:
        print(f"  ⚠ missing audio: {len(no_audio)} {no_audio[:5]}")
    if off_verses:
        print(f"\n  verses with word(s) on silence ({len(off_verses)}):")
        for ref, w in off_verses[:20]:
            print(f"    {ref:9} {len(w)} word(s): {' '.join(w[:4])}")
    if bad_end:
        bad_end.sort(key=lambda x: -abs(x[1]))
        print(f"\n  verses whose last word misses the recitation end ({len(bad_end)}):")
        for ref, d in bad_end[:20]:
            print(f"    {ref:9} Δ={d:+.2f}s")
    print(f"\n  → {'PASS — data matches audio' if not off_verses and not bad_end else 'REVIEW the verses above'}")


if __name__ == "__main__":
    main()
