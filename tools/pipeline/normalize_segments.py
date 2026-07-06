#!/usr/bin/env python3
"""
normalize_segments.py — Reconcile pre-existing segment-data inconsistencies so
enhanced/*.json and complete-timings/*.json agree and every segmented verse's
segment arabic exactly recomposes the verse text.

Fixes three classes (all deterministic; nothing invented):
  A. "Dropped boundary mark": the concatenated segment arabic is missing a single
     waqf mark that IS in the verse arabic. Re-partition the verse arabic across the
     existing segments (redistributing only the mark token; spoken words untouched).
  B. Segment COUNT mismatch (2:19): enhanced over-split a timing segment. Rebuild the
     enhanced segments to the authoritative timing segmentation, merging the split
     segments' translation/transliteration.
  C. enhanced has segments but timing is null (18:1, 69:28): these are single-segment
     "splits" (a verse-final saktah), i.e. not a real split -> set enhanced to null so
     both files agree and the verse renders as one piece (app needs length>1 anyway).

Verses whose segment intentionally splits a word at an embedded saktah (2:245, 7:69)
are reported and left for manual review.
"""
import json, re, glob, os, argparse

MARK = set('ۖۗۘۙۚۛۜ۞')
def norm(s): return re.sub(r'\s+', ' ', (s or '')).strip()
def is_mark_only(t): return t != '' and all(c in MARK for c in t)
def spoken(s): return [t for t in s.split() if not is_mark_only(t)]

def partition_full(full, seg_arabics):
    """Redistribute verse-arabic tokens across segments, appending dropped marks to
    the current segment. Returns new arabic list, or None if spoken content changes."""
    F = full.split()
    segtoks = [a.split() for a in seg_arabics]
    assigned = [[] for _ in segtoks]
    si, ti = 0, 0
    for tok in F:
        while si < len(segtoks) and ti >= len(segtoks[si]):
            si += 1; ti = 0
        if si < len(segtoks) and ti < len(segtoks[si]) and tok == segtoks[si][ti]:
            assigned[si].append(tok); ti += 1
        else:
            assigned[min(si, len(segtoks) - 1)].append(tok)
    parts = [' '.join(a) for a in assigned]
    if norm(' '.join(parts)) != norm(full):
        return None
    if any(spoken(parts[i]) != spoken(seg_arabics[i]) for i in range(len(parts))):
        return None
    return parts

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--enhanced-dir', required=True)
    ap.add_argument('--timings-dir', required=True)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    fixed_A = 0; fixed_B = []; fixed_C = []; manual = []
    for f in sorted(glob.glob(os.path.join(args.enhanced_dir, '*.json'))):
        s = int(re.search(r'(\d+)', os.path.basename(f)).group(1))
        e = json.load(open(f))
        tf = os.path.join(args.timings_dir, f"surah_{s:03d}_complete.json")
        tim = json.load(open(tf)); tim_by = {v['verseNumber']: v for v in tim}
        e_changed = False; t_changed = False
        for v in e['verses']:
            seg = v.get('segments')
            if not seg:
                continue
            vn = int(v['key'].split(':')[1]); tv = tim_by.get(vn)
            tseg = tv.get('segments') if tv else None

            # C: single enhanced segment, null timing -> not a real split
            if tseg is None and len(seg) == 1:
                v['segments'] = None; e_changed = True; fixed_C.append(v['key']); continue
            if tseg is None:
                manual.append((v['key'], 'timing null, multi enhanced segs')); continue

            # B: count mismatch -> rebuild enhanced from timing spans
            if len(tseg) != len(seg):
                if v['key'] == '2:19' and len(tseg) == 2 and len(seg) == 3:
                    parts = partition_full(v['arabic'], [
                        seg[0]['arabic'] + ' ' + seg[1]['arabic'], seg[2]['arabic']])
                    if parts:
                        merged = {
                            'arabic': parts[0],
                            'translation': norm(seg[0]['translation'] + ' ' + seg[1]['translation']),
                            'transliteration': norm((seg[0].get('transliteration') or '') + ' ' + (seg[1].get('transliteration') or '')),
                            'type': tseg[0].get('type', 'compulsory_stop'),
                            'waqfMark': tseg[0].get('waqfMark') or seg[1].get('waqfMark'),
                        }
                        tail = dict(seg[2])
                        v['segments'] = [merged, tail]; e_changed = True; fixed_B.append(v['key'])
                        continue
                manual.append((v['key'], f'count {len(seg)} vs {len(tseg)}')); continue

            # A: dropped-mark reconstruction
            if norm(' '.join(x['arabic'] for x in seg)) != norm(v['arabic']):
                parts = partition_full(v['arabic'], [x['arabic'] for x in seg])
                if parts:
                    for i, p in enumerate(parts):
                        seg[i]['arabic'] = p
                    e_changed = True; fixed_A += 1
                else:
                    manual.append((v['key'], 'embedded-saktah / non-mark diff'))

        if e_changed and args.apply:
            open(f, 'w').write(json.dumps(e, ensure_ascii=False, indent=2))
        if t_changed and args.apply:
            open(tf, 'w').write(json.dumps(tim, ensure_ascii=False, indent=2))

    print(f"[{'APPLIED' if args.apply else 'DRY-RUN'}] A(dropped-mark)={fixed_A}  "
          f"B(count-fix)={fixed_B}  C(null-single)={fixed_C}")
    print("manual review:", manual)

if __name__ == '__main__':
    main()
