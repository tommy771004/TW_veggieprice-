import { NextRequest, NextResponse } from 'next/server'
import {
  fetchLatestSeafoodData,
  fetchMarketOverviewTrend,
  fetchLivestockPrices,
  type SeafoodRawRecord,
} from '@/lib/server/moa'
import { todayISO } from '@/lib/server/dateUtils'
import { DEFAULT_MARKET } from '@/lib/constants'
import { marketsMatch } from '@/lib/markets'

export const maxDuration = 60;
export const revalidate = 3600;

const SEAFOOD_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

function overviewErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const date = searchParams.get('date') || todayISO()
  const category = searchParams.get('category') || 'vegetable'

  if (category === 'meat') {
    const livestock = await fetchLivestockPrices();
    return NextResponse.json({
      date: livestock.date,
      marketName: '全國平均',
      avgPrice: livestock.porkAvgPrice || 0,
      totalVolume: 0,
      priceChange: livestock.porkPriceChange || 0,
      volumeChange: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  if (category === 'seafood') {
    try {
      const records = await fetchLatestSeafoodData();
      const marketRecords = records.filter((r: SeafoodRawRecord) => {
        const name = String(r['市場名稱'] ?? '')
        return (
          market === '全部市場' ||
          name === market ||
          marketsMatch(name, market)
        )
      });
      if (marketRecords.length > 0) {
        const avgPrice =
          marketRecords.reduce(
            (sum: number, r: SeafoodRawRecord) =>
              sum + (Number(r['平均價']) || 0),
            0,
          ) / marketRecords.length;
        const totalVolume = marketRecords.reduce(
          (sum: number, r: SeafoodRawRecord) =>
            sum + (Number(r['交易量']) || 0),
          0,
        );
        return NextResponse.json(
          {
            date,
            marketName: market,
            avgPrice: Math.round(avgPrice * 10) / 10,
            totalVolume: Math.round(totalVolume * 10) / 10,
            priceChange: 0,
            volumeChange: 0,
            updatedAt: new Date().toISOString(),
          },
          { headers: SEAFOOD_CACHE_HEADERS },
        );
      }
      return overviewErrorResponse('查無市場概況資料', 404);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '讀取漁產市場概況失敗';
      return overviewErrorResponse(message, 502);
    }
  }

  let recentTradingPoints: {
    date: string
    label?: string
    avgPrice: number | null
    volume: number | null
  }[] = []
  let errorMsg = ''

  try {
    const trendRes = await fetchMarketOverviewTrend(market, 7, date)
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
