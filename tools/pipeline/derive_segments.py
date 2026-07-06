#!/usr/bin/env python3
"""
derive_segments.py — Derive waqf segments for verses that have a pause mark but no
segments yet, using the waqf marks already in the data plus the (now real) word timings.

Segmentation rules (classical waqf handling):
  - A verse is split at each *boundary* waqf mark into pause-bounded segments.
  - Rub-el-Hizb (۞) is a section/navigation marker, NOT a pause -> never a boundary.
  - "laa" (ۙ, U+06D9) means DO NOT STOP -> never a boundary.
  - mu'anaqah (ۛ, U+06DB) comes in pairs; stop at exactly one -> collapse a pair to a
    single boundary (default: the second mark).
  - A mark at wordIndex 0 (verse start) never creates a leading empty segment.

This script only handles the SIMPLE case used for the initial "quick win" batch:
verses with exactly ONE boundary-eligible mark and no existing segments. It emits the
deterministic parts (arabic split, timing, startWord/endWord, type, waqfMark). The
translation/transliteration phrase split is filled in separately (LLM-assisted) and
merged via merge_segment_text.py.

Attribution: waqf marks from the project's existing enhanced data (Tanzil lineage);
word timings (c) Collin Fair / cpfair-quran-align (CC-BY 4.0).
"""
import json, re, argparse, glob, os

WAQF_SYMBOLS = set('ۖۗۘۙۚۛۜ۞ۤ۬ۨ')  # pause + section marks that may appear inline
RUB = '۞'      # U+06DE section marker — not a pause
LAA = 'ۙ'      # U+06D9 — do not stop
MUANAQAH = 'ۛ' # U+06DB — embracing stop (pairs)
AR_LETTER = re.compile(r'[ء-يٱ-ۓۺ-ۿ]')

# waqfMarks[].type (source vocab) -> segments[].type (display vocab)
TYPE_MAP = {
    'compulsory_stop': 'compulsory_stop', 'waqf_lazim': 'compulsory_stop',
    'sufficient_pause': 'sufficient_stop', 'sufficient_stop': 'sufficient_stop',
    'preferred_pause': 'preferred_pause', 'small_pause': 'sufficient_stop',
    'medium_pause': 'preferred_pause', 'waqf_e_jaiz': 'sufficient_stop',
    'emphasis_pause': 'emphasis_stop',
}

def is_spoken(tok): return bool(AR_LETTER.search(tok))

def boundary_marks(waqf_marks):
    """Return the mark objects that should create a segment boundary."""
    out = []
    for m in waqf_marks:
        ch = m.get('character', '')
        if ch == RUB or m.get('type') == 'rub_el_hizb':
            continue
        if ch == LAA:
            continue
        if m.get('wordIndex', 0) <= 0:
            continue
        out.append(m)
    # collapse mu'anaqah pairs -> keep only the second of each adjacent pair
    collapsed = []
    i = 0
    while i < len(out):
        if (i + 1 < len(out) and out[i].get('character') == MUANAQAH
                and out[i + 1].get('character') == MUANAQAH):
            collapsed.append(out[i + 1]); i += 2
        else:
            collapsed.append(out[i]); i += 1
    return collapsed

def split_arabic_on_mark(arabic, mark_char):
    """Split the verse arabic at the (single) mark char; segment 1 keeps the mark."""
    idx = arabic.find(mark_char)
    if idx == -1:
        return None
    cut = idx + len(mark_char)
    return arabic[:cut].strip(), arabic[cut:].strip()

def timing_split(timing_words, mark_char):
    """Find the complete-timings token index of the mark; return (endWord1, startWord2)."""
    for i, w in enumerate(timing_words):
        if w['word'].strip() == mark_char:
            return i, i + 1
    return None

def derive_simple(enh_verse, timing_verse):
    """Deterministic derivation for a single-boundary verse. Returns dict of parts or None."""
    marks = boundary_marks(enh_verse.get('waqfMarks') or [])
    if len(marks) != 1:
        return None, f"expected 1 boundary mark, got {len(marks)}"
    mark = marks[0]
    ch = mark['character']
    ar = split_arabic_on_mark(enh_verse['arabic'], ch)
    if not ar or not ar[0] or not ar[1]:
        return None, "arabic split failed"
    tw = timing_verse['words']
    ts = timing_split(tw, ch)
    if not ts:
        return None, "mark token not found in timings"
    end1, start2 = ts
    if end1 <= 0 or start2 >= len(tw):
        return None, "degenerate split index"
    seg_type = TYPE_MAP.get(mark.get('type'), 'sufficient_stop')
    # arabic reconstruction guard: seg1 + seg2 (normalised) must equal the source
    norm = lambda s: re.sub(r'\s+', ' ', s).strip()
    if norm(ar[0] + ' ' + ar[1]) != norm(enh_verse['arabic']):
        return None, "arabic reconstruction mismatch"
    return {
        'mark': ch, 'type': seg_type,
        'enhanced_segments': [
            {'arabic': ar[0], 'translation': None, 'transliteration': None,
             'type': seg_type, 'waqfMark': ch},
            {'arabic': ar[1], 'translation': None, 'transliteration': None,
             'type': 'verse_end'},
        ],
        'timing_segments': [
            {'segmentNumber': 1, 'start': tw[0]['start'], 'end': tw[end1]['end'],
             'startWord': 0, 'endWord': end1, 'wordCount': end1 + 1,
             'type': seg_type, 'waqfMark': ch},
            {'segmentNumber': 2, 'start': tw[start2]['start'], 'end': tw[-1]['end'],
             'startWord': start2, 'endWord': len(tw) - 1, 'wordCount': len(tw) - start2,
             'type': 'verse_end', 'waqfMark': None},
        ],
    }, "ok"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--enhanced-dir', required=True)
    ap.add_argument('--timings-dir', required=True)
    ap.add_argument('--out', required=True, help='payload of derivable quick-win verses')
    args = ap.parse_args()

    payload = []
    skipped = []
    for ef in sorted(glob.glob(os.path.join(args.enhanced_dir, '*.json'))):
        enh = json.load(open(ef))
        snum = enh['number']
        tf = os.path.join(args.timings_dir, f"surah_{snum:03d}_complete.json")
        timings = {v['verseNumber']: v for v in json.load(open(tf))}
        for v in enh['verses']:
            if v.get('segments'):
                continue
            marks = boundary_marks(v.get('waqfMarks') or [])
            if len(marks) != 1:
                continue
            vn = int(v['key'].split(':')[1])
            tv = timings.get(vn)
            if not tv:
                continue
            parts, reason = derive_simple(v, tv)
            if not parts:
                skipped.append({'verse': v['key'], 'reason': reason}); continue
            payload.append({
                'key': v['key'], 'surah': snum, 'verse': vn,
                'arabic': v['arabic'], 'translation': v['translation'],
                'transliteration': v['transliteration'],
                'words': [{'arabic': w['arabic'], 'translation': w.get('translation'),
                           'transliteration': w.get('transliteration')} for w in v['words']],
                'seg_arabic': [s['arabic'] for s in parts['enhanced_segments']],
                'type': parts['type'],
                'enhanced_segments': parts['enhanced_segments'],
                'timing_segments': parts['timing_segments'],
            })
    json.dump({'count': len(payload), 'verses': payload, 'skipped': skipped},
              open(args.out, 'w'), ensure_ascii=False, indent=2)
    print(f"derivable quick-win verses: {len(payload)}  skipped: {len(skipped)}")
    for s in skipped[:20]:
        print('   skip', s['verse'], s['reason'])

if __name__ == '__main__':
    main()
