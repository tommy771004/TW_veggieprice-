import {
  ALL_MARKET_SENTINEL,
  NATIONAL_OVERVIEW_LABEL,
} from '@/lib/constants'
import type { LivestockPrices, MarketOverview, PriceHistoryPoint } from '@/lib/types'
import { fetchLivestockPrices } from '@/lib/server/moa'
import {
  getMarketTrend,
  overviewFromSeries,
  trendAsHistoryPoints,
} from '@/lib/server/marketOverview'

/**
 * Server-side prefetch for the homepage default shell (ADR-0001 option D / F6).
 * Uses the same National Overview + vegetable category as HomeClient's first paint,
 * and embeds the static livestock summary so the section is usable before hydration.
 * Failures return null/empty so page.tsx still renders quickly and the client can retry.
 */
export async function prefetchDefaultHomeData(): Promise<{
  overview: MarketOverview | null
  trend: PriceHistoryPoint[]
  livestock: LivestockPrices | null
}> {
  const market = ALL_MARKET_SENTINEL
  const [trendResult, livestockResult] = await Promise.allSettled([
    getMarketTrend({ market, category: 'vegetable', days: 7 }),
    fetchLivestockPrices(),
  ])
  const livestock =
    livestockResult.status === 'fulfilled' ? livestockResult.value : null

  try {
    if (trendResult.status === 'rejected') {
      return { overview: null, trend: [], livestock }
    }

    const trendRes = trendResult.value
    if (trendRes.error || trendRes.points.length === 0) {
      return { overview: null, trend: [], livestock }
    }

    const trend = trendAsHistoryPoints(trendRes.points)
    const overview = overviewFromSeries(trendRes.points, NATIONAL_OVERVIEW_LABEL)

    return { overview, trend, livestock }
  } catch {
    return { overview: null, trend: [], livestock }
  }
}
