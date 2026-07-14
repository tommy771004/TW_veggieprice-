import { NextRequest, NextResponse } from 'next/server'
import {
  fetchMarketOverviewTrend,
  fetchLivestockPrices,
  fetchSeafoodMarketOverview,
} from '@/lib/server/moa'
import { todayISO } from '@/lib/server/dateUtils'
import { DEFAULT_MARKET } from '@/lib/constants'

export const maxDuration = 60;
export const revalidate = 3600;

const SEAFOOD_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

function overviewErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function categoryToMarketType(category: string): string | undefined {
  if (category === 'fruit') return 'Fruit'
  if (category === 'vegetable') return 'Veg'
  return undefined
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const date = searchParams.get('date') || todayISO()
  const category = searchParams.get('category') || 'vegetable'

  if (category === 'meat') {
    const livestock = await fetchLivestockPrices();
    if (!livestock.porkAvgPrice) {
      return overviewErrorResponse('查無市場概況資料', 404)
    }
    return NextResponse.json({
      date: livestock.date,
      marketName: '全國平均',
      avgPrice: livestock.porkAvgPrice,
      // Head count for the latest pork trading day (not kg — UI labels 量能 generically).
      totalVolume: livestock.porkTotalHeads ?? 0,
      priceChange: livestock.porkPriceChange || 0,
      volumeChange: livestock.porkVolumeChange || 0,
      updatedAt: new Date().toISOString(),
    });
  }

  if (category === 'seafood') {
    try {
      const seafood = await fetchSeafoodMarketOverview(market)
      if (seafood.error) {
        return overviewErrorResponse(seafood.error, 404)
      }
      return NextResponse.json(
        {
          date: seafood.date,
          marketName: seafood.marketName,
          avgPrice: seafood.avgPrice,
          totalVolume: seafood.totalVolume,
          priceChange: seafood.priceChange,
          volumeChange: seafood.volumeChange,
          updatedAt: new Date().toISOString(),
        },
        { headers: SEAFOOD_CACHE_HEADERS },
      )
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '讀取漁產市場概況失敗'
      return overviewErrorResponse(message, 502)
    }
  }

  const marketType = categoryToMarketType(category)

  let recentTradingPoints: {
    date: string
    label?: string
    avgPrice: number | null
    volume: number | null
  }[] = []
  let errorMsg = ''

  try {
    const trendRes = await fetchMarketOverviewTrend(market, 7, date, marketType)
    if (!trendRes.error) {
      recentTradingPoints = trendRes.points
        .slice()
        .reverse()
        .filter((point) => point.avgPrice !== null)
    } else {
      errorMsg = trendRes.error
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err)
  }

  if (recentTradingPoints.length === 0) {
    const message = errorMsg || '查無市場概況資料'
    const status =
      errorMsg && !errorMsg.includes('查無') ? 502 : 404
    return overviewErrorResponse(message, status)
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
