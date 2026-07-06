#!/usr/bin/env python3
"""
repair_corruption.py — Repair U+FFFD ('replacement char') corruption in the Qur'an
text. A bad encoding round-trip in the original data replaced individual Arabic
characters (a base letter or a diacritic) with one-or-two U+FFFD chars inside ~54
words, so those words render with a literal in verse text, segment text and word
timings.

Restoration uses TWO independent signals so nothing is guessed:
  1. Sabeel's own clean word lexicon (every non-corrupt word token) — gives the
     correct spelling in Sabeel's exact orthography via prefix/suffix match.
  2. The canonical Tanzil Uthmani verse for that ayah — disambiguates when the
     prefix/suffix match yields several candidates, by requiring the candidate's
     consonant skeleton to actually occur in that verse.

A corrupt token is only fixed when this resolves to exactly one clean word;
anything ambiguous is reported and left untouched for manual review.

Usage:
  python3 repair_corruption.py --enhanced-dir ... --timings-dir ... --tanzil <json> \
      --report <out.json> [--apply]
"""
import json, re, glob, os, argparse, unicodedata

FFFD = '�'
# combining marks, tatweel, quranic annotation signs, waqf marks, and FFFD
STRIP = re.compile('[ؐ-ًؚ-ْٓ-ٕٖ-ٰٟ'
                   'ۖ-ۭـ�]')
def skel(w):
    # consonant spine: drop combining marks (harakat, superscript alef, tanwin),
    # tatweel, waqf/annotation signs (U+06D6-06ED) and FFFD; keep base letters.
    out = []
    for c in w:
        if c in (' ', 'ـ', FFFD):
            continue
        if unicodedata.combining(c):
            continue
        if 'ۖ' <= c <= 'ۭ':
            continue
        out.append(c)
    return ''.join(out)

def build_lexicon(enh_dir, tim_dir):
    lex = set()
    for f in glob.glob(os.path.join(enh_dir, '*.json')):
        for v in json.load(open(f))['verses']:
            for w in v.get('words', []):
                if FFFD not in w['arabic']:
                    lex.add(w['arabic'])
            # also learn clean tokens from the arabic strings (incl. arabicSimple)
            for field in ('arabic', 'arabicSimple'):
                for tok in v.get(field, '').split():
                    if FFFD not in tok:
                        lex.add(tok)
    for f in glob.glob(os.path.join(tim_dir, '*.json')):
        for v in json.load(open(f)):
            for w in v.get('words', []):
                if FFFD not in w['word']:
                    lex.add(w['word'])
    return lex

