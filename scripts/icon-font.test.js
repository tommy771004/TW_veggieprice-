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

test('every icon used in src is in the self-hosted subset', async () => {
  const { names } = JSON.parse(await readFile(join(ROOT, 'scripts/icon-font-names.json'), 'utf8'))
  const subset = new Set(names)
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
