#!/usr/bin/env python3
"""
build_duas.py — resolve curated dua verse-refs into app-ready dua JSON.

Input: a curation file (from the sabeel-dua-curation workflow) — categories -> topics ->
duas, each dua a {ref:"surah:ayah" | "sunnah", why}. For every Qur'anic ref we emit the
FULL verse verbatim (Arabic + Saheeh International + transliteration) from Sabeel's own
quran-data, plus the per-word timings from complete-timings so the Dua reader can play the
verse audio and highlight word-by-word — reusing the exact Qur'an-reader stack. No text is
trimmed or fabricated. Sunnah refs (not in the Qur'an, so no recitation audio) are skipped.

Output: app/public/dua-data/<category>.json.

  python3 tools/pipeline/build_duas.py <curation.json>
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENH = os.path.join(ROOT, "quran-data", "enhanced")
TIM = os.path.join(ROOT, "quran-data", "complete-timings")
OUT = os.path.join(ROOT, "app", "public", "dua-data")

# ---- verified verse text + surah names --------------------------------------
VERSES = {}
for f in glob.glob(os.path.join(ENH, "*.json")):
    for v in json.load(open(f))["verses"]:
        VERSES[v["key"]] = v

SURAH_NAMES = {}
_s = open(os.path.join(ROOT, "app", "src", "data", "surahs.ts")).read()
for m in re.finditer(r'"id":\s*(\d+),\s*"englishName":\s*"([^"]+)"', _s):
    SURAH_NAMES[int(m.group(1))] = m.group(2)

# ---- per-verse word timings (lazily, one surah file at a time) ---------------
_tim_cache = {}
def verse_words(surah, ayah):
    """[{w, s, e}] for a verse, from complete-timings; [] if unavailable."""
    if surah not in _tim_cache:
        path = os.path.join(TIM, f"surah_{surah:03d}_complete.json")
        try:
            arr = json.load(open(path))
            _tim_cache[surah] = {v["verseNumber"]: v.get("words") or [] for v in arr}
        except FileNotFoundError:
            _tim_cache[surah] = {}
    words = _tim_cache[surah].get(ayah, [])
    return [{"w": w["word"], "s": round(w["start"], 3), "e": round(w["end"], 3)} for w in words]


def resolve(ref, why):
    if ref == "sunnah" or ":" not in ref:
        # Not in the Qur'an → no recitation audio yet. Held out until a text + audio source
        # is added; never fabricated here.
        return {"_pending": True}
    v = VERSES.get(ref)
    if not v:
        return None  # unknown ref — dropped (logged)
    surah, ayah = (int(x) for x in ref.split(":"))
    words = verse_words(surah, ayah)
    entry = {
        "id": ref.replace(":", "-"),
        "reference": f"Sūrah {SURAH_NAMES.get(surah, surah)} · {ref}",
        "surah": surah,
        "ayah": ayah,
        "arabic": v["arabic"].strip(),
        "transliteration": v["transliteration"].strip(),
        "translation": v["translation"].strip(),
        "words": words,  # per-word timings for highlighting (empty ⇒ plain playback)
        "source": "quran",
    }
    return entry, bool(words)


def main():
    if len(sys.argv) < 2:
        print("usage: build_duas.py <curation.json>")
        return
    curation = json.load(open(sys.argv[1]))
    cats = curation.get("categories") or curation
    os.makedirs(OUT, exist_ok=True)
    for cat in cats:
        cid = cat["categoryId"]
        topics, dropped, pending, no_timing = [], [], 0, []
        for t in cat["topics"]:
            duas = []
            for d in t["duas"]:
                r = resolve(d["ref"], d["why"])
                if r is None:
                    dropped.append(d["ref"])
                    continue
                if isinstance(r, dict) and r.get("_pending"):  # Sunnah — omit until sourced
                    pending += 1
                    continue
                entry, has_timing = r
                if not has_timing:
                    no_timing.append(d["ref"])
                duas.append(entry)
            if duas:
                topics.append({"id": t["id"], "name": t["name"], "arabicName": t["arabicName"], "duas": duas})
        out = {"id": cid, "topics": topics,
               "_note": "Qur'anic verses verbatim from Sabeel's verified quran-data, with per-word timings for recitation + highlighting. Sunnah duas are not yet included (need a sourced text + audio)."}
        json.dump(out, open(os.path.join(OUT, f"{cid}.json"), "w"), ensure_ascii=False, indent=2)
        n = sum(len(t["duas"]) for t in topics)
        msg = f"{cid}: {len(topics)} topics, {n} duas ({pending} sunnah held)"
        if no_timing:
            msg += f"  NO-TIMING: {no_timing}"
        if dropped:
            msg += f"  DROPPED: {dropped}"
        print(msg)


if __name__ == "__main__":
    main()
