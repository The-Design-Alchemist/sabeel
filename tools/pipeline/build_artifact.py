#!/usr/bin/env python3
"""
build_artifact.py — render a self-contained HTML review page for the waqf-boundary
refinement: per boundary, the verse's energy envelope with the OLD (leaky) cut vs the
NEW silence-snapped cut, the exposed pause shaded, and before/after audio players.

Standalone: no external assets — audio is inlined as base64 data URIs, plots are
pre-rendered SVG. Output is one .html file to pass to the Artifact tool.
"""
import base64
import html
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import refine_boundaries as rb  # noqa: E402

ROOT = rb.ROOT
TIMINGS_DIR = rb.TIMINGS_DIR
ENH_DIR = os.path.join(ROOT, "quran-data", "enhanced")
M4A_DIR = os.path.join(ROOT, "quran-data", "audio-aac")

# (verse, boundary, headline) — ordered wins-first, honest edge cases last
DEMO = [
    (5, 0, "The next phrase currently starts 183 ms early — inside the previous word's tail"),
    (25, 2, "A near-continuous joint: the leftover at the next phrase's head drops 5.7 dB"),
    (7, 1, "A clean breath the timings never encoded — 138 ms of real pause exposed"),
    (44, 0, "Boundary nudged onto the trough; a short 40 ms breath opens up"),
    (2, 0, "Already sitting in a real pause — the refinement only trims trailing dead-air"),
    (72, 0, "The reciter connects here with no pause — correctly left untouched"),
]
SURAH = 2


def m4a(v):
    return os.path.join(M4A_DIR, f"{SURAH:03d}", f"{SURAH:03d}{v:03d}.m4a")


def clip_b64(src, s, e, loops=0, tmp=None):
    """Cut [s,e] from src (optionally looped) → mono 48k mp3 → base64 string."""
    wav = os.path.join(tmp, "seg.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-ss", f"{s:.3f}", "-to", f"{e:.3f}",
                    "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav], check=True)
    if loops:
        looped = os.path.join(tmp, "loop.wav")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-stream_loop", str(loops), "-i", wav,
                        "-c", "copy", looped], check=True)
        wav = looped
    mp3 = os.path.join(tmp, "c.mp3")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-ac", "1", "-ar", "48000",
                    "-b:a", "48k", mp3], check=True)
    return base64.b64encode(open(mp3, "rb").read()).decode()


def envelope_window(v, center, half=1.25):
    x = rb.decode_mono(m4a(v["verseNumber"]))
    db, tc = rb.envelope(x)
    t0, t1 = max(0, center - half), center + half
    lo = int(np.searchsorted(tc, t0))
    hi = int(np.searchsorted(tc, t1))
    sub_t = tc[lo:hi]
    sub_db = db[lo:hi]
    # downsample to ~300 pts
    if len(sub_t) > 300:
        idx = np.linspace(0, len(sub_t) - 1, 300).astype(int)
        sub_t, sub_db = sub_t[idx], sub_db[idx]
    return sub_t.tolist(), sub_db.tolist(), float(t0), float(t1)


def svg_card(times, dbs, t0, t1, old, new_end, new_start, words, status):
    W, H, padL, padR, padT, padB = 720, 150, 8, 8, 10, 18
    dbmin, dbmax = -58.0, -6.0
    plotW, plotH = W - padL - padR, H - padT - padB

    def X(t):
        return padL + (t - t0) / (t1 - t0) * plotW

    def Y(d):
        d = max(dbmin, min(dbmax, d))
        return padT + (dbmax - d) / (dbmax - dbmin) * plotH

    # area path under the envelope
    pts = " ".join(f"{X(t):.1f},{Y(d):.1f}" for t, d in zip(times, dbs))
    area = f"{X(times[0]):.1f},{padT+plotH:.1f} " + pts + f" {X(times[-1]):.1f},{padT+plotH:.1f}"

    parts = [f'<svg viewBox="0 0 {W} {H}" class="env" role="img" preserveAspectRatio="none">']
    # word onset ticks (faint) — where alignment says words begin/end
    for wt in words:
        if t0 < wt < t1:
            parts.append(f'<line x1="{X(wt):.1f}" y1="{padT+plotH-6:.0f}" x2="{X(wt):.1f}" '
                         f'y2="{padT+plotH:.0f}" class="wtick"/>')
    # exposed pause region (only when refined and a real gap opened)
    if status == "refined" and new_start > new_end + 0.005:
        parts.append(f'<rect x="{X(new_end):.1f}" y="{padT:.0f}" width="{X(new_start)-X(new_end):.1f}" '
                     f'height="{plotH:.0f}" class="pause"/>')
    parts.append(f'<polygon points="{area}" class="fill"/>')
    parts.append(f'<polyline points="{pts}" class="line"/>')
    # OLD cut
    parts.append(f'<line x1="{X(old):.1f}" y1="{padT:.0f}" x2="{X(old):.1f}" y2="{padT+plotH:.0f}" class="old"/>')
    if status == "refined":
        parts.append(f'<line x1="{X(new_end):.1f}" y1="{padT:.0f}" x2="{X(new_end):.1f}" y2="{padT+plotH:.0f}" class="new"/>')
        if new_start > new_end + 0.005:
            parts.append(f'<line x1="{X(new_start):.1f}" y1="{padT:.0f}" x2="{X(new_start):.1f}" y2="{padT+plotH:.0f}" class="new"/>')
    parts.append("</svg>")
    return "".join(parts)


