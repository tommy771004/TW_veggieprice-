import referenceData from '@/data/generated/government-reference.json'
import { getFoodGuideAliases } from '@/lib/foodGuide'

type NutrientValues = {
  energyKcal?: number
  proteinG?: number
  fiberG?: number
  potassiumMg?: number
  vitaminCMg?: number
}

type NutritionSample = {
  id: string
  sampleName: string
  aliases: string[]
  category: string
  description: string
  nutrients: NutrientValues
}

type SeasonalCrop = {
  crop: string
  months: number[]
  origins: Array<{ county: string; towns: string[] }>
}

type OriginPrice = {
  productName: string
  year: number
  month: number
  period: string
  averagePrice: number
  reporterCount: number
}

type GovernmentReferenceData = {
  generatedAt: string
  nutrition: NutritionSample[]
  seasonal: SeasonalCrop[]
  originPrices: OriginPrice[]
}

const data = referenceData as GovernmentReferenceData

function normalizeName(value: string) {
  return value
    .replace(/臺/g, '台')
    .replace(/[\s　]/g, '')
    .replace(/[()（）\[\]【】]/g, '')
    .replace(/[-－]/g, '')
    .toLowerCase()
}

function scoreCandidate(cropName: string, candidateName: string, aliases: string[] = []) {
  const crop = normalizeName(cropName)
  const candidate = normalizeName(candidateName)
  const normalizedAliases = aliases.map(normalizeName)

  if (crop === candidate) return 100
  if (normalizedAliases.includes(crop)) return 96
  if (candidate.startsWith(crop) && crop.length >= 2) return 88
  if (crop.startsWith(candidate) && candidate.length >= 2) return 82
  if (normalizedAliases.some((alias) => alias.startsWith(crop) && crop.length >= 2)) return 80
  if (candidate.includes(crop) && crop.length >= 2) return 72
  if (normalizedAliases.some((alias) => alias.includes(crop) && crop.length >= 2)) return 70
  return 0
}

function findBestMatch<T>(
  cropName: string,
  entries: T[],
  nameFor: (entry: T) => string,
  aliasesFor: (entry: T) => string[] = () => [],
) {
  let best: { entry: T; score: number } | null = null
  const searchTerms = getFoodGuideAliases(cropName)

  for (const entry of entries) {
    const score = Math.max(...searchTerms.map((term) => scoreCandidate(term, nameFor(entry), aliasesFor(entry))))
    if (score > (best?.score ?? 0)) best = { entry, score }
  }

  return best && best.score >= 70 ? best.entry : null
}

export function getNutritionReference(cropName: string) {
  return findBestMatch(cropName, data.nutrition, (entry) => entry.sampleName, (entry) => entry.aliases)
}

export function getSeasonalReference(cropName: string) {
  return findBestMatch(cropName, data.seasonal, (entry) => entry.crop)
}

export function getOriginPriceReference(cropName: string) {
  return findBestMatch(cropName, data.originPrices, (entry) => entry.productName)
}

export function getGovernmentReferenceUpdatedAt() {
  return data.generatedAt
}
