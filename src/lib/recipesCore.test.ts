import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getRecipesByCategory,
  isLicensedRecipeImage,
  nextRevealCount,
  pickDailyFeatured,
  seededShuffle,
} from './recipesCore.ts'

// Small hand-built fixtures are the independent source of truth here — the real
// recipes.json is deliberately not used, so these tests describe behavior rather
// than mirror the catalog's current contents.
const fixture = [
  { id: 'v1', category: 'vegetable' },
  { id: 'f1', category: 'fruit' },
  { id: 'v2', category: 'vegetable' },
  { id: 's1', category: 'seafood' },
]

describe('getRecipesByCategory', () => {
  it('returns only recipes in the requested category, preserving order', () => {
    const result = getRecipesByCategory(fixture, 'vegetable')
    assert.deepEqual(
      result.map((r) => r.id),
      ['v1', 'v2'],
    )
  })
})

describe('seededShuffle', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  it('produces a deterministic permutation for a given seed', () => {
    const first = seededShuffle(items, 12345)
    const second = seededShuffle(items, 12345)

    // deterministic: the same seed always yields the same order
    assert.deepEqual(first, second)
    // permutation: exactly the same elements, nothing lost or duplicated
    assert.deepEqual([...first].sort(), [...items].sort())
    // pure: the input array is not mutated
    assert.deepEqual(items, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })
})

describe('pickDailyFeatured', () => {
  const recipes = [
    { id: 'v1', category: 'vegetable' },
    { id: 'v2', category: 'vegetable' },
    { id: 'v3', category: 'vegetable' },
    { id: 'v4', category: 'vegetable' },
    { id: 'v5', category: 'vegetable' },
    { id: 'v6', category: 'vegetable' },
    { id: 'f1', category: 'fruit' },
    { id: 'f2', category: 'fruit' },
  ]

  it('selects count items from the category deterministically, without duplicates', () => {
    const first = pickDailyFeatured(recipes, 'vegetable', '2026-07-24', 5)
    const second = pickDailyFeatured(recipes, 'vegetable', '2026-07-24', 5)

    // deterministic for the same (category, date)
    assert.deepEqual(first, second)
    assert.equal(first.length, 5)
    // only the requested category
    assert.ok(first.every((r) => r.category === 'vegetable'))
    // no duplicates
    assert.equal(new Set(first.map((r) => r.id)).size, 5)
  })

  it('returns all available when count exceeds the category size', () => {
    // only two fruit recipes exist in the fixture
    const picks = pickDailyFeatured(recipes, 'fruit', '2026-07-24', 5)
    assert.equal(picks.length, 2)
  })

  it('rotates the daily selection across different dates', () => {
    const dates = ['2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27', '2026-07-28']
    const selections = new Set(
      dates.map((date) =>
        pickDailyFeatured(recipes, 'vegetable', date, 3)
          .map((r) => r.id)
          .join(','),
      ),
    )
    // daily rotation means the featured set is not identical every day
    assert.ok(selections.size > 1)
  })
})

describe('nextRevealCount', () => {
  it('advances by the step', () => {
    assert.equal(nextRevealCount(5, 40, 5), 10)
  })

  it('caps at the total instead of overshooting', () => {
    assert.equal(nextRevealCount(38, 40, 5), 40)
  })

  it('stays at the total once everything is revealed', () => {
    assert.equal(nextRevealCount(40, 40, 5), 40)
  })
})

describe('isLicensedRecipeImage', () => {
  const valid = {
    src: '/recipe-photos/tomato-egg.jpg',
    license: 'OGDL-1.0',
    attribution: '農業部食農教育資訊整合平臺',
    sourceUrl: 'https://fae.moa.gov.tw/xxx',
  }

  it('accepts a fully specified, open-licensed image', () => {
    assert.equal(isLicensedRecipeImage(valid), true)
  })

  it('rejects a null / missing image (the icon-fallback case)', () => {
    assert.equal(isLicensedRecipeImage(null), false)
    assert.equal(isLicensedRecipeImage(undefined), false)
  })

  it('rejects an image missing required attribution or source', () => {
    assert.equal(isLicensedRecipeImage({ ...valid, attribution: '' }), false)
    assert.equal(isLicensedRecipeImage({ ...valid, sourceUrl: '' }), false)
    const { src: _omitSrc, ...noSrc } = valid
    assert.equal(isLicensedRecipeImage(noSrc), false)
  })

  it('rejects an image whose license is not on the allowed open-license list', () => {
    // "All rights reserved" / copyrighted government photos must never pass.
    assert.equal(isLicensedRecipeImage({ ...valid, license: 'ARR' }), false)
    assert.equal(isLicensedRecipeImage({ ...valid, license: 'copyright' }), false)
  })
})
