import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketOverviewTrend } from '@/lib/server/moa'
import { todayISO } from '@/lib/server/dateUtils'
import { DEFAULT_MARKET } from '@/lib/constants'

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const date = searchParams.get('date') || todayISO()

  const trendRes = await fetchMarketOverviewTrend(market, 7, date)

  if (trendRes.error) {
    const status = trendRes.error === '查無市場趨勢資料' ? 404 : 502
    return NextResponse.json({ error: trendRes.error }, { status })
  }

  const recentTradingPoints = trendRes.points
    .slice()
    .reverse()
    .filter((point) => point.avgPrice !== null)

  if (recentTradingPoints.length === 0) {
    return NextResponse.json({ error: '查無市場概況資料' }, { status: 404 })
  }

  const latestPoint = recentTradingPoints[0]
  const previousPoint = recentTradingPoints[1]
  const latestDate = latestPoint.date
  const avgPrice = latestPoint.avgPrice ?? 0
  const totalVolume = latestPoint.volume ?? 0
  const previousAvgPrice = previousPoint?.avgPrice ?? 0
  const previousTotalVolume = previousPoint?.volume ?? 0

  const priceChange = previousAvgPrice > 0
    ? ((avgPrice - previousAvgPrice) / previousAvgPrice) * 100
    : 0
  const volumeChange = previousTotalVolume > 0
    ? ((totalVolume - previousTotalVolume) / previousTotalVolume) * 100
    : 0

  return NextResponse.json({
    date: latestDate,
    avgPrice: Math.round(avgPrice * 10) / 10,
    totalVolume: Math.round(totalVolume),
    priceChange: Math.round(priceChange * 10) / 10,
    volumeChange: Math.round(volumeChange * 10) / 10,
    marketName: market,
    updatedAt: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
