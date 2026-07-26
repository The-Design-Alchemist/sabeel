#!/usr/bin/env node
/**
 * Minify the Qur'an JSON that Vite copies from public/ into dist/.
 *
 * The source data under quran-data/ is pretty-printed — good for diffing and for the Python
 * pipeline, wasteful to ship. It's ~29MB of whitespace-heavy JSON in the APK, all of which the
 * WebView has to read and parse on a low-end phone every time a surah is opened.
 *
 * Re-serializing it compactly cuts that by about a third. This runs on the *build output* only,
 * so the checked-in data (and the public/ symlinks pointing at it) are never touched.
 *
 * Idempotent: running it twice is a no-op the second time.
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const ROOT = new URL("../dist/quran-data/", import.meta.url).pathname

async function* jsonFiles(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return // dist/quran-data absent (e.g. a build that didn't copy public/) — nothing to do
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* jsonFiles(p)
    else if (e.name.endsWith(".json")) yield p
  }
}

let files = 0
let before = 0
let after = 0

for await (const file of jsonFiles(ROOT)) {
  const raw = await readFile(file, "utf8")
  let minified
  try {
    minified = JSON.stringify(JSON.parse(raw))
  } catch (err) {
    // Malformed data should fail the build loudly rather than ship a broken surah.
    console.error(`✗ ${file}: ${err.message}`)
    process.exit(1)
  }
  before += Buffer.byteLength(raw)
  after += Buffer.byteLength(minified)
  files++
  if (minified.length !== raw.length) await writeFile(file, minified)
}

if (!files) {
  console.log("minify-data: no JSON found under dist/quran-data — skipped")
} else {
  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  const saved = before ? Math.round((1 - after / before) * 100) : 0
  console.log(`minify-data: ${files} files, ${mb(before)}MB → ${mb(after)}MB (−${saved}%)`)
}
