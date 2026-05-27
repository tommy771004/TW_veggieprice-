import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketOverviewTrend, fetchLivestockPrices } from '@/lib/server/moa'
import { DEFAULT_MARKET } from '@/lib/constants'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const market = searchParams.get('market') || DEFAULT_MARKET
  const category = searchParams.get('category') || 'vegetable'
  const requestedDays = Number(searchParams.get('days') || '7')
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.floor(requestedDays), 1), 30)
    : 7

  if (category === 'meat') {
    const livestock = await fetchLivestockPrices();
    const today = todayISO();
    const pts = Array.from({ length: days }).map((_, i) => {
      const d = subtractDays(today, days - 1 - i);
      const factor = 1 - (days - 1 - i) * 0.005; // slightly decreasing back in time
      return {
        date: d,
        avgPrice: Math.round((livestock.porkAvgPrice || 90) * factor * 10) / 10,
        transWeight: (livestock.porkAvgPrice) ? 1000 : 0
      }
    });
    return NextResponse.json(pts, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
  }

  if (category === 'seafood') {
    const today = todayISO();
    const pts = Array.from({ length: days }).map((_, i) => {
      const d = subtractDays(today, days - 1 - i);
      return {
        date: d,
        avgPrice: Math.round((150 + Math.random() * 5) * 10) / 10,
        transWeight: 5000
      }
    });
    return NextResponse.json(pts, { headers: { 'Cache-Control': 'public, s-maxage=3600' } });
  }

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
