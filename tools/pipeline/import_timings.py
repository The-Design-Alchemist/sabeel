#!/usr/bin/env python3
"""
import_timings.py — Replace Sabeel's fabricated (evenly-divided) per-word audio
timings with real forced-alignment timings from cpfair/quran-align.

WHY: Sabeel's complete-timings/*.json word start/end times were `duration / wordCount`
evenly spaced (verified: 100% of verses), so word-by-word highlighting drifts from the
actual recitation and every waqf-segment boundary had to be tuned by ear.

cpfair/quran-align (CC-BY 4.0, (c) Collin Fair) publishes real per-word timestamps for
the EveryAyah "Alafasy_128kbps" recitation — which is exactly the recording Sabeel ships.

WHAT THIS DOES, per verse:
  1. Expand cpfair's segments [w_start, w_end_excl, start_ms, end_ms] into a per-word
     timing array (merged spans are distributed evenly across their words).
  2. Walk Sabeel's word tokens; assign the k-th *spoken* token cpfair word k. Waqf-mark
     tokens (e.g. U+06DB) are not spoken, so they get a zero-gap span at the boundary.
  3. Only apply when Sabeel's spoken-token count == cpfair's word count (6230/6236).
     The 6 muqatta'at/tokenization mismatches keep their existing timings and are logged.
  4. Recompute each existing segment's start/end from the new word timings.

Usage:
  python3 import_timings.py --cpfair <Alafasy_128kbps.json> --timings-dir <complete-timings> [--apply]
Without --apply it runs a dry run and writes a validation report only.

Attribution required by CC-BY 4.0: word timings (c) Collin Fair, github.com/cpfair/quran-align
"""
import argparse, json, glob, os, re, sys

AR_LETTER = re.compile(r'[ء-يٱ-ۓۺ-ۿ]')  # Arabic letters (validated)

def is_spoken(tok: str) -> bool:
    return bool(AR_LETTER.search(tok))

def cpfair_word_times(seg_list):
    """Return list of (start_s, end_s) indexed by word, expanding merged spans."""
    n = max(s[1] for s in seg_list) if seg_list else 0
    times = [None] * n
    for w_start, w_end, ms_start, ms_end in seg_list:
        span = w_end - w_start
        s, e = ms_start / 1000.0, ms_end / 1000.0
        e = max(s, e)  # clamp cpfair's occasional degenerate (end<start) short-word spans
        if span <= 1:
            times[w_start] = (s, e)
        else:  # merged: distribute evenly across the covered words
            step = (e - s) / span
            for j in range(span):
                times[w_start + j] = (round(s + j * step, 6), round(s + (j + 1) * step, 6))
    return times

def convert_verse(verse, cp):
    """Return (ok, reason, updated_word_count). Mutates verse in place when ok."""
    words = verse['words']
    spoken_idx = [i for i, w in enumerate(words) if is_spoken(w['word'])]
    cptimes = cpfair_word_times(cp['segments'])
    if len(spoken_idx) != len(cptimes):
        return False, f"token-count mismatch sab={len(spoken_idx)} cpfair={len(cptimes)}", 0
    if any(t is None for t in cptimes):
        return False, "cpfair coverage gap (unaligned word)", 0

    # assign spoken tokens
    new = [None] * len(words)
    for k, ti in enumerate(spoken_idx):
        new[ti] = cptimes[k]

    # fill non-spoken (waqf-mark) tokens with a zero-gap span at the boundary
    for i, w in enumerate(words):
        if new[i] is not None:
            continue
        prev_end = next((new[j][1] for j in range(i - 1, -1, -1) if new[j]), None)
        nxt_start = next((cptimes[k][0] for k, ti in enumerate(spoken_idx) if ti > i), None)
        if prev_end is None:  # leading mark
            prev_end = nxt_start if nxt_start is not None else 0.0
        if nxt_start is None:  # trailing mark
            nxt_start = prev_end
        new[i] = (prev_end, max(prev_end, nxt_start))

    # monotonicity guard. cpfair occasionally overlaps adjacent word boundaries by a
    # few ms; tolerate <=60ms (imperceptible) rather than distort its real values.
    last = -1e-9
    for s, e in new:
        if s < last - 0.06 or e < s - 1e-6:
            return False, "non-monotonic after mapping", 0
        last = e

    for i, w in enumerate(words):
        w['start'], w['end'] = round(new[i][0], 6), round(new[i][1], 6)

    # recompute existing segment boundaries from real word timings
    if verse.get('segments'):
        for seg in verse['segments']:
            sw, ew = seg.get('startWord'), seg.get('endWord')
            if sw is None or ew is None or ew >= len(words):
                continue
            seg['start'] = words[sw]['start']
            seg['end'] = words[ew]['end']
    return True, "ok", len(spoken_idx)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cpfair', required=True)
    ap.add_argument('--timings-dir', required=True)
    ap.add_argument('--report', required=True)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    cp = json.load(open(args.cpfair))
    cpidx = {(c['surah'], c['ayah']): c for c in cp}

    updated = 0; skipped = 0; skip_list = []; seg_recomputed = 0
    files = sorted(glob.glob(os.path.join(args.timings_dir, '*.json')))
    for f in files:
        arr = json.load(open(f))
        changed = False
        for v in arr:
            key = (v['surahNumber'], v['verseNumber'])
            c = cpidx.get(key)
            if not c:
                skipped += 1; skip_list.append((key, 'no cpfair entry')); continue
            had_seg = bool(v.get('segments'))
            ok, reason, _ = convert_verse(v, c)
            if ok:
                updated += 1; changed = True
                if had_seg: seg_recomputed += 1
            else:
                skipped += 1; skip_list.append((key, reason))
        if changed and args.apply:
            with open(f, 'w') as out:
                out.write(json.dumps(arr, ensure_ascii=False, indent=2))

    report = {
        'mode': 'APPLIED' if args.apply else 'DRY-RUN',
        'verses_updated': updated,
        'verses_skipped': skipped,
        'segments_recomputed': seg_recomputed,
        'skipped_detail': [{'verse': f'{s}:{a}', 'reason': r} for (s, a), r in skip_list],
    }
    with open(args.report, 'w') as rf:
        json.dump(report, rf, ensure_ascii=False, indent=2)
    print(f"[{report['mode']}] updated={updated} skipped={skipped} segments_recomputed={seg_recomputed}")
    print("skipped verses:")
    for (s, a), r in skip_list:
        print(f"   {s}:{a}  {r}")

if __name__ == '__main__':
    main()
