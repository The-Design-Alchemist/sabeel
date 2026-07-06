#!/usr/bin/env python3
"""
merge_segments.py — Merge the deterministic segment parts (from derive_segments.py)
with the LLM-produced translation/transliteration phrase splits, validate, and write
into both enhanced/*.json and complete-timings/*.json.

Inputs:
  --payload  quickwin_payload.json  (deterministic: arabic split + timing + type)
  --llm      quickwin_llm_output.json ([{key, seg1_translation, seg2_translation,
                                         seg1_transliteration, seg2_transliteration}])
Writes the assembled `segments` arrays in place (unless --dry-run).
"""
import json, argparse, re, os

def norm(s): return re.sub(r'\s+', ' ', (s or '')).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--payload', required=True)
    ap.add_argument('--llm', required=True)
    ap.add_argument('--enhanced-dir', required=True)
    ap.add_argument('--timings-dir', required=True)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    payload = {v['key']: v for v in json.load(open(args.payload))['verses']}
    llm = {x['key']: x for x in json.load(open(args.llm))}

    errors = []
    for key, p in payload.items():
        L = llm.get(key)
        if not L:
            errors.append(f"{key}: missing LLM output"); continue
        for fld in ('seg1_translation', 'seg2_translation', 'seg1_transliteration', 'seg2_transliteration'):
            if not norm(L.get(fld)):
                errors.append(f"{key}: empty {fld}")
    if errors:
        print("VALIDATION ERRORS (nothing written):")
        for e in errors: print("  ", e)
        return

    # assemble per surah
    by_surah = {}
    for key, p in payload.items():
        by_surah.setdefault(p['surah'], []).append((p['verse'], key))

    updated = 0
    for surah, verses in sorted(by_surah.items()):
        ef = os.path.join(args.enhanced_dir, f"{surah:03d}.json")
        tf = os.path.join(args.timings_dir, f"surah_{surah:03d}_complete.json")
        enh = json.load(open(ef))
        tim = json.load(open(tf))
        enh_by = {v['key']: v for v in enh['verses']}
        tim_by = {v['verseNumber']: v for v in tim}
        for vnum, key in verses:
            p = payload[key]; L = llm[key]
            es = [dict(s) for s in p['enhanced_segments']]
            es[0]['translation'] = norm(L['seg1_translation'])
            es[0]['transliteration'] = norm(L['seg1_transliteration'])
            es[1]['translation'] = norm(L['seg2_translation'])
            es[1]['transliteration'] = norm(L['seg2_transliteration'])
            # arabic reconstruction guard (segments must recompose the verse text)
            if norm(es[0]['arabic'] + ' ' + es[1]['arabic']) != norm(enh_by[key]['arabic']):
                print(f"  SKIP {key}: arabic reconstruction mismatch"); continue
            enh_by[key]['segments'] = es
            tim_by[vnum]['segments'] = p['timing_segments']
            updated += 1
        if args.apply:
            open(ef, 'w').write(json.dumps(enh, ensure_ascii=False, indent=2))
            open(tf, 'w').write(json.dumps(tim, ensure_ascii=False, indent=2))

    print(f"[{'APPLIED' if args.apply else 'DRY-RUN'}] segmented {updated} quick-win verses")

if __name__ == '__main__':
    main()
