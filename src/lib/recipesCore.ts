// Pure recipe selection logic. Kept free of `@/…` runtime imports so it is
// directly unit-testable under `node --test` (see recipesCore.test.ts),
// mirroring the produceCategory.ts / marketOverviewCore.ts pattern. The
// recipes.ts wrapper wires the recipes.json catalog into these functions.

export type RecipeCategory = 'vegetable' | 'fruit' | 'meat' | 'seafood'

/**
 * The only image licenses a recipe photo may carry. All are open licenses that
 * permit commercial redistribution with attribution (OGDL = 政府資料開放授權條款;
 * PDM = Public Domain Mark). "All rights reserved" government/third-party photos
 * are intentionally absent — they must never ship. See docs/recipe-image-licensing.md.
 */
export const RECIPE_IMAGE_LICENSES = [
  'OGDL-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC0-1.0',
  'PDM-1.0',
] as const

export type RecipeImageLicense = (typeof RECIPE_IMAGE_LICENSES)[number]

export interface RecipeImage {
  /** Path under /public (e.g. "/recipe-photos/xxx.jpg") or a data URI. */
  src: string
  license: RecipeImageLicense
  /** Required credit line shown with the photo. */
  attribution: string
  /** Where the image (and its license statement) was obtained. */
  sourceUrl: string
}

/**
 * True only for a fully specified, open-licensed image. A recipe with any other
 * `image` value (null, missing fields, or a non-allowed license) must fall back
 * to the CropIcon — this is the render-time half of the licensing guardrail.
 */
export function isLicensedRecipeImage(image: unknown): image is RecipeImage {
  if (!image || typeof image !== 'object') return false
  const candidate = image as Record<string, unknown>
  return (
    typeof candidate.src === 'string' &&
    candidate.src.length > 0 &&
    typeof candidate.attribution === 'string' &&
    candidate.attribution.length > 0 &&
    typeof candidate.sourceUrl === 'string' &&
    candidate.sourceUrl.length > 0 &&
    typeof candidate.license === 'string' &&
    (RECIPE_IMAGE_LICENSES as readonly string[]).includes(candidate.license)
  )
}

export function getRecipesByCategory<T extends { category: string }>(
  recipes: readonly T[],
  category: string,
): T[] {
  return recipes.filter((recipe) => recipe.category === category)
}

/** Small deterministic PRNG (mulberry32): same seed → same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Returns a new array with the same elements in a shuffled order. Deterministic
 * for a given seed (Fisher–Yates driven by a seeded PRNG); does not mutate input.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = items.slice()
  const rng = mulberry32(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Deterministic string → 32-bit seed (FNV-1a). */
function hashStringToSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Deterministically selects up to `count` recipes from a category for a given
 * calendar date. Same (category, dateKey) always yields the same picks; the
 * selection rotates from one date to the next. The seed folds in the category
 * so each category rotates independently on the same day.
 */
export function pickDailyFeatured<T extends { category: string }>(
  recipes: readonly T[],
  category: string,
  dateKey: string,
  count: number,
): T[] {
  const inCategory = getRecipesByCategory(recipes, category)
  const seed = hashStringToSeed(`${category}:${dateKey}`)
  return seededShuffle(inCategory, seed).slice(0, count)
}

/**
 * The next "查看更多" reveal count: advance `current` by `step`, capped at
 * `total` so it never overshoots the number of available recipes.
 */
export function nextRevealCount(current: number, total: number, step: number): number {
  return Math.min(current + step, total)
}
