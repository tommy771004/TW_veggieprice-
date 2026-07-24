import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { isLicensedRecipeImage } from './recipesCore.ts'

// Data-integrity guard over the real catalog. This is the enforcement half of
// the photo-licensing process (docs/recipe-image-licensing.md): a photo can only
// ship if it is null (icon fallback) or a fully specified open-licensed image.
const catalog = JSON.parse(
  readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'),
) as {
  recipes: Array<{ id: string; category: string; sourceIds: string[]; image: unknown }>
  sources: Record<string, unknown>
}

const CATEGORIES = new Set(['vegetable', 'fruit', 'meat', 'seafood'])

describe('recipes.json integrity', () => {
  it('every recipe image is either null or a fully licensed image', () => {
    const offenders = catalog.recipes
      .filter((recipe) => recipe.image != null && !isLicensedRecipeImage(recipe.image))
      .map((recipe) => recipe.id)
    assert.deepEqual(
      offenders,
      [],
      `these recipes have an image that is not null and not open-licensed: ${offenders.join(', ')}`,
    )
  })

  it('every recipe uses a known Produce Category', () => {
    const offenders = catalog.recipes
      .filter((recipe) => !CATEGORIES.has(recipe.category))
      .map((recipe) => recipe.id)
    assert.deepEqual(offenders, [])
  })

  it('every sourceId referenced by a recipe is defined in sources', () => {
    const offenders = catalog.recipes
      .filter((recipe) => recipe.sourceIds.some((id) => !(id in catalog.sources)))
      .map((recipe) => recipe.id)
    assert.deepEqual(offenders, [])
  })
})
