import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { fetchMarketData, fetchMarketDataByDates } from '@/lib/server/moa'

export const revalidate = 3600
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const cropName = searchParams.get('crop') || ''
  // Empty / 全部市場 / 全國平均 → national scheme C (mean of markets' U/A/L).
  // Specific market name → scheme B (that market's own U/A/L after filter).
  const market = searchParams.get('market') || ''
  const period = searchParams.get('period') || '1M'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (req.headers.has('date') || req.headers.has('Date')) {
    if (cropName) {
      revalidateTag(`history-${cropName}`)
    }
  }

  let result
  if (startDate && endDate) {
    result = await fetchMarketDataByDates(cropName, market, startDate, endDate)
  } else {
    result = await fetchMarketData(cropName, market, period)
  }

  if (result.error) {
    const status = result.error.includes('查無') ? 404 : 502
    return NextResponse.json({
      error: result.error,
      data: [],
      closedDays: [],
    }, { status })
  }

  return NextResponse.json({
    ...result,
    updatedAt: new Date().toISOString()
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  })
}
