/**
 * Market → 北部／中部／南部／東部 region, shared by the search filter (server)
 * and the grouped market dropdowns (client) so a region's 均價 always covers
 * exactly the markets listed under that region.
 *
 * Resolution order:
 * 1. The curated fruit & vegetable market directory (covers 桃農、東勢鎮 …).
 * 2. The market → county table / keyword rules (covers 宜蘭地區、埔里鎮、員林鎮、
 *    flower markets such as 台北市場 …), then county → region.
 * Anything else (全部市場、全國平均、離島) has no region and is grouped as 其他.
 */
import { findMarket, MARKET_REGIONS } from './marketDirectory.ts'
import { resolveCountyFromMarketName } from './server/marketCountyMap.ts'

export type MarketRegion = (typeof MARKET_REGIONS)[number]

export const OTHER_REGION_LABEL = '其他'

/** Select value prefix for "a whole region", e.g. `region:北部`. */
export const REGION_VALUE_PREFIX = 'region:'

const COUNTY_REGION: Record<string, MarketRegion> = {
  臺北市: '北部',
  新北市: '北部',
  基隆市: '北部',
  桃園市: '北部',
  新竹市: '北部',
  新竹縣: '北部',
  宜蘭縣: '北部',
  苗栗縣: '中部',
  臺中市: '中部',
  彰化縣: '中部',
  南投縣: '中部',
  雲林縣: '中部',
  嘉義市: '南部',
  嘉義縣: '南部',
  臺南市: '南部',
  高雄市: '南部',
  屏東縣: '南部',
  花蓮縣: '東部',
  臺東縣: '東部',
}

export function isMarketRegion(value: unknown): value is MarketRegion {
  return typeof value === 'string' && (MARKET_REGIONS as readonly string[]).includes(value)
}

export function resolveMarketRegion(marketName: string): MarketRegion | null {
  if (!marketName) return null
  const listed = findMarket(marketName)
  if (listed) return listed.region
  const county = resolveCountyFromMarketName(marketName)
  return COUNTY_REGION[county] ?? null
}

export function toRegionValue(region: MarketRegion): string {
  return `${REGION_VALUE_PREFIX}${region}`
}

/** `region:北部` → 北部; anything else → null. */
export function parseRegionValue(value: string | null | undefined): MarketRegion | null {
  if (!value || !value.startsWith(REGION_VALUE_PREFIX)) return null
  const region = value.slice(REGION_VALUE_PREFIX.length)
  return isMarketRegion(region) ? region : null
}

export interface MarketRegionGroup {
  region: MarketRegion | typeof OTHER_REGION_LABEL
  markets: string[]
}

/**
 * Group market names by region (北 → 中 → 南 → 東 → 其他), keeping each group's
 * input order. Names in `exclude` (e.g. 全部市場) are left out.
 */
export function groupMarketsByRegion(
  markets: readonly string[],
  exclude: readonly string[] = [],
): MarketRegionGroup[] {
  const buckets = new Map<MarketRegionGroup['region'], string[]>()
  for (const market of markets) {
    if (exclude.includes(market)) continue
    const region = resolveMarketRegion(market) ?? OTHER_REGION_LABEL
    const list = buckets.get(region) ?? []
    if (!list.includes(market)) list.push(market)
    buckets.set(region, list)
  }
  const order: MarketRegionGroup['region'][] = [...MARKET_REGIONS, OTHER_REGION_LABEL]
  return order
    .filter((region) => buckets.has(region))
    .map((region) => ({ region, markets: buckets.get(region)! }))
}

/** True when grouping is worth showing: at least two real regions are present. */
export function hasMultipleRegions(groups: readonly MarketRegionGroup[]): boolean {
  return groups.filter((group) => group.region !== OTHER_REGION_LABEL).length >= 2
}