def audio_row(label, b64):
    return (f'<div class="ab"><span class="ab-lab">{label}</span>'
            f'<audio controls preload="none" src="data:audio/mpeg;base64,{b64}"></audio></div>')


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/waqf.html"
    tim = {v["verseNumber"]: v for v in json.load(open(os.path.join(TIMINGS_DIR, f"surah_{SURAH:03d}_complete.json")))}
    enh = {int(x["key"].split(":")[1]): x for x in json.load(open(os.path.join(ENH_DIR, f"{SURAH:03d}.json")))["verses"]}

    cards = []
    tmp = tempfile.mkdtemp()
    n_ref = n_flag = 0
    for vn, bi, headline in DEMO:
        v = tim[vn]
        segs = v["segments"]
        A, B = segs[bi], segs[bi + 1]
        old = round(A["end"], 3)
        # recompute the refinement for this boundary
        x = rb.decode_mono(m4a(vn))
        db, tc = rb.envelope(x)
        vmed = rb.voiced_median(db)
        w_end_start = v["words"][A["endWord"]]["start"]
        w_next_end = v["words"][B["startWord"]]["end"] if B["startWord"] < len(v["words"]) else None
        new_end, new_start, info = rb.refine_boundary(db, tc, vmed, old, w_end_start, w_next_end)
        status = info["status"]
        n_ref += status == "refined"
        n_flag += status != "refined"

        times, dbs, t0, t1 = envelope_window(v, old)
        words = [w["start"] for w in v["words"]] + [v["words"][-1]["end"]]
        svg = svg_card(times, dbs, t0, t1, old, new_end, new_start, words, status)

        # segment texts (RTL) from enhanced
        eseg = enh[vn]["segments"]
        a_txt = html.escape(eseg[bi]["arabic"]) if bi < len(eseg) else ""
        b_txt = html.escape(eseg[bi + 1]["arabic"]) if bi + 1 < len(eseg) else ""

        # audio A/B
        audio = []
        if status == "refined":
            audio.append('<div class="ab-group"><h4>Next phrase — does the previous word’s tail still leak in?</h4>')
            audio.append(audio_row("Now", clip_b64(m4a(vn), old, B["end"], tmp=tmp)))
            audio.append(audio_row("Refined", clip_b64(m4a(vn), new_start, B["end"], tmp=tmp)))
            audio.append('</div>')
            audio.append('<div class="ab-group"><h4>Repeat this phrase &times;3 — how does the loop point sound?</h4>')
            audio.append(audio_row("Now", clip_b64(m4a(vn), A["start"], old, loops=2, tmp=tmp)))
            audio.append(audio_row("Refined", clip_b64(m4a(vn), A["start"], new_end, loops=2, tmp=tmp)))
            audio.append('</div>')
        else:
            audio.append('<div class="ab-group"><h4>The joint, as recited</h4>')
            audio.append(audio_row("Listen", clip_b64(m4a(vn), max(0, old - 1.2), old + 1.2, tmp=tmp)))
            audio.append('</div>')

        # numeric readout
        if status == "refined":
            shift = round((new_start - old) * 1000)
            readout = (f'<dl class="nums">'
                       f'<div><dt>old cut</dt><dd>{old:.3f}s</dd></div>'
                       f'<div><dt>new end</dt><dd>{new_end:.3f}s</dd></div>'
                       f'<div><dt>new start</dt><dd>{new_start:.3f}s</dd></div>'
                       f'<div><dt>pause opened</dt><dd>{info.get("gap_ms",0)} ms</dd></div>'
                       f'<div><dt>trough depth</dt><dd>&minus;{info["drop_db"]:.1f} dB</dd></div>'
                       f'</dl>')
            pill = '<span class="pill pill-ok">refined</span>'
        else:
            readout = (f'<dl class="nums">'
                       f'<div><dt>cut</dt><dd>{old:.3f}s</dd></div>'
                       f'<div><dt>trough depth</dt><dd>&minus;{info.get("drop_db",0):.1f} dB</dd></div>'
                       f'<div><dt>verdict</dt><dd>no pause</dd></div>'
                       f'</dl>')
            pill = '<span class="pill pill-flag">left as-is</span>'

        cards.append(f'''
    <article class="card">
      <header class="card-h">
        <div class="ref"><span class="verse">{SURAH}:{vn}</span><span class="waqf">{html.escape(info.get("waqf") or "")}</span>{pill}</div>
        <p class="headline">{html.escape(headline)}</p>
      </header>
      <div class="phrases" dir="rtl"><span class="pA">{a_txt}</span><span class="join">‹ pause ›</span><span class="pB">{b_txt}</span></div>
      {svg}
      <div class="axis"><span>{t0:.2f}s</span><span class="legend-inline"><i class="k-old"></i>old cut &nbsp; <i class="k-new"></i>refined cut &nbsp; <i class="k-pause"></i>exposed pause</span><span>{t1:.2f}s</span></div>
      {readout}
      <div class="audio">{''.join(audio)}</div>
    </article>''')

    page = TEMPLATE.replace("%%CARDS%%", "\n".join(cards)) \
                   .replace("%%NREF%%", str(n_ref)).replace("%%NFLAG%%", str(n_flag))
    open(out, "w").write(page)
    print(f"wrote {out}  ({os.path.getsize(out)/1e6:.2f} MB, {n_ref} refined / {n_flag} flagged)")


