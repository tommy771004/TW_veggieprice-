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

  // Single pass: find the two most recent trading dates, split into today/yesterday buckets.
  let latestDate = ''
  let prevDate = ''
  for (const r of allRecords) {
    if (!r.date) continue
    if (r.date > latestDate) { prevDate = latestDate; latestDate = r.date }
    else if (r.date !== latestDate && r.date > prevDate) prevDate = r.date
  }

  const todayMap = new Map<string, number>()
  const yestMap: Record<string, number> = {}
  for (const r of allRecords) {
    if (r.date === latestDate) {
      if (!todayMap.has(r.marketName)) todayMap.set(r.marketName, r.avgPrice)
    } else if (r.date === prevDate && r.avgPrice > 0) {
      yestMap[r.marketName] = r.avgPrice
    }
  }

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
