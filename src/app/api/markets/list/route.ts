import { NextRequest, NextResponse } from 'next/server'
import { fetchMarkets } from '@/lib/server/moa'

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'Veg'
  const markets = await fetchMarkets(type)
  return NextResponse.json(markets, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
