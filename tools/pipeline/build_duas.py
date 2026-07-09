#!/usr/bin/env python3
"""
build_duas.py — resolve curated dua verse-refs into clean, TRIMMED dua JSON for the app.

Input: a curation file (from the sabeel-dua-curation workflow) — categories -> topics ->
duas, each dua a {ref:"surah:ayah" | "sunnah", why}. For every Qur'anic ref we pull the
EXACT verified Arabic + Saheeh International + transliteration from Sabeel's own quran-data
and trim it to the pure supplication (dropping narration like "They said,"). Sunnah refs are
emitted as placeholders flagged for a source (no text is ever fabricated).

Output: app/public/dua-data/<category>.json, each marked DRAFT — pending scholarly review.

  python3 tools/pipeline/build_duas.py <curation.json>
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENH = os.path.join(ROOT, "quran-data", "enhanced")
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

# ---- trimming to the pure supplication --------------------------------------
_MARKS = "".join(chr(c) for c in list(range(0x0610, 0x061B)) + list(range(0x064B, 0x0660)) + [0x0670] + list(range(0x06D6, 0x06EE)))
def _base(w):  # strip diacritics + normalize alef/hamza for prefix matching
    w = "".join(c for c in w if c not in _MARKS)
    return w.replace("ٱ", "ا").replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")

# CONSERVATIVE: only strip a leading "said/say" narration verb near the start. Never match
# words that could appear inside a supplication — so this can under-trim but never cut a dua.
def trim_arabic(s):
    """Return (text, trimmed). Only strips a leading qāla/qālū/yaqūlūn (± a waw) near the
    start; otherwise returns the whole verse unchanged so a dua is never cut."""
    toks = s.split()
    for i in range(min(len(toks), 6)):
        b = _base(toks[i]).lstrip("و")  # tolerate wa- prefix (وَقَالَ)
        if b.startswith("قال") or b.startswith("يقول"):
            rest = toks[i + 1:]
            if rest and _base(rest[0]) in ("ان", "انه", "اني"):
                rest = rest[1:]
            trimmed = " ".join(rest).strip()
            if trimmed:
                return trimmed, True
    return s.strip(), False

def trim_translit(s):
    w = s.split()
    for i in range(min(len(w), 6)):
        wl = w[i].lower().strip(',".')
        if wl == "wa" or wl == "wal":
            continue
        if wl.startswith("qaal") or wl.startswith("yaqool"):
            rest = w[i + 1:]
            if rest and rest[0].lower().strip(',".') in ("an", "annaa", "annee"):
                rest = rest[1:]
            return " ".join(rest).strip() or s.strip()
    return s.strip()

def trim_translation(s):
    # Saheeh International wraps a spoken dua in quotes: They said, "Our Lord, …".
    # Take the FIRST quoted segment (never spanning into trailing narration).
    q = [m.start() for m in re.finditer(r'"', s)]
    if len(q) >= 2:
        seg = s[q[0] + 1:q[1]].strip()
        if seg:
            return seg
    m = re.search(r'\b(Our Lord|My Lord|Guide us|There is no deity)\b', s)
    return s[m.start():].strip().strip('"') if m else s.strip()


def resolve(ref, why):
    if ref == "sunnah" or ":" not in ref:
        return {"id": re.sub(r"[^a-z0-9]+", "-", why.lower())[:40].strip("-") or "sunnah",
                "reference": "Sunnah — source needed", "arabic": "", "transliteration": "",
                "translation": why, "source": "sunnah", "_pending": True}
    v = VERSES.get(ref)
    if not v:
        return None  # unknown ref — dropped (logged)
    s = int(ref.split(":")[0])
    arabic, trimmed = trim_arabic(v["arabic"])
    # Only trim translit/translation when the Arabic was trimmed — keeps all three consistent
    # and avoids grabbing a wrong quoted fragment when the dua is embedded in a narrative verse.
    entry = {
        "id": ref.replace(":", "-"),
        "reference": f"Sūrah {SURAH_NAMES.get(s, s)} · {ref}",
        "arabic": arabic,
        "transliteration": trim_translit(v["transliteration"]) if trimmed else v["transliteration"].strip(),
        "translation": trim_translation(v["translation"]) if trimmed else v["translation"].strip(),
        "source": "quran",
    }
    # Flag for review only if it's a whole verse that does NOT already begin with a clear
    # dua opener (Rabb…/Ihdi…/Allāhumma…/Ḥasb…) — i.e. the dua is embedded mid-narrative.
    if not trimmed:
        first = _base(arabic.split()[0]) if arabic.split() else ""
        if not any(first.startswith(p) for p in ("رب", "اهد", "اللهم", "حسب")):
            entry["_review"] = True
    return entry


def main():
    if len(sys.argv) < 2:
        print("usage: build_duas.py <curation.json>")
        return
    curation = json.load(open(sys.argv[1]))
    cats = curation.get("categories") or curation
    os.makedirs(OUT, exist_ok=True)
    for cat in cats:
        cid = cat["categoryId"]
        topics, dropped, pending, review = [], [], 0, 0
        for t in cat["topics"]:
            duas = []
            for d in t["duas"]:
                r = resolve(d["ref"], d["why"])
                if r is None:
                    dropped.append(d["ref"])
                    continue
                if r.get("_pending"):  # Sunnah placeholder (no verified text yet) — omit from app
                    pending += 1
                    continue
                review += r.get("_review", False)
                duas.append(r)
            if duas:
                topics.append({"id": t["id"], "name": t["name"], "arabicName": t["arabicName"], "duas": duas})
        out = {"id": cid, "topics": topics,
               "_note": "DRAFT — Qur'anic text verbatim from Sabeel's verified data, conservatively auto-trimmed to the supplication; pending scholarly review. Entries flagged _review sit inside a narrative verse and still need trimming; Sunnah entries need a sourced text."}
        json.dump(out, open(os.path.join(OUT, f"{cid}.json"), "w"), ensure_ascii=False, indent=2)
        n = sum(len(t["duas"]) for t in topics)
        print(f"{cid}: {len(topics)} topics, {n} duas ({review} need-trim, {pending} sunnah-pending)"
              + (f"  DROPPED: {dropped}" if dropped else ""))


if __name__ == "__main__":
    main()
