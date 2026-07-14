import { DEFAULT_MARKET } from '@/lib/constants'
import type { MarketOverview, PriceHistoryPoint } from '@/lib/types'
import { fetchMarketOverviewTrend } from '@/lib/server/moa'

/**
 * Server-side prefetch for the homepage default shell (ADR-0001 option D / F6).
 * Uses the same default market + vegetable category as HomeClient's first paint.
 * Failures return null/empty so page.tsx still renders quickly and the client can retry.
 */
export async function prefetchDefaultHomeData(): Promise<{
  overview: MarketOverview | null
  trend: PriceHistoryPoint[]
}> {
  const market = DEFAULT_MARKET

  try {
    const trendRes = await fetchMarketOverviewTrend(market, 7)
    if (trendRes.error || trendRes.points.length === 0) {
      return { overview: null, trend: [] }
    }

    const trend: PriceHistoryPoint[] = trendRes.points.map((point) => ({
      date: point.date,
      label: point.label,
      avgPrice: point.avgPrice,
      volume: point.volume,
    }))

    const recentTradingPoints = trendRes.points
      .slice()
      .reverse()
      .filter((point) => point.avgPrice !== null)

    if (recentTradingPoints.length === 0) {
      return { overview: null, trend }
    }

    const latestPoint = recentTradingPoints[0]
    const previousPoint = recentTradingPoints[1]
    const avgPrice = latestPoint.avgPrice ?? 0
    const totalVolume = latestPoint.volume ?? 0
    const previousAvgPrice = previousPoint?.avgPrice ?? 0
    const previousTotalVolume = previousPoint?.volume ?? 0

    const priceChange =
      previousAvgPrice > 0
        ? ((avgPrice - previousAvgPrice) / previousAvgPrice) * 100
        : 0
    const volumeChange =
      previousTotalVolume > 0
        ? ((totalVolume - previousTotalVolume) / previousTotalVolume) * 100
        : 0

    const overview: MarketOverview = {
      date: latestPoint.date,
      avgPrice: Math.round(avgPrice * 10) / 10,
      totalVolume: Math.round(totalVolume),
      priceChange: Math.round(priceChange * 10) / 10,
      volumeChange: Math.round(volumeChange * 10) / 10,
      marketName: market,
      updatedAt: new Date().toISOString(),
    }

    return { overview, trend }
  } catch {
    return { overview: null, trend: [] }
  }
}
