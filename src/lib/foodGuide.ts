import catalog from '@/data/food-guides.json'
import { getProduceCategory, type ProduceCategory } from '@/lib/produce'

type FoodGuideCategory = ProduceCategory

export type FoodGuideSource = {
  label: string
  url: string
}

type FoodGuideCategoryEntry = {
  label: string
  health: string
  plateTip: string
  production: string
  selection: string
  sourceIds: string[]
}

type FoodGuideItemEntry = {
  aliases: string[]
  health: string
  production: string
  selection: string
  sourceIds: string[]
}

type FoodGuideCatalog = {
  version: string
  lastReviewed: string
  sources: Record<string, FoodGuideSource>
  categories: Record<FoodGuideCategory, FoodGuideCategoryEntry>
  items: FoodGuideItemEntry[]
}

const foodGuideCatalog = catalog as FoodGuideCatalog

function findItemGuide(cropName: string) {
  return foodGuideCatalog.items
    .flatMap((item) => item.aliases.map((alias) => ({ item, alias })))
    .filter(({ alias }) => cropName.includes(alias))
    .sort((a, b) => b.alias.length - a.alias.length)[0]?.item
}

export function getFoodGuideAliases(cropName: string) {
  const itemGuide = findItemGuide(cropName)
  return [...new Set([cropName, ...(itemGuide?.aliases ?? [])])]
}

export function getFoodGuide(cropName: string) {
  const category = getProduceCategory(cropName)
  const categoryGuide = foodGuideCatalog.categories[category] ?? foodGuideCatalog.categories.vegetable
  const itemGuide = findItemGuide(cropName)
  const sourceIds = [...new Set([...(categoryGuide.sourceIds ?? []), ...(itemGuide?.sourceIds ?? [])])]

  return {
    category,
    categoryLabel: categoryGuide.label,
    health: itemGuide?.health ?? categoryGuide.health,
    plateTip: categoryGuide.plateTip,
    production: itemGuide?.production ?? categoryGuide.production,
    selection: itemGuide?.selection ?? categoryGuide.selection,
    isSpecific: Boolean(itemGuide),
    lastReviewed: foodGuideCatalog.lastReviewed,
    sources: sourceIds
      .map((sourceId) => foodGuideCatalog.sources[sourceId])
      .filter((source): source is FoodGuideSource => Boolean(source)),
  }
}