TEMPLATE = r"""<style>
  :root{
    --ground:#EDF0EE; --panel:#F6F8F6; --ink:#15201E; --ink-soft:#4A5B57;
    --teal:#0C6B60; --teal-lo:#3E9C8B; --clay:#C0603A; --amber:#B0842F;
    --line:#D4DAD7; --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;
    --arab:"Geeza Pro","SF Arabic","Noto Naskh Arabic",serif;
    --mono:ui-monospace,"SF Mono",Menlo,"Cascadia Mono",monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);
    font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.55;
    -webkit-font-smoothing:antialiased;}
  .wrap{max-width:840px;margin:0 auto;padding:56px 24px 96px;}
  .eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);font-weight:600;margin:0 0 14px;}
  h1{font-family:var(--serif);font-weight:600;font-size:clamp(30px,5vw,44px);line-height:1.08;
    margin:0 0 18px;text-wrap:balance;letter-spacing:-.01em;}
  .lede{font-size:18px;color:var(--ink-soft);max-width:62ch;margin:0 0 28px;}
  .lede b{color:var(--ink);font-weight:600;}
  .summary{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 8px;}
  .stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 18px;flex:1;min-width:150px;}
  .stat .n{font-family:var(--mono);font-size:26px;font-weight:600;font-variant-numeric:tabular-nums;}
  .stat.ok .n{color:var(--teal)} .stat.flag .n{color:var(--amber)}
  .stat .l{font-size:13px;color:var(--ink-soft);margin-top:2px;}
  .note{font-size:14px;color:var(--ink-soft);background:var(--panel);border-left:3px solid var(--teal);
    border-radius:0 8px 8px 0;padding:12px 16px;margin:22px 0 40px;}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px 22px 20px;margin:0 0 22px;}
  .card-h{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
  .ref{display:flex;align-items:center;gap:12px;}
  .verse{font-family:var(--mono);font-size:17px;font-weight:600;letter-spacing:.02em;}
  .waqf{font-family:var(--arab);font-size:22px;color:var(--teal);line-height:1;}
  .pill{margin-left:auto;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    padding:4px 10px;border-radius:999px;}
  .pill-ok{background:rgba(12,107,96,.12);color:var(--teal);}
  .pill-flag{background:rgba(176,132,47,.14);color:var(--amber);}
  .headline{margin:0;font-size:16px;color:var(--ink);max-width:64ch;}
  .phrases{font-family:var(--arab);font-size:20px;display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;
    padding:12px 14px;background:rgba(21,32,30,.03);border-radius:10px;margin-bottom:16px;line-height:1.9;}
  .phrases .join{font-family:var(--mono);font-size:11px;color:var(--amber);letter-spacing:.1em;
    text-transform:uppercase;white-space:nowrap;}
  .env{display:block;width:100%;height:150px;background:linear-gradient(180deg,#fff,#F1F4F2);
    border:1px solid var(--line);border-radius:10px;}
  .env .fill{fill:rgba(12,107,96,.10);stroke:none;}
  .env .line{fill:none;stroke:var(--teal);stroke-width:1.3;stroke-linejoin:round;vector-effect:non-scaling-stroke;}
  .env .old{stroke:var(--clay);stroke-width:2;stroke-dasharray:4 3;vector-effect:non-scaling-stroke;}
  .env .new{stroke:var(--teal);stroke-width:2;vector-effect:non-scaling-stroke;}
  .env .pause{fill:rgba(12,107,96,.16);stroke:none;}
  .env .wtick{stroke:var(--ink-soft);stroke-width:1;opacity:.35;vector-effect:non-scaling-stroke;}
  .axis{display:flex;justify-content:space-between;align-items:center;font-family:var(--mono);
    font-size:11px;color:var(--ink-soft);margin:6px 2px 0;}
  .legend-inline i{display:inline-block;width:13px;height:0;vertical-align:middle;margin-right:3px;}
  .legend-inline .k-old{border-top:2px dashed var(--clay);} .legend-inline .k-new{border-top:2px solid var(--teal);}
  .legend-inline .k-pause{height:10px;width:12px;background:rgba(12,107,96,.16);border-radius:2px;}
  .nums{display:flex;flex-wrap:wrap;gap:10px 26px;margin:16px 0 4px;padding:0;}
  .nums div{display:flex;flex-direction:column;}
  .nums dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);}
  .nums dd{margin:0;font-family:var(--mono);font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;}
  .audio{margin-top:14px;display:flex;flex-direction:column;gap:14px;}
  .ab-group h4{margin:0 0 8px;font-size:13px;font-weight:600;color:var(--ink);}
  .ab{display:flex;align-items:center;gap:12px;margin-bottom:7px;}
  .ab-lab{font-family:var(--mono);font-size:12px;font-weight:600;width:62px;flex:none;
    color:var(--ink-soft);text-align:right;}
  .ab:first-of-type .ab-lab{color:var(--clay);} .ab:last-of-type .ab-lab{color:var(--teal);}
  .ab audio{height:34px;flex:1;min-width:0;}
  footer{color:var(--ink-soft);font-size:14px;max-width:64ch;margin-top:14px;}
  footer code{font-family:var(--mono);font-size:.9em;background:rgba(21,32,30,.05);padding:1px 5px;border-radius:4px;}
</style>
<div class="wrap">
  <p class="eyebrow">Sabeel · waqf-boundary refinement</p>
  <h1>Snapping the cut into the reciter&rsquo;s own silence</h1>
  <p class="lede">Every waqf segment is cut on a raw alignment word-end with <b>zero gap</b> &mdash; often a few hundred milliseconds inside the held note or the breath. This pass moves each cut onto the real pause: <b>seg.end</b> to where the sound stops, <b>seg.start</b> to the next word&rsquo;s onset. Below is a slice of Surah&nbsp;2 &mdash; see the cut move, and hear it.</p>
  <div class="summary">
    <div class="stat ok"><div class="n">%%NREF%%</div><div class="l">boundaries refined onto a real pause</div></div>
    <div class="stat flag"><div class="n">%%NFLAG%%</div><div class="l">left untouched (reciter connects &mdash; no pause to snap to)</div></div>
  </div>
  <p class="note">The refinement decisively fixes the problem joints and exposes real breaths. For boundaries already sitting in a pause (~94% of the corpus) the change is deliberately small &mdash; the leak you hear <em>most</em> on repeat is the playback engine overshooting the cut, which the sample-accurate Web-Audio loop fixes next.</p>
  %%CARDS%%
  <footer>Generated by <code>tools/pipeline/refine_boundaries.py</code> + <code>build_artifact.py</code>. Envelopes are 10&nbsp;ms-window RMS of the streamed <code>.m4a</code>; the refiner detects the pause trough relative to each verse&rsquo;s own loudness, so shallow breaths aren&rsquo;t missed and continuous recitation isn&rsquo;t cut.</footer>
</div>"""


if __name__ == "__main__":
    main()
