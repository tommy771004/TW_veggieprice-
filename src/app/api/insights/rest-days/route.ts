import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketRestDays } from '@/lib/server/moa'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const market = searchParams.get('market') || '全部市場'
  const endDate = searchParams.get('endDate') || todayISO()
  const startDate = searchParams.get('startDate') || subtractDays(endDate, 30)

  const result = await fetchMarketRestDays(market, startDate, endDate)

  if (result.error) {
    return NextResponse.json({ error: result.error, items: [] }, { status: 502 })
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
    },
  })
}
