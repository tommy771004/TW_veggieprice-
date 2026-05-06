import { NextRequest, NextResponse } from 'next/server'
import { fetchPriceRecords } from '@/lib/server/moa'
import { subtractDays } from '@/lib/server/dateUtils'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const cropName = searchParams.get('crop') || ''
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  // Look back 7 days so priceChange is real even when date-1 was a holiday
  const weekAgo = subtractDays(date, 7)

  const { records: allRecords, error } = await fetchPriceRecords({ cropName, startDate: weekAgo, endDate: date })

  if (error) {
    return NextResponse.json({ error }, { status: 502 })
  }

  if (allRecords.length === 0) {
    return NextResponse.json({ error: '查無跨市場比價資料' }, { status: 404 })
  }

  // Pick the two most recent actual trading dates from the result set
  const tradingDates = [...new Set(allRecords.map(r => r.date))].sort()
  const latestDate = tradingDates[tradingDates.length - 1]
  const prevDate = tradingDates.length >= 2 ? tradingDates[tradingDates.length - 2] : null

  const todayRecords = allRecords.filter(r => r.date === latestDate)
  const yestMap: Record<string, number> = {}
  if (prevDate) {
    allRecords
      .filter(r => r.date === prevDate)
      .forEach((record) => {
        if (record.avgPrice > 0) yestMap[record.marketName] = record.avgPrice
      })
  }

  // Group records by marketName to prevent duplicates when multiple varieties exist
  const todayMap = new Map<string, number>()
  todayRecords.forEach(r => {
    if (!todayMap.has(r.marketName)) todayMap.set(r.marketName, r.avgPrice)
  })

  const comparison = Array.from(todayMap.entries()).map(([marketName, todayPrice]) => {
    const yest = yestMap[marketName]
    const change = yest && yest > 0 ? ((todayPrice - yest) / yest) * 100 : 0
    return {
      marketName,
      avgPrice: todayPrice,
      priceChange: Math.round(change * 10) / 10,
    }
  })

  return NextResponse.json(comparison, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  })
}
