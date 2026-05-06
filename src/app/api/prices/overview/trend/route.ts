import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketOverviewTrend } from '@/lib/server/moa'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || '台北一'
  const requestedDays = Number(searchParams.get('days') || '7')
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.floor(requestedDays), 1), 30)
    : 7

  const { points, error } = await fetchMarketOverviewTrend(market, days)

  if (error) {
    return NextResponse.json({ error }, { status: 502 })
  }

  return NextResponse.json(points, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  })
}