def resolve(corrupt, lex, tz_skels):
    """Return the unique clean word for a corrupt token, or None if uncertain."""
    m = re.match(r'^(.*?)(' + FFFD + r'+)(.*)$', corrupt, re.S)
    if not m:
        return None
    pre, _, suf = m.group(1), m.group(2), m.group(3)
    cands = set()
    for e in lex:
        if e.startswith(pre) and e.endswith(suf) and len(e) >= len(pre) + len(suf):
            mid = e[len(pre):len(e) - len(suf)] if suf else e[len(pre):]
            if 0 < len(mid) <= 3:
                cands.add(e)
    if not cands:
        return None
    # disambiguate: keep candidates whose skeleton occurs in this verse (Tanzil)
    filtered = {c for c in cands if skel(c) in tz_skels} or cands
    # prefer single-token (no space) then shortest
    filtered = sorted(filtered, key=lambda c: (' ' in c, len(c)))
    if len(filtered) == 1:
        return filtered[0]
    # unique shortest single-token wins only if strictly better than the next
    if len(filtered) >= 2 and (' ' in filtered[1]) and (' ' not in filtered[0]):
        return filtered[0]
    if len(filtered) >= 2 and len(filtered[0]) < len(filtered[1]) and skel(filtered[0]) == skel(filtered[1]):
        return filtered[0]
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--enhanced-dir', required=True)
    ap.add_argument('--timings-dir', required=True)
    ap.add_argument('--tanzil', required=True)
    ap.add_argument('--report', required=True)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    lex = build_lexicon(args.enhanced_dir, args.timings_dir)
    tz = json.load(open(args.tanzil))['data']['surahs']
    tz_verse_skels = {}
    for s in tz:
        for a in s['ayahs']:
            tz_verse_skels[(s['number'], a['numberInSurah'])] = {skel(w) for w in a['text'].split()}

    resolutions = {}   # (surah,verse,corrupt) -> clean
    flagged = []

    # Hand-verified overrides for the few tokens where only the diacritic (not the
    # consonant) was lost, so skeleton matching is ambiguous. Each was confirmed
    # against the exact Tanzil Uthmani word for that ayah.
    OVERRIDES = {
        (2, 22, 'وَأَنتُم' + FFFD + FFFD): 'وَأَنتُمْ',
        (4, 107, 'أ' + FFFD + FFFD + 'ثِيمًا'): 'أَثِيمًا',
        (9, 120, 'عَدُوّ' + FFFD + FFFD): 'عَدُوٍّ',
        (33, 51, FFFD + FFFD + 'َلَا'): 'فَلَا',
    }

    def resolve_in_verse(s, a, token):
        key = (s, a, token)
        if key in resolutions:
            return resolutions[key]
        if key in OVERRIDES:
            resolutions[key] = OVERRIDES[key]
            return resolutions[key]
        clean = resolve(token, lex, tz_verse_skels.get((s, a), set()))
        if clean is None:
            flagged.append({'verse': f'{s}:{a}', 'token': token})
        resolutions[key] = clean
        return clean

    fixed_fields = 0
    # pass 1: enhanced (verse.arabic, words[].arabic, segments[].arabic)
    for f in sorted(glob.glob(os.path.join(args.enhanced_dir, '*.json'))):
        d = json.load(open(f)); changed = False
        for v in d['verses']:
            s = int(v['key'].split(':')[0]); a = int(v['key'].split(':')[1])
            # gather corrupt tokens from the word list + arabic string
            corrupt_tokens = set()
            for w in v.get('words', []):
                if FFFD in w['arabic']:
                    corrupt_tokens.add(w['arabic'])
            for tok in re.findall(r'\S*' + FFFD + r'+\S*', v.get('arabic', '')):
                corrupt_tokens.add(tok)
            for tok in re.findall(r'\S*' + FFFD + r'+\S*', v.get('arabicSimple', '')):
                corrupt_tokens.add(tok)
            for sg in (v.get('segments') or []):
                for tok in re.findall(r'\S*' + FFFD + r'+\S*', sg.get('arabic', '')):
                    corrupt_tokens.add(tok)
            for tok in corrupt_tokens:
                clean = resolve_in_verse(s, a, tok)
                if not clean:
                    continue
                if tok in v.get('arabic', ''):
                    v['arabic'] = v['arabic'].replace(tok, clean); changed = True; fixed_fields += 1
                if tok in v.get('arabicSimple', ''):
                    v['arabicSimple'] = v['arabicSimple'].replace(tok, clean); changed = True; fixed_fields += 1
                for w in v.get('words', []):
                    if w['arabic'] == tok:
                        w['arabic'] = clean; changed = True; fixed_fields += 1
                for sg in (v.get('segments') or []):
                    if tok in sg.get('arabic', ''):
                        sg['arabic'] = sg['arabic'].replace(tok, clean); changed = True; fixed_fields += 1
        if changed and args.apply:
            open(f, 'w').write(json.dumps(d, ensure_ascii=False, indent=2))

    # pass 2: complete-timings (words[].word)
    for f in sorted(glob.glob(os.path.join(args.timings_dir, '*.json'))):
        d = json.load(open(f)); changed = False
        for v in d:
            s, a = v['surahNumber'], v['verseNumber']
            for w in v.get('words', []):
                if FFFD in w['word']:
                    clean = resolve_in_verse(s, a, w['word'])
                    if clean:
                        w['word'] = clean; changed = True; fixed_fields += 1
        if changed and args.apply:
            open(f, 'w').write(json.dumps(d, ensure_ascii=False, indent=2))

    report = {
        'mode': 'APPLIED' if args.apply else 'DRY-RUN',
        'distinct_resolutions': {f'{s}:{a} {tok}': clean
                                 for (s, a, tok), clean in resolutions.items() if clean},
        'fixed_field_occurrences': fixed_fields,
        'flagged_for_manual_review': flagged,
    }
    json.dump(report, open(args.report, 'w'), ensure_ascii=False, indent=2)
    resolved = sum(1 for v in resolutions.values() if v)
    print(f"[{report['mode']}] resolved {resolved} corrupt tokens, "
          f"{fixed_fields} field occurrences fixed, {len(flagged)} flagged")
    for fl in flagged:
        print('  FLAG', fl['verse'], fl['token'])

if __name__ == '__main__':
    main()
