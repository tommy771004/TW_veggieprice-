import { NextRequest, NextResponse } from 'next/server'
import {
  fetchMarketOverviewTrend,
  fetchLivestockPorkTrend,
  fetchSeafoodMarketTrend,
} from '@/lib/server/moa'
import { DEFAULT_MARKET } from '@/lib/constants'
import { todayISO } from '@/lib/server/dateUtils'

export const maxDuration = 60;
export const revalidate = 3600;

function categoryToMarketType(category: string): string | undefined {
  if (category === 'fruit') return 'Fruit'
  if (category === 'vegetable') return 'Veg'
  return undefined
}

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
      // Real multi-day pork series (head-weighted). Do not invent synthetic prices.
      const trendRes = await fetchLivestockPorkTrend(days)
      if (trendRes.error || trendRes.points.length === 0) {
        return NextResponse.json(
          { error: trendRes.error || '查無市場趨勢資料' },
          { status: 404 },
        )
      }
      return NextResponse.json(trendRes.points, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '讀取肉品市場趨勢失敗'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  if (category === 'seafood') {
    try {
      const trendRes = await fetchSeafoodMarketTrend(market, days)
      if (trendRes.error || trendRes.points.length === 0) {
        return NextResponse.json(
          { error: trendRes.error || '查無市場趨勢資料' },
          { status: 404 },
        )
      }
      return NextResponse.json(trendRes.points, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '讀取漁產市場趨勢失敗'
      return NextResponse.json({ error: message }, { status: 502 })
    }
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
    const marketType = categoryToMarketType(category)
    const trendRes = await fetchMarketOverviewTrend(market, days, todayISO(), marketType)
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
