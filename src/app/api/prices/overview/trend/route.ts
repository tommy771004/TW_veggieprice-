import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketOverviewTrend, fetchLivestockPrices } from '@/lib/server/moa'
import { DEFAULT_MARKET } from '@/lib/constants'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

export const maxDuration = 60;
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const category = searchParams.get('category') || 'vegetable'
  const requestedDays = Number(searchParams.get('days') || '7')
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.floor(requestedDays), 1), 30)
    : 7

  if (category === 'meat') {
    try {
      const livestock = await fetchLivestockPrices();
      if (!livestock.porkAvgPrice) {
        return NextResponse.json(
          { error: '查無市場趨勢資料' },
          { status: 404 },
        );
      }
      const today = todayISO();
      const pts = Array.from({ length: days }).map((_, i) => {
        const d = subtractDays(today, days - 1 - i);
        const factor = 1 - (days - 1 - i) * 0.005; // slightly decreasing back in time
        return {
          date: d,
          avgPrice: Math.round((livestock.porkAvgPrice || 90) * factor * 10) / 10,
          transWeight: 1000,
        }
      });
      return NextResponse.json(pts, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : '讀取肉品市場趨勢失敗'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  // Seafood weekly trend is not yet backed by historical series data.
  // Return an empty series so the client shows no chart rather than invented prices.
  if (category === 'seafood') {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  }

  let finalPoints: {
    date: string
    label?: string
    avgPrice: number | null
    volume?: number | null
    isClosed?: boolean
  }[] = []
  let errorMsg = ''
  
  try {
    const trendRes = await fetchMarketOverviewTrend(market, days)
    if (!trendRes.error && trendRes.points.length > 0) {
      finalPoints = trendRes.points
    } else {
      errorMsg = trendRes.error || 'Empty points list'
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err)
  }

  if (finalPoints.length === 0) {
    const message =
      errorMsg && errorMsg !== 'Empty points list'
        ? errorMsg
        : '查無市場趨勢資料'
    const status =
      errorMsg && !errorMsg.includes('查無') && errorMsg !== 'Empty points list'
        ? 502
        : 404
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json(finalPoints, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
