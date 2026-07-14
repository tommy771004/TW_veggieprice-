import { NextRequest, NextResponse } from 'next/server'
import { fetchCurrentWeatherObservations } from '@/lib/server/cwa'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const county = searchParams.get('county') || ''
  const requestedLimit = Number(searchParams.get('limit') || '20')
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), 100))
    : 20

  const items = await fetchCurrentWeatherObservations(county, limit)

  return NextResponse.json({ items }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
}
