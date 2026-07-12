import { NextRequest, NextResponse } from 'next/server'
import { fetchWeeklyForecast } from '@/lib/server/cwa'
import { resolveCountyFromMarketName } from '@/lib/server/moa'
import { DEFAULT_MARKET } from '@/lib/constants'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const market = searchParams.get('market') || DEFAULT_MARKET
  const county = searchParams.get('county') || resolveCountyFromMarketName(market)

  const days = await fetchWeeklyForecast(county)

  return NextResponse.json(
    { county, days },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  )
}
