// Thin data layer over the recipes.json catalog. Wires the static catalog into
// the pure recipesCore selection logic and exposes UI-friendly helpers. Kept
// separate from recipesCore.ts so the core stays unit-testable without importing
// JSON or `@/…` paths (mirrors produce.ts ↔ produceCategory.ts).

import catalog from '@/data/recipes.json'
import {
  getRecipesByCategory as filterByCategory,
  isLicensedRecipeImage,
  nextRevealCount,
  pickDailyFeatured,
  seededShuffle,
  type RecipeCategory,
  type RecipeImage,
} from '@/lib/recipesCore'

export type { RecipeCategory, RecipeImage }
export { isLicensedRecipeImage, nextRevealCount }

export interface RecipeSource {
  label: string
  url: string
}

export interface Recipe {
  id: string
  name: string
  category: RecipeCategory
  mainIngredient: string
  relatedIngredients?: string[]
  timeMinutes?: number
  difficulty?: string
  servings?: string
  tags?: string[]
  ingredients: string[]
  steps: string[]
  tip?: string
  sourceIds: string[]
  // null → CropIcon fallback. A photo may only be set once it clears the
  // licensing guard (see docs/recipe-image-licensing.md).
  image?: RecipeImage | null
}

const RECIPES = catalog.recipes as unknown as Recipe[]
const SOURCES = catalog.sources as Record<string, RecipeSource>

export interface RecipeCategoryTab {
  value: RecipeCategory
  label: string
  emoji: string
}

/**
 * The recipe section's own tab row. Deliberately limited to the categories that
 * actually have recipes — no 花卉 (inedible) or 菇類 (folded into vegetables).
 */
export const RECIPE_CATEGORY_TABS: RecipeCategoryTab[] = [
  { value: 'vegetable', label: '蔬菜', emoji: '🥬' },
  { value: 'fruit', label: '水果', emoji: '🍎' },
  { value: 'meat', label: '肉品家禽', emoji: '🐖' },
  { value: 'seafood', label: '漁產', emoji: '🐟' },
]

const CATEGORY_LABEL: Record<RecipeCategory, string> = {
  vegetable: '蔬菜',
  fruit: '水果',
  meat: '肉品家禽',
  seafood: '漁產',
}

export function getRecipeCategoryLabel(category: RecipeCategory): string {
  return CATEGORY_LABEL[category]
}

export function getRecipesByCategory(category: RecipeCategory): Recipe[] {
  return filterByCategory(RECIPES, category)
}

/** The full category list in deterministic daily order (stable per category + date). */
export function getDailyOrderedRecipes(category: RecipeCategory, dateKey: string): Recipe[] {
  return pickDailyFeatured(RECIPES, category, dateKey, Number.MAX_SAFE_INTEGER)
}

/** Reshuffle a list with an explicit seed — used by the 換一批 action. */
export function shuffleRecipes(recipes: Recipe[], seed: number): Recipe[] {
  return seededShuffle(recipes, seed)
}

export function resolveRecipeSources(sourceIds: string[]): RecipeSource[] {
  return sourceIds.map((id) => SOURCES[id]).filter(Boolean)
}

/**
 * Today's date key (YYYY-MM-DD) in Asia/Taipei's fixed UTC+8 offset. Formatting
 * from UTC parts keeps server and client identical regardless of ICU locale data,
 * matching the app's other Taipei date handling — this is what keeps the daily
 * selection SSR-stable.
 */
export function getTaipeiDateKey(now: number = Date.now()): string {
  const d = new Date(now + 8 * 60 * 60 * 1000)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
