import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { fetchMarketData, fetchMarketDataByDates } from '@/lib/server/moa'

export const revalidate = 3600
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const cropName = searchParams.get('crop') || ''
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
    result = await fetchMarketDataByDates(cropName, '', startDate, endDate)
  } else {
    result = await fetchMarketData(cropName, '', period)
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
