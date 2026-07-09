import { fetchSearchRecords, fetchTraceabilitySummary, fetchProductCostInsight } from '@/lib/server/moa'
import { getCropBaseInfo } from '@/lib/cropInfo'
import { getProduceCategory } from '@/lib/produce'
import { todayISO } from '@/lib/server/dateUtils'
import { resolveCountyFromTownship } from '@/lib/server/townshipCountyMap'
import { resolveCountyFromMarketName } from '@/lib/server/marketCountyMap'
import type { MarketComparison, TraceabilitySummaryItem, ProductCostInsight, CropInfo } from '@/lib/types'

export interface AggregatedMetadata {
  markets: MarketComparison[]
  traceability: TraceabilitySummaryItem[]
  costInsight: ProductCostInsight | null
  cropInfo: CropInfo
}

export async function fetchProduceMetadata(cropName: string): Promise<AggregatedMetadata> {
  const category = getProduceCategory(cropName)
  const marketType = category === 'fruit' ? 'Fruit'
    : category === 'meat' ? 'meat'
    : category === 'seafood' ? 'seafood'
    : category === 'flower' ? 'Flower'
    : 'Veg'

  const [marketsResult, traceResult, costResult] = await Promise.all([
    fetchSearchRecords({ cropName, date: todayISO(), marketType }).catch(() => ({ records: [] })),
    fetchTraceabilitySummary(cropName, 10).catch(() => ({ items: [] })),
    fetchProductCostInsight(cropName).catch(() => ({ insight: null }))
  ])

  const byMarket = new Map<string, { date: string; avgPrice: number; priceChange: number }>()
  const allRecords = marketsResult?.records ?? []
  for (const r of allRecords) {
    if (!r.marketName || !r.date || !(r.avgPrice > 0)) continue
    const existing = byMarket.get(r.marketName)
    if (!existing || r.date > existing.date) {
      byMarket.set(r.marketName, {
        date: r.date,
        avgPrice: r.avgPrice,
        priceChange: r.priceChange ?? 0,
      })
    }
  }
  const markets: MarketComparison[] = Array.from(byMarket.entries()).map(([marketName, rec]) => ({
    marketName,
    avgPrice: rec.avgPrice,
    priceChange: rec.priceChange,
  }))

  const traceItems = traceResult?.items ?? []
  const traceability = traceItems.slice(0, 5)

  const costInsight = costResult?.insight ?? null

  const base = getCropBaseInfo(cropName)
  let origin = base.staticOrigin

  if (traceItems.length > 0) {
    const countyCounts = new Map<string, number>()
    for (const item of traceItems) {
      const raw = (item.county ?? '').replace(/臺/g, '台').trim()
      const full = resolveCountyFromMarketName(raw).replace(/臺/g, '台').replace(/[市縣]$/, '')
      const county = full || resolveCountyFromTownship(raw) || raw.replace(/[市縣區鄉鎮]$/, '')
      if (county && county !== '未知' && county.length >= 2) {
        countyCounts.set(county, (countyCounts.get(county) ?? 0) + 1)
      }
    }
    if (countyCounts.size >= 2) {
      const top = [...countyCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c)
      origin = top.join('、')
    }
  }

  const cropInfo: CropInfo = {
    feature: base.feature,
    season: base.season,
    origin,
  }

  return {
    markets,
    traceability,
    costInsight,
    cropInfo,
  }
}
