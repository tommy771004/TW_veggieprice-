import { NextRequest, NextResponse } from 'next/server'
import { fetchSearchRecords } from '@/lib/server/moa'
import { subtractDays, todayISO } from '@/lib/server/dateUtils'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const cropName = searchParams.get('crop') || ''
  const date = searchParams.get('date') || todayISO()
  const marketType = searchParams.get('type') || ''
  
  // Look back 7 days so priceChange is real even when date-1 was a holiday
  const weekAgo = subtractDays(date, 7)

  const { records: allRecords, error } = await fetchSearchRecords({ 
    cropName, 
    startDate: weekAgo, 
    endDate: date, 
    marketType 
  })

  if (error) {
    return NextResponse.json({ error }, { status: 502 })
  }

  if (allRecords.length === 0) {
    return NextResponse.json({ error: '查無跨市場比價資料' }, { status: 404 })
  }

  // Group real-priced records per market (skip 休市 / 0-price placeholder rows —
  // otherwise a market-closed latest day makes every market read as $0.0).
  const byMarket = new Map<string, { date: string; avgPrice: number }[]>()
  for (const r of allRecords) {
    if (!r.marketName || !r.date || !(r.avgPrice > 0)) continue
    const list = byMarket.get(r.marketName)
    if (list) list.push({ date: r.date, avgPrice: r.avgPrice })
    else byMarket.set(r.marketName, [{ date: r.date, avgPrice: r.avgPrice }])
  }

  // For each market use its most recent traded price; compare against the next
  // older traded day so priceChange skips holidays.
  const comparison = Array.from(byMarket.entries()).map(([marketName, recs]) => {
    recs.sort((a, b) => b.date.localeCompare(a.date))
    const todayPrice = recs[0].avgPrice
    const latestDate = recs[0].date
    const prev = recs.find((x) => x.date !== latestDate)
    const change = prev ? ((todayPrice - prev.avgPrice) / prev.avgPrice) * 100 : 0
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
