import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_MARKET } from '@/lib/constants'
import { getMarketTrend } from '@/lib/server/marketOverview'

export const maxDuration = 60;
export const revalidate = 3600;

function cacheHeadersForCategory(category: string): Record<string, string> {
  if (category === 'seafood' || category === 'meat') {
    return {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    }
  }
  return {
    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const category = searchParams.get('category') || 'vegetable'
  const requestedDays = Number(searchParams.get('days') || '7')
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.floor(requestedDays), 1), 30)
    : 7

  const result = await getMarketTrend({ market, category, days })

  if (result.error || result.points.length === 0) {
    const message = result.error || '查無市場趨勢資料'
    const status =
      result.error &&
      !result.error.includes('查無') &&
      result.error !== 'Empty points list'
        ? 502
        : 404
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json(result.points, {
    headers: cacheHeadersForCategory(category),
  })
}
