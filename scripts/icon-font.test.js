// Guards the self-hosted Material Symbols subset (scripts/sync-icon-font.mjs).
// A name missing from the subset renders as literal text ("arrow_back"), so any
// icon written in an icon <span> or an `icon:` data field must be in the list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SNAKE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (['.ts', '.tsx'].includes(extname(entry.name)) && !/\.test\.tsx?$/.test(entry.name)) yield path
  }
}

/** Icon names written literally in icon spans or `icon:` fields of one file. */
export function iconNamesIn(source) {
  const found = new Set()
  let from = 0
  for (;;) {
    const at = source.indexOf('material-symbols-outlined', from)
    if (at === -1) break
    const end = source.indexOf('</span>', at)
    if (end === -1) break
    // Skip `=>` inside attributes when looking for the end of the opening tag.
    let tagEnd = at
    do tagEnd = source.indexOf('>', tagEnd + 1)
    while (tagEnd !== -1 && source[tagEnd - 1] === '=')
    // Children of the span: bare text, or the branches of a ternary
    // (`a === 'up' ? 'arrow_upward' : 'remove'` yields only the branches).
    // A class constant far from any span (`const ROW_ICON = '…'`) is skipped.
    const children = end - at < 600 ? source.slice(tagEnd + 1, end) : ''
    for (const m of children.matchAll(/^\s*([a-z][a-z0-9_]*)\s*$|[?:]\s*['"]([a-z][a-z0-9_]*)['"]/gm)) {
      const name = m[1] ?? m[2]
      if (SNAKE.test(name)) found.add(name)
    }
    from = end
  }
  for (const m of source.matchAll(/\bicon:\s*['"]([a-z][a-z0-9_]*)['"]/g)) found.add(m[1])
  return found
}

async function loadSubset() {
  const { names } = JSON.parse(await readFile(join(ROOT, 'src/lib/iconFontNames.generated.json'), 'utf8'))
  return new Set(names)
}

test('data-driven icon choices and the affiliates seed are in the subset', async () => {
  const subset = await loadSubset()
  const lib = await readFile(join(ROOT, 'src/lib/iconFont.ts'), 'utf8')
  const choices = [...lib.slice(lib.indexOf('DATA_ICON_CHOICES'), lib.indexOf('] as const')).matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])
  assert.ok(choices.length > 20, 'DATA_ICON_CHOICES should be parsed')
  // `icon` values in the seed: every quoted snake_case token that is not a category.
  const categories = new Set(['all', 'vegetable', 'fruit', 'mushroom', 'flower', 'meat', 'seafood'])
  const seed = [...(await readFile(join(ROOT, 'db/affiliates.sql'), 'utf8')).matchAll(/'([a-z][a-z0-9_]*)'/g)]
    .map((m) => m[1])
    .filter((n) => !categories.has(n))
  const missing = [...new Set([...choices, ...seed])].filter((n) => !subset.has(n))
  assert.deepEqual(missing, [], 'Run `npm run icons:sync` (affiliate icons come from the database, not source)')
})

test('every icon used in src is in the self-hosted subset', async () => {
  const subset = await loadSubset()
  const missing = []
  for await (const file of walk(join(ROOT, 'src'))) {
    for (const name of iconNamesIn(await readFile(file, 'utf8'))) {
      if (!subset.has(name)) missing.push(`${name} (${file.slice(ROOT.length)})`)
    }
  }
  assert.deepEqual(missing, [], 'Run `npm run icons:sync` to rebuild public/fonts/material-symbols-outlined.woff2')
})

test('iconNamesIn reads span text, ternaries and icon fields', () => {
  const src = `
    <span className="material-symbols-outlined" aria-hidden="true">
      arrow_back
    </span>
    <span className="material-symbols-outlined">{open ? 'expand_less' : 'expand_more'}</span>
    const rows = [{ icon: 'spa' }]`
  assert.deepEqual([...iconNamesIn(src)].sort(), ['arrow_back', 'expand_less', 'expand_more', 'spa'])
})
