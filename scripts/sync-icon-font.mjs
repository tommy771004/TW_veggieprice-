#!/usr/bin/env node
// Rebuilds the self-hosted Material Symbols subset.
//
// The full variable font from Google Fonts is ~3.9 MB. We only ship the glyphs
// the app can render: every snake_case token found in src/ that is also an
// official Material Symbols name. Over-matching (e.g. the word "home" in a
// comment) only costs a few bytes; under-matching would render the icon name
// as plain text, so the scan is deliberately broad and also covers icon names
// held in data objects (`icon: 'spa'`).
//
// Run after adding a new icon:  npm run icons:sync
// The output is checked by scripts/icon-font.test.js.

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const FONT_OUT = join(ROOT, 'public/fonts/material-symbols-outlined.woff2')
// Read at runtime by src/lib/iconFont.ts (iconOrFallback). JSON is not scanned,
// so the list never feeds itself.
const NAMES_OUT = join(ROOT, 'src/lib/iconFontNames.generated.json')
// Axes in use: FILL 0/1 and wght 300–600 (see fontVariationSettings in src).
const AXES = 'opsz,wght,FILL,GRAD@24,300..600,0..1,0'
const CODEPOINTS_URL =
  'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints'
// A modern UA so Google Fonts answers with woff2.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const TOKEN = /(?<![A-Za-z0-9_-])([a-z][a-z0-9]*(?:_[a-z0-9]+)*)(?![A-Za-z0-9_-])/g

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (['.ts', '.tsx', '.js', '.mjs', '.css', '.sql'].includes(extname(entry.name))) yield path
  }
}

async function fetchOk(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res
}

const official = new Set(
  (await (await fetchOk(CODEPOINTS_URL)).text()).split('\n').map((line) => line.split(' ')[0]).filter(Boolean),
)

// db/ holds the affiliates seed, whose `icon` column is data, not source.
// Offers added later must use a name from DATA_ICON_CHOICES (src/lib/iconFont.ts).
const names = new Set()
for (const dir of ['src', 'db']) {
  for await (const file of walk(join(ROOT, dir))) {
    const text = await readFile(file, 'utf8')
    for (const match of text.matchAll(TOKEN)) if (official.has(match[1])) names.add(match[1])
  }
}
const sorted = [...names].sort()

const cssUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${AXES}&display=block&icon_names=${sorted.join(',')}`
const css = await (await fetchOk(cssUrl, { headers: { 'User-Agent': UA } })).text()
// Subset kits have no file extension, so match on the declared format instead.
const fontUrl = css.match(/url\((https:[^)]+)\)\s*format\(['"]woff2['"]\)/)?.[1]
if (!fontUrl) throw new Error(`No woff2 in Google Fonts response:\n${css.slice(0, 300)}`)
const font = Buffer.from(await (await fetchOk(fontUrl)).arrayBuffer())

await writeFile(FONT_OUT, font)
await writeFile(NAMES_OUT, `${JSON.stringify({ axes: AXES, names: sorted }, null, 2)}\n`)
console.log(`${sorted.length} icons → ${relative(ROOT, FONT_OUT)} (${(font.length / 1024).toFixed(1)} KiB)`)
