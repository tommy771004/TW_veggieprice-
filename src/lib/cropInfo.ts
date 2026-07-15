// Static per-crop facts (feature / season / typical origin).
//
// Data lives in src/data/crop-base-info.json so we can grow coverage from
// MOA distinct base names without hardcoding fallbacks into the UI.
// Lookup returns null when there is no curated entry — callers must hide
// crop-brief UI rather than invent "天然新鮮農產品" placeholders.

import catalog from '../data/crop-base-info.json' with { type: 'json' }

export interface CropBaseEntry {
  feature: string
  season: string
  staticOrigin: string
}

export interface CropBaseCatalogItem extends CropBaseEntry {
  name: string
  aliases: string[]
}

const ITEMS = catalog.items as CropBaseCatalogItem[]

/** Flat map: every name + alias → entry (same object for aliases). */
function buildLookup(): Map<string, CropBaseEntry> {
  const map = new Map<string, CropBaseEntry>()
  for (const item of ITEMS) {
    const entry: CropBaseEntry = {
      feature: item.feature,
      season: item.season,
      staticOrigin: item.staticOrigin,
    }
    map.set(item.name, entry)
    for (const alias of item.aliases ?? []) {
      if (alias) map.set(alias, entry)
    }
  }
  return map
}

const LOOKUP = buildLookup()

/** Keys known to the catalog (primary names only) — used by search UI. */
export const CROP_BASE_INFO: Record<string, CropBaseEntry> = Object.fromEntries(
  ITEMS.map((item) => [
    item.name,
    {
      feature: item.feature,
      season: item.season,
      staticOrigin: item.staticOrigin,
    },
  ]),
)

/** MOA rows use `品名-品種` — match on base before the first dash. */
export function cropBaseName(cropName: string): string {
  const cleaned = cropName.trim()
  if (!cleaned) return ''
  const dash = cleaned.indexOf('-')
  return dash === -1 ? cleaned : cleaned.slice(0, dash).trim()
}

/**
 * Resolve curated intro for a wholesale crop name.
 * @returns null when no static entry exists (do not invent defaults).
 */
export function getCropBaseInfo(cropName: string): CropBaseEntry | null {
  const cleaned = cropName.trim()
  if (!cleaned) return null

  // 1) Exact full name (rare but allows grade-specific overrides later)
  const exact = LOOKUP.get(cleaned)
  if (exact) return exact

  // 2) Base before first "-" (甘藍-改良種 → 甘藍)
  const base = cropBaseName(cleaned)
  if (base && base !== cleaned) {
    const byBase = LOOKUP.get(base)
    if (byBase) return byBase
  } else if (base) {
    const byBase = LOOKUP.get(base)
    if (byBase) return byBase
  }

  // 3) Longest catalog key contained in the name (高麗菜心 → 高麗菜 / 甘藍 aliases)
  let best: CropBaseEntry | null = null
  let bestLen = 0
  for (const [key, entry] of LOOKUP) {
    if (key.length >= 2 && cleaned.includes(key) && key.length > bestLen) {
      best = entry
      bestLen = key.length
    }
  }
  return best
}

export function hasCropBaseInfo(cropName: string): boolean {
  return getCropBaseInfo(cropName) !== null
}
