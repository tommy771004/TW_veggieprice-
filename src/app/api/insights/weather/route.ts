import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketWeatherObservations } from '@/lib/server/moa'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const county = searchParams.get('county') || ''
  const requestedLimit = Number(searchParams.get('limit') || '20')
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), 100))
    : 20

  const result = await fetchMarketWeatherObservations(county, limit)

  if (result.error) {
    return NextResponse.json({ error: result.error, items: [] }, { status: 502 })
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
}
